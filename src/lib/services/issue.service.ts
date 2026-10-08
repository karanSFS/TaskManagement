import { cache } from "react"

import { AppError } from "@/lib/errors/app-error"
import { AuthorizationError } from "@/lib/errors/authorization-error"
import { DatabaseError } from "@/lib/errors/database-error"
import { NotFoundError } from "@/lib/errors/not-found-error"
import { createClient } from "@/lib/supabase/server"
import type { CreateIssueValues, UpdateIssueValues } from "@/lib/validations/issue"

const pageSize = 20

export type IssueChoice = { id: string; name: string; slug: string }
export type StatusChoice = IssueChoice & { category: string }
export type PriorityChoice = IssueChoice & { rank: number }

export type IssueCatalog = {
  types: IssueChoice[]
  statuses: StatusChoice[]
  priorities: PriorityChoice[]
}

export type IssueListItem = {
  id: string
  number: number
  title: string
  projectKey: string
  projectName: string
  status: string
  priority: string
  assigneeName: string | null
  updatedAt: string
}

export type IssueList = {
  items: IssueListItem[]
  page: number
  pageSize: number
  total: number
}

export type IssueComment = {
  id: string
  body: string
  createdAt: string
  authorId: string
  authorName: string
}

export type IssueLabel = { id: string; name: string; color: string }

export type IssueHistoryEntry = {
  id: string
  field: string
  summary: string
  createdAt: string
}

export type IssueDetail = {
  id: string
  number: number
  title: string
  description: string
  projectId: string
  projectKey: string
  projectName: string
  typeId: string
  statusId: string
  priorityId: string
  assigneeId: string
  reporterName: string
  createdAt: string
  updatedAt: string
  labels: IssueLabel[]
  projectLabels: IssueLabel[]
  members: { id: string; name: string }[]
  comments: IssueComment[]
  history: IssueHistoryEntry[]
}

type NameEmbed = { display_name: string } | { display_name: string }[] | null
type Named = { id: string; name: string; slug?: string; category?: string; rank?: number }
type NamedEmbed = Named | Named[] | null

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function raiseIssueWriteError(message: string): never {
  if (message.includes("cannot move between projects") || message.includes("numbers cannot change")) {
    throw new AppError("INVALID_ISSUE", "That change is not allowed.", 422)
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    throw new AuthorizationError("ISSUE_ACCESS_DENIED", "You don't have permission to change this issue.")
  }
  throw new DatabaseError("Could not save the issue. Try again.")
}

async function assertAssignee(projectId: string, assigneeId: string | null) {
  if (!assigneeId) return
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", assigneeId)
    .maybeSingle()

  if (error) throw new DatabaseError("Could not check the assignee.")
  if (!data) throw new AppError("INVALID_ASSIGNEE", "The assignee must be a member of this project.", 422)
}

export const getIssueCatalog = cache(async (): Promise<IssueCatalog> => {
  const supabase = await createClient()
  const [types, statuses, priorities] = await Promise.all([
    supabase.from("issue_types").select("id, name, slug").order("position"),
    supabase.from("issue_statuses").select("id, name, slug, category").order("position"),
    supabase.from("priorities").select("id, name, slug, rank").order("rank"),
  ])

  if (types.error || statuses.error || priorities.error) {
    throw new DatabaseError("Could not load issue fields.")
  }

  return {
    types: types.data ?? [],
    statuses: statuses.data ?? [],
    priorities: priorities.data ?? [],
  }
})

export async function listWritableProjects(userId: string) {
  void userId
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, key")
    .is("archived_at", null)
    .order("name")

  if (error) throw new DatabaseError("Could not load projects.")
  return data ?? []
}

export async function listIssues(userId: string, page: number, query: string): Promise<IssueList> {
  void userId
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const from = (safePage - 1) * pageSize
  const supabase = await createClient()
  let request = supabase
    .from("issues")
    .select(
      "id, issue_number, title, updated_at, project:projects!issues_project_id_fkey(key, name), issue_statuses!issues_status_id_fkey(name), priorities!issues_priority_id_fkey(name), assignee:profiles!issues_assignee_id_fkey(display_name)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, from + pageSize - 1)

  const needle = query.trim().replace(/[%_\\]/g, "")
  if (needle) request = request.ilike("title", `%${needle}%`)

  const { data, error, count } = await request
  if (error) throw new DatabaseError("Could not load issues.")

  return {
    page: safePage,
    pageSize,
    total: count ?? 0,
    items: (data ?? []).map((issue) => {
      const project = one(issue.project as { key: string; name: string } | { key: string; name: string }[] | null)
      const status = one(issue.issue_statuses as NamedEmbed)
      const priority = one(issue.priorities as NamedEmbed)
      const assignee = one(issue.assignee as NameEmbed)
      return {
        id: issue.id,
        number: issue.issue_number,
        title: issue.title,
        projectKey: project?.key ?? "ISSUE",
        projectName: project?.name ?? "Project",
        status: status?.name ?? "Unknown",
        priority: priority?.name ?? "Unknown",
        assigneeName: assignee?.display_name ?? null,
        updatedAt: issue.updated_at,
      }
    }),
  }
}

export async function getIssue(issueId: string, userId: string): Promise<IssueDetail | null> {
  void userId
  const supabase = await createClient()
  const { data: issue, error } = await supabase
    .from("issues")
    .select(
      "id, issue_number, title, description, created_at, updated_at, project_id, assignee_id, reporter_id, issue_type_id, status_id, priority_id, project:projects!issues_project_id_fkey(id, key, name), assignee:profiles!issues_assignee_id_fkey(display_name), reporter:profiles!issues_reporter_id_fkey(display_name)",
    )
    .eq("id", issueId)
    .maybeSingle()

  if (error) throw new DatabaseError("Could not load this issue.")
  if (!issue) return null

  const [catalog, labels, projectLabels, members, comments, history] = await Promise.all([
    getIssueCatalog(),
    supabase.from("issue_labels").select("label:labels(id, name, color)").eq("issue_id", issueId),
    supabase.from("labels").select("id, name, color").eq("project_id", issue.project_id).order("name"),
    supabase
      .from("project_members")
      .select("user_id, profile:profiles!project_members_user_id_fkey(display_name)")
      .eq("project_id", issue.project_id),
    supabase
      .from("comments")
      .select("id, body, created_at, author_id, author:profiles!comments_author_id_fkey(display_name)")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("issue_history")
      .select("id, field, old_value, new_value, created_at")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false })
      .limit(40),
  ])

  if (labels.error || projectLabels.error || members.error || comments.error || history.error) {
    throw new DatabaseError("Could not load this issue.")
  }

  const project = one(issue.project as { id: string; key: string; name: string } | { id: string; key: string; name: string }[] | null)
  const names = new Map<string, string>()
  for (const status of catalog.statuses) names.set(status.id, status.name)
  for (const priority of catalog.priorities) names.set(priority.id, priority.name)
  const memberRows = (members.data ?? []).map((member) => {
    const profile = one(member.profile as NameEmbed)
    const name = profile?.display_name ?? "Member"
    names.set(member.user_id, name)
    return { id: member.user_id, name }
  })

  return {
    id: issue.id,
    number: issue.issue_number,
    title: issue.title,
    description: issue.description,
    projectId: issue.project_id,
    projectKey: project?.key ?? "ISSUE",
    projectName: project?.name ?? "Project",
    typeId: issue.issue_type_id,
    statusId: issue.status_id,
    priorityId: issue.priority_id,
    assigneeId: issue.assignee_id ?? "",
    reporterName: one(issue.reporter as NameEmbed)?.display_name ?? "Unknown",
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    labels: (labels.data ?? []).flatMap((row) => {
      const label = one(row.label as IssueLabel | IssueLabel[] | null)
      return label ? [label] : []
    }),
    projectLabels: projectLabels.data ?? [],
    members: memberRows.sort((a, b) => a.name.localeCompare(b.name)),
    comments: (comments.data ?? []).map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.created_at,
      authorId: comment.author_id,
      authorName: one(comment.author as NameEmbed)?.display_name ?? "Member",
    })),
    history: (history.data ?? []).map((entry) => ({
      id: entry.id,
      field: entry.field,
      createdAt: entry.created_at,
      summary: historySummary(entry.field, entry.old_value, entry.new_value, names),
    })),
  }
}

function historySummary(field: string, oldValue: string | null, newValue: string | null, names: Map<string, string>) {
  const next = newValue ? (names.get(newValue) ?? newValue) : "none"
  if (field === "created") return `Created “${newValue ?? "issue"}”`
  if (field === "title") return `Title changed to “${newValue ?? ""}”`
  if (field === "status") return `Status set to ${next}`
  if (field === "priority") return `Priority set to ${next}`
  if (field === "assignee") return newValue ? `Assigned to ${next}` : "Assignee cleared"
  if (field === "due_date") return `Due date set to ${next}`
  if (field === "sprint") return newValue ? "Moved to a sprint" : "Removed from the sprint"
  return `${field} updated`
}

export async function createIssue(userId: string, input: CreateIssueValues) {
  const assigneeId = input.assigneeId || null
  await assertAssignee(input.projectId, assigneeId)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("issues")
    .insert({
      project_id: input.projectId,
      title: input.title,
      description: input.description,
      issue_type_id: input.issueTypeId,
      status_id: input.statusId,
      priority_id: input.priorityId,
      assignee_id: assigneeId,
      reporter_id: userId,
      // The numbering trigger replaces this before the row is stored.
      issue_number: 1,
    })
    .select("id, project_id")
    .maybeSingle()

  if (error) raiseIssueWriteError(error.message)
  if (!data) throw new AuthorizationError("PROJECT_ACCESS_DENIED", "You don't have access to that project.")
  return data
}

export async function updateIssue(userId: string, issueId: string, input: UpdateIssueValues) {
  void userId
  const supabase = await createClient()
  const { data: existing, error: readError } = await supabase
    .from("issues")
    .select("id, project_id")
    .eq("id", issueId)
    .maybeSingle()

  if (readError) throw new DatabaseError("Could not load this issue.")
  if (!existing) throw new NotFoundError("ISSUE_NOT_FOUND", "Issue could not be found.")

  const assigneeId = input.assigneeId || null
  await assertAssignee(existing.project_id, assigneeId)

  const { data, error } = await supabase
    .from("issues")
    .update({
      title: input.title,
      description: input.description,
      issue_type_id: input.issueTypeId,
      status_id: input.statusId,
      priority_id: input.priorityId,
      assignee_id: assigneeId,
    })
    .eq("id", issueId)
    .select("id, project_id")

  if (error) raiseIssueWriteError(error.message)
  if (!data?.length || !data[0]) {
    throw new AuthorizationError("ISSUE_ACCESS_DENIED", "You don't have permission to update this issue.")
  }

  return data[0]
}

export async function addIssueComment(userId: string, issueId: string, body: string) {
  const supabase = await createClient()
  const { data: issue, error: readError } = await supabase.from("issues").select("project_id").eq("id", issueId).maybeSingle()
  if (readError) throw new DatabaseError("Could not load this issue.")
  if (!issue) throw new NotFoundError("ISSUE_NOT_FOUND", "Issue could not be found.")

  const { error } = await supabase.from("comments").insert({ issue_id: issueId, author_id: userId, body })
  if (error) raiseIssueWriteError(error.message)
  return issue.project_id
}

export async function deleteIssueComment(userId: string, issueId: string, commentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("issue_id", issueId)
    .eq("author_id", userId)
    .select("id")

  if (error) raiseIssueWriteError(error.message)
  if (!data?.length) throw new AuthorizationError("ISSUE_ACCESS_DENIED", "You can only delete your own comments.")

  const { data: issue } = await supabase.from("issues").select("project_id").eq("id", issueId).maybeSingle()
  return issue?.project_id ?? null
}

export async function addIssueLabel(userId: string, issueId: string, name: string) {
  void userId
  const supabase = await createClient()
  const { data: issue, error: readError } = await supabase.from("issues").select("project_id").eq("id", issueId).maybeSingle()
  if (readError) throw new DatabaseError("Could not load this issue.")
  if (!issue) throw new NotFoundError("ISSUE_NOT_FOUND", "Issue could not be found.")

  const { data: existing, error: labelReadError } = await supabase
    .from("labels")
    .select("id")
    .eq("project_id", issue.project_id)
    .eq("name", name)
    .maybeSingle()
  if (labelReadError) throw new DatabaseError("Could not save the label.")

  let labelId = existing?.id
  if (!labelId) {
    const { data: created, error } = await supabase
      .from("labels")
      .insert({ project_id: issue.project_id, name, color: "#c2410c" })
      .select("id")
      .maybeSingle()
    if (error || !created) raiseIssueWriteError(error?.message ?? "label")
    labelId = created.id
  }

  const { error: linkError } = await supabase.from("issue_labels").insert({ issue_id: issueId, label_id: labelId })
  if (linkError && !linkError.message.includes("duplicate")) raiseIssueWriteError(linkError.message)
  return issue.project_id
}

export async function removeIssueLabel(issueId: string, labelId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("issue_labels").delete().eq("issue_id", issueId).eq("label_id", labelId)
  if (error) raiseIssueWriteError(error.message)
  const { data: issue } = await supabase.from("issues").select("project_id").eq("id", issueId).maybeSingle()
  return issue?.project_id ?? null
}
