import { DatabaseError } from "@/lib/errors/database-error"
import { getProjects } from "@/lib/services/project.service"
import { createClient } from "@/lib/supabase/server"

export type ReportBar = { name: string; open: number; done: number }
export type ReportCount = { name: string; count: number }

export type ReportSummary = {
  issues: number
  open: number
  done: number
  activeProjects: number
  activeSprints: number
  completion: number | null
}

export type ReportData = {
  projects: ReportBar[]
  sprints: (ReportBar & { status: string })[]
  statuses: ReportCount[]
  priorities: ReportCount[]
  types: ReportCount[]
  summary: ReportSummary
  ranged: boolean
}

export async function getReports(
  userId: string,
  projectId?: string,
  range?: { from?: string; to?: string },
): Promise<ReportData> {
  const supabase = await createClient()
  const target = uuidOrNull(projectId)
  const from = range?.from
  const to = range?.to
  const ranged = Boolean(from || to)
  const [projects, statusCatalog, activeSprints] = await Promise.all([
    getProjects(userId),
    supabase.from("issue_statuses").select("name, category").order("position"),
    countActiveSprints(target),
  ])

  if (statusCatalog.error || statusCatalog.data === null) {
    throw new DatabaseError("Could not load reports.")
  }

  const doneNames = new Set(statusCatalog.data.filter((row) => row.category === "done").map((row) => row.name))
  const visible = projects.filter((project) => !project.archivedAt && (!target || project.id === target))

  if (!ranged) {
    const [sprints, groups] = await Promise.all([
      supabase.rpc("report_sprints", { target_project_id: target }),
      supabase.rpc("report_issue_groups", { target_project_id: target }),
    ])
    if (sprints.error || sprints.data === null || groups.error || groups.data === null) {
      throw new DatabaseError("Could not load reports.")
    }

    const grouped = {
      status: [] as (ReportCount & { order: number })[],
      priority: [] as (ReportCount & { order: number })[],
      type: [] as (ReportCount & { order: number })[],
    }
    for (const row of groups.data) {
      const bucket = row.group_kind === "priority" ? grouped.priority : row.group_kind === "type" ? grouped.type : grouped.status
      bucket.push({ name: row.group_name, count: row.issue_count, order: row.group_order })
    }
    const statuses = ordered(grouped.status)
    const summary = summarize(statuses, doneNames, visible.length, activeSprints)

    return {
      projects: visible.map((project) => ({
        name: project.name,
        open: project.openIssueCount,
        done: project.doneIssueCount,
      })),
      sprints: sprints.data.map((sprint) => ({
        name: `${sprint.project_key} ${sprint.sprint_name}`,
        status: sprint.sprint_status,
        open: sprint.open_count,
        done: sprint.done_count,
      })),
      statuses,
      priorities: ordered(grouped.priority),
      types: ordered(grouped.type),
      summary,
      ranged: false,
    }
  }

  const rangeFrom = from ? `${from}T00:00:00.000Z` : undefined
  const rangeTo = to ? exclusiveEnd(to) : undefined
  const [groups, projectsInRange, sprints] = await Promise.all([
    supabase.rpc("report_issue_groups_between", { target_project_id: target, range_from: rangeFrom, range_to: rangeTo }),
    supabase.rpc("report_projects_between", { target_project_id: target, range_from: rangeFrom, range_to: rangeTo }),
    supabase.rpc("report_sprints_between", { target_project_id: target, range_from: rangeFrom, range_to: rangeTo }),
  ])
  if (groups.error || groups.data === null || projectsInRange.error || projectsInRange.data === null || sprints.error || sprints.data === null) {
    throw new DatabaseError("Could not load reports.")
  }

  const grouped = {
    status: [] as (ReportCount & { order: number })[],
    priority: [] as (ReportCount & { order: number })[],
    type: [] as (ReportCount & { order: number })[],
  }
  for (const row of groups.data) {
    const bucket = row.group_kind === "priority" ? grouped.priority : row.group_kind === "type" ? grouped.type : grouped.status
    bucket.push({ name: row.group_name, count: row.issue_count, order: row.group_order })
  }
  const statuses = ordered(grouped.status)
  const summary = summarize(statuses, doneNames, visible.length, activeSprints)

  return {
    projects: projectsInRange.data.map((project) => ({
      name: project.project_name,
      open: project.open_count,
      done: project.done_count,
    })),
    sprints: sprints.data.map((sprint) => ({
      name: `${sprint.project_key} ${sprint.sprint_name}`,
      status: sprint.sprint_status,
      open: sprint.open_count,
      done: sprint.done_count,
    })),
    statuses,
    priorities: ordered(grouped.priority),
    types: ordered(grouped.type),
    summary,
    ranged: true,
  }
}

function summarize(statuses: ReportCount[], doneNames: Set<string>, activeProjects: number, activeSprints: number): ReportSummary {
  const issues = statuses.reduce((sum, row) => sum + row.count, 0)
  const done = statuses.filter((row) => doneNames.has(row.name)).reduce((sum, row) => sum + row.count, 0)
  return {
    issues,
    open: issues - done,
    done,
    activeProjects,
    activeSprints,
    completion: issues === 0 ? null : Math.round((done / issues) * 100),
  }
}

async function countActiveSprints(projectId?: string) {
  const supabase = await createClient()
  let query = supabase.from("sprints").select("id", { count: "exact", head: true }).eq("status", "active")
  if (projectId) query = query.eq("project_id", projectId)
  const { count, error } = await query
  if (error || count === null) throw new DatabaseError("Could not load reports.")
  return count
}

function ordered(rows: (ReportCount & { order: number })[]) {
  return rows.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)).map(({ name, count }) => ({ name, count }))
}

function exclusiveEnd(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString()
}

function uuidOrNull(value: string | undefined) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return undefined
  return value
}
