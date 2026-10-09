import { DatabaseError } from "@/lib/errors/database-error"
import { getProjects } from "@/lib/services/project.service"
import { createClient } from "@/lib/supabase/server"

export type ReportBar = { name: string; open: number; done: number }
export type ReportCount = { name: string; count: number }

export type ReportData = {
  projects: ReportBar[]
  sprints: (ReportBar & { status: string })[]
  statuses: ReportCount[]
  priorities: ReportCount[]
  types: ReportCount[]
}

export async function getReports(userId: string, projectId?: string): Promise<ReportData> {
  const supabase = await createClient()
  const target = uuidOrNull(projectId)
  const [projects, sprints, groups] = await Promise.all([
    getProjects(userId),
    supabase.rpc("report_sprints", { target_project_id: target }),
    supabase.rpc("report_issue_groups", { target_project_id: target }),
  ])

  if (sprints.error || groups.error) throw new DatabaseError("Could not load reports.")

  const visible = projects.filter((project) => !project.archivedAt && (!target || project.id === target))
  const grouped = {
    status: [] as (ReportCount & { order: number })[],
    priority: [] as (ReportCount & { order: number })[],
    type: [] as (ReportCount & { order: number })[],
  }

  for (const row of groups.data ?? []) {
    const bucket = row.group_kind === "priority" ? grouped.priority : row.group_kind === "type" ? grouped.type : grouped.status
    bucket.push({ name: row.group_name, count: row.issue_count, order: row.group_order })
  }

  const ordered = (rows: (ReportCount & { order: number })[]) =>
    rows.sort((a, b) => a.order - b.order).map(({ name, count }) => ({ name, count }))

  return {
    projects: visible.map((project) => ({
      name: project.name,
      open: project.openIssueCount,
      done: project.doneIssueCount,
    })),
    sprints: (sprints.data ?? []).map((sprint) => ({
      name: `${sprint.project_key} ${sprint.sprint_name}`,
      status: sprint.sprint_status,
      open: sprint.open_count,
      done: sprint.done_count,
    })),
    statuses: ordered(grouped.status),
    priorities: ordered(grouped.priority),
    types: ordered(grouped.type),
  }
}

function uuidOrNull(value: string | undefined) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return undefined
  return value
}
