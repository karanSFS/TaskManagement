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

const issueCap = 1000

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

  const rangedIssues = await loadRangedIssues(target, from, to)
  const statusCounts = new Map<string, { count: number; order: number }>()
  const priorityCounts = new Map<string, { count: number; order: number }>()
  const typeCounts = new Map<string, { count: number; order: number }>()
  const projectCounts = new Map<string, ReportBar>()
  const sprintCounts = new Map<string, ReportBar & { status: string }>()

  for (const issue of rangedIssues) {
    const status = one(issue.issue_statuses)
    const priority = one(issue.priorities)
    const type = one(issue.issue_types)
    const project = one(issue.project)
    const sprint = one(issue.sprint)
    addCount(statusCounts, status?.name ?? "Unknown", status?.position ?? 0)
    addCount(priorityCounts, priority?.name ?? "Unknown", priority?.rank ?? 0)
    addCount(typeCounts, type?.name ?? "Unknown", type?.position ?? 0)

    if (project && !project.archived_at) {
      const bar = projectCounts.get(project.name) ?? { name: project.name, open: 0, done: 0 }
      if (status?.category === "done") bar.done += 1
      else bar.open += 1
      projectCounts.set(project.name, bar)
    }

    if (sprint && project) {
      const name = `${project.key} ${sprint.name}`
      const bar = sprintCounts.get(name) ?? { name, status: sprint.status, open: 0, done: 0 }
      if (status?.category === "done") bar.done += 1
      else bar.open += 1
      sprintCounts.set(name, bar)
    }
  }

  const catalog = await loadGroupCatalog()
  const statuses = mergeCounts(catalog.statuses, statusCounts)
  const summary = summarize(statuses, doneNames, visible.length, activeSprints)

  return {
    projects: [...projectCounts.values()].sort((a, b) => a.name.localeCompare(b.name)),
    sprints: [...sprintCounts.values()].sort((a, b) => a.name.localeCompare(b.name)),
    statuses,
    priorities: mergeCounts(catalog.priorities, priorityCounts),
    types: mergeCounts(catalog.types, typeCounts),
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

async function loadRangedIssues(projectId: string | undefined, from: string | undefined, to: string | undefined) {
  const supabase = await createClient()
  let query = supabase
    .from("issues")
    .select(
      "project:projects!issues_project_id_fkey(name, key, archived_at), issue_statuses!issues_status_id_fkey(name, category, position), priorities!issues_priority_id_fkey(name, rank), issue_types!issues_issue_type_id_fkey(name, position), sprint:sprints!issues_sprint_id_fkey(name, status)",
      { count: "exact" },
    )
    .limit(issueCap)

  if (projectId) query = query.eq("project_id", projectId)
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`)
  if (to) query = query.lt("created_at", exclusiveEnd(to))

  const { data, error, count } = await query
  if (error || data === null || count === null) throw new DatabaseError("Could not load reports.")
  if (count > data.length) {
    throw new DatabaseError("Narrow the dates. This report includes more than 1000 issues.")
  }
  return data
}

async function loadGroupCatalog() {
  const supabase = await createClient()
  const [statuses, priorities, types] = await Promise.all([
    supabase.from("issue_statuses").select("name, position").order("position"),
    supabase.from("priorities").select("name, rank").order("rank"),
    supabase.from("issue_types").select("name, position").order("position"),
  ])
  if (
    statuses.error ||
    statuses.data === null ||
    priorities.error ||
    priorities.data === null ||
    types.error ||
    types.data === null
  ) {
    throw new DatabaseError("Could not load reports.")
  }
  return {
    statuses: statuses.data.map((row) => ({ name: row.name, order: row.position })),
    priorities: priorities.data.map((row) => ({ name: row.name, order: row.rank })),
    types: types.data.map((row) => ({ name: row.name, order: row.position })),
  }
}

function addCount(map: Map<string, { count: number; order: number }>, name: string, order: number) {
  const current = map.get(name) ?? { count: 0, order }
  current.count += 1
  map.set(name, current)
}

function mergeCounts(catalog: { name: string; order: number }[], counts: Map<string, { count: number; order: number }>) {
  const names = new Set(catalog.map((row) => row.name))
  const rows = catalog.map((row) => ({ name: row.name, count: counts.get(row.name)?.count ?? 0, order: row.order }))
  for (const [name, value] of counts) {
    if (!names.has(name)) rows.push({ name, count: value.count, order: value.order })
  }
  return ordered(rows)
}

function ordered(rows: (ReportCount & { order: number })[]) {
  return rows.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)).map(({ name, count }) => ({ name, count }))
}

function exclusiveEnd(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString()
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function uuidOrNull(value: string | undefined) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return undefined
  return value
}
