import { AppError } from "@/lib/errors/app-error"
import { AuthorizationError } from "@/lib/errors/authorization-error"
import { DatabaseError } from "@/lib/errors/database-error"
import { NotFoundError } from "@/lib/errors/not-found-error"
import { createClient } from "@/lib/supabase/server"
import type { CreateSprintValues } from "@/lib/validations/sprint"

const issueLimit = 200

export type SprintIssue = {
  id: string
  number: number
  title: string
  status: string
  done: boolean
}

export type SprintSummary = {
  id: string
  name: string
  goal: string
  status: "future" | "active" | "completed"
  startDate: string
  endDate: string
  issues: SprintIssue[]
}

export type SprintWorkspace = {
  projectId: string
  projectName: string
  projectKey: string
  archived: boolean
  backlog: SprintIssue[]
  sprints: SprintSummary[]
  truncated: boolean
}

type StatusEmbed = { name: string; category: string } | { name: string; category: string }[] | null

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function raiseSprintError(message: string): never {
  if (message.includes("only one active sprint") || message.includes("sprints_one_active")) {
    throw new AppError("ACTIVE_SPRINT_EXISTS", "This project already has an active sprint. Complete it first.", 409)
  }
  if (message.includes("Only a planned sprint")) {
    throw new AppError("INVALID_SPRINT", "Only a planned sprint can be started.", 422)
  }
  if (message.includes("Only the active sprint")) {
    throw new AppError("INVALID_SPRINT", "Only the active sprint can be completed.", 422)
  }
  if (message.includes("Sprint could not be found")) {
    throw new NotFoundError("SPRINT_NOT_FOUND", "Sprint could not be found.")
  }
  if (message.includes("end_date") || message.includes("sprints_check")) {
    throw new AppError("INVALID_SPRINT", "The end date must be on or after the start date.", 422)
  }
  if (message.includes("Sprint must belong")) {
    throw new AppError("INVALID_SPRINT", "That sprint belongs to another project.", 422)
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "You don't have permission to change this sprint.")
  }
  throw new DatabaseError("Could not save the sprint. Try again.")
}

function asStatus(value: string): SprintSummary["status"] {
  if (value === "active" || value === "completed" || value === "future") return value
  return "future"
}

export async function getSprintWorkspace(userId: string, projectId: string): Promise<SprintWorkspace | null> {
  void userId
  const supabase = await createClient()
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, key, archived_at")
    .eq("id", projectId)
    .maybeSingle()

  if (projectError) throw new DatabaseError("Could not load sprints.")
  if (!project) return null

  const [sprints, scheduled, backlog] = await Promise.all([
    supabase
      .from("sprints")
      .select("id, name, goal, status, start_date, end_date, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("issues")
      .select("id, issue_number, title, sprint_id, issue_statuses!issues_status_id_fkey(name, category)")
      .eq("project_id", projectId)
      .not("sprint_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(issueLimit),
    supabase
      .from("issues")
      .select("id, issue_number, title, issue_statuses!issues_status_id_fkey!inner(name, category)")
      .eq("project_id", projectId)
      .is("sprint_id", null)
      .neq("issue_statuses.category", "done")
      .order("updated_at", { ascending: false })
      .limit(issueLimit),
  ])

  if (sprints.error || scheduled.error || backlog.error) {
    throw new DatabaseError("Could not load sprints.")
  }

  const scheduledIssues = (scheduled.data ?? []).map(toSprintIssue)
  const rank = { active: 0, future: 1, completed: 2 }

  return {
    projectId: project.id,
    projectName: project.name,
    projectKey: project.key,
    archived: Boolean(project.archived_at),
    truncated: (scheduled.data ?? []).length >= issueLimit || (backlog.data ?? []).length >= issueLimit,
    backlog: (backlog.data ?? []).map((issue) => toSprintIssue({ ...issue, sprint_id: null })),
    sprints: (sprints.data ?? [])
      .map((sprint) => ({
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        status: asStatus(sprint.status),
        startDate: sprint.start_date ?? "",
        endDate: sprint.end_date ?? "",
        issues: scheduledIssues.filter((issue) => issue.sprintId === sprint.id),
      }))
      .sort((a, b) => rank[a.status] - rank[b.status]),
  }
}

function toSprintIssue(issue: {
  id: string
  issue_number: number
  title: string
  sprint_id?: string | null
  issue_statuses: StatusEmbed
}) {
  const status = one(issue.issue_statuses)
  return {
    id: issue.id,
    number: issue.issue_number,
    title: issue.title,
    status: status?.name ?? "Unknown",
    done: status?.category === "done",
    sprintId: issue.sprint_id ?? null,
  }
}

export async function createSprintRecord(userId: string, input: CreateSprintValues) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sprints")
    .insert({
      project_id: input.projectId,
      name: input.name,
      goal: input.goal,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      created_by: userId,
      status: "future",
    })
    .select("id, project_id")
    .maybeSingle()

  if (error) raiseSprintError(error.message)
  if (!data) throw new AuthorizationError("PROJECT_ACCESS_DENIED", "You don't have access to that project.")
  return data
}

export async function startSprintRecord(userId: string, sprintId: string) {
  void userId
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("start_sprint", { target_sprint_id: sprintId })
  if (error) raiseSprintError(error.message)
  return data
}

export async function completeSprintRecord(userId: string, sprintId: string) {
  void userId
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("complete_sprint", { target_sprint_id: sprintId })
  if (error) raiseSprintError(error.message)
  return data
}

export async function moveIssueToSprint(userId: string, issueId: string, sprintId: string | null) {
  void userId
  const supabase = await createClient()
  const { data: issue, error: readError } = await supabase
    .from("issues")
    .select("id, project_id")
    .eq("id", issueId)
    .maybeSingle()

  if (readError) throw new DatabaseError("Could not load this issue.")
  if (!issue) throw new NotFoundError("ISSUE_NOT_FOUND", "Issue could not be found.")

  if (sprintId) {
    const { data: sprint, error } = await supabase
      .from("sprints")
      .select("id, project_id, status")
      .eq("id", sprintId)
      .maybeSingle()
    if (error) throw new DatabaseError("Could not load the sprint.")
    if (!sprint || sprint.project_id !== issue.project_id) {
      throw new AppError("INVALID_SPRINT", "That sprint belongs to another project.", 422)
    }
    if (sprint.status === "completed") {
      throw new AppError("INVALID_SPRINT", "Completed sprints do not take new issues.", 422)
    }
  }

  const { data, error } = await supabase
    .from("issues")
    .update({ sprint_id: sprintId })
    .eq("id", issueId)
    .select("id, project_id")

  if (error) raiseSprintError(error.message)
  if (!data?.length || !data[0]) {
    throw new AuthorizationError("ISSUE_ACCESS_DENIED", "You don't have permission to move this issue.")
  }

  return data[0].project_id
}
