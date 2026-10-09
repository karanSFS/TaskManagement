import { cache } from "react"

import { AppError } from "@/lib/errors/app-error"
import { AuthenticationError } from "@/lib/errors/authentication-error"
import { AuthorizationError } from "@/lib/errors/authorization-error"
import { DatabaseError } from "@/lib/errors/database-error"
import { NotFoundError } from "@/lib/errors/not-found-error"
import { formatDueDate, issueKey } from "@/lib/projects/format"
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

export type MyWorkItem = IssueListItem & { dueDate: string | null }

export type MyWorkList = {
  items: MyWorkItem[]
  total: number
}

export type MyWork = {
  assigned: MyWorkList
  reported: MyWorkList
  dueSoon: MyWorkList
}

export type IssueList = {
  items: IssueListItem[]
  page: number
  pageSize: number
  total: number
}

export type BoardCard = {
  id: string
  number: number
  title: string
  priority: string
  assigneeName: string | null
  statusId: string
}

export type BoardColumn = {
  id: string
  name: string
  issues: BoardCard[]
}

export type BoardData = {
  projectId: string
  projectName: string
  projectKey: string
  archived: boolean
  total: number
  shown: number
  columns: BoardColumn[]
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
  actorName: string
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
  dueDate: string
  reporterName: string
  createdAt: string
  updatedAt: string
  projectArchived: boolean
  canDelete: boolean
  labels: IssueLabel[]
  projectLabels: IssueLabel[]
  members: { id: string; name: string }[]
  comments: IssueComment[]
  history: IssueHistoryEntry[]
  parent: { id: string; number: number; title: string } | null
  subtasks: { id: string; number: number; title: string; status: string }[]
  links: { id: string; type: string; direction: "out" | "in"; issueId: string; number: number; title: string; projectKey: string }[]
  linkChoices: { id: string; number: number; title: string }[]
}

type NameEmbed = { display_name: string } | { display_name: string }[] | null
type Named = { id: string; name: string; slug?: string; category?: string; rank?: number }
type NamedEmbed = Named | Named[] | null

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function raiseIssueWriteError(message: string): never {
  if (message.includes("Archived projects cannot take new issues")) {
    throw new AppError("INVALID_PROJECT", "This project is archived. Restore it before filing new issues.", 422)
  }
  if (message.includes("Label and issue must belong to the same project")) {
    throw new AppError("INVALID_LABEL", "That label belongs to a different project.", 422)
  }
  if (message.includes("issue_links_source_issue_id_target_issue_id_link_type_key")) {
    throw new AppError("DUPLICATE_LINK", "Those issues are already linked that way.", 409)
  }
  if (message.includes("labels_project_id_name_key") || message.includes("duplicate key")) {
    throw new AppError("DUPLICATE_LABEL", "That label already exists in this project.", 409)
  }
  if (message.includes("Parent issue must belong")) {
    throw new AppError("INVALID_ISSUE", "A subtask must stay in the same project as its parent.", 422)
  }
  if (message.includes("cannot be its own parent")) {
    throw new AppError("INVALID_ISSUE", "An issue cannot be its own parent.", 422)
  }
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

export type WritableProject = {
  id: string
  name: string
  key: string
  members: { id: string; name: string }[]
}

export async function listWritableProjects(userId: string): Promise<{ active: WritableProject[]; archivedCount: number }> {
  void userId
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, key, archived_at, project_members(user_id, profile:profiles!project_members_user_id_fkey(display_name))")
    .order("name")

  if (error) throw new DatabaseError("Could not load projects.")

  const rows = data ?? []
  return {
    archivedCount: rows.filter((project) => project.archived_at).length,
    active: rows
      .filter((project) => !project.archived_at)
      .map((project) => ({
        id: project.id,
        name: project.name,
        key: project.key,
        members: (project.project_members ?? [])
          .map((member) => ({
            id: member.user_id,
            name: one(member.profile as NameEmbed)?.display_name ?? "Member",
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      })),
  }
}

export async function listIssueProjects(userId: string) {
  void userId
  const supabase = await createClient()
  const { data, error } = await supabase.from("projects").select("id, name, key").order("name")
  if (error) throw new DatabaseError("Could not load projects.")
  return data ?? []
}

export type IssueFilters = {
  query?: string
  projectId?: string
  statusId?: string
  priorityId?: string
  typeId?: string
  assignee?: "all" | "me" | "unassigned"
  sort?: "updated" | "created" | "title" | "priority" | "key"
  ascending?: boolean
  limit?: number
}

export async function listIssues(userId: string, page: number, filters: IssueFilters = {}): Promise<IssueList> {
  void userId
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 50) : pageSize
  const from = (safePage - 1) * limit
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("search_issues", {
    search_text: filters.query ?? "",
    target_project_id: uuidOrNull(filters.projectId),
    target_status_id: uuidOrNull(filters.statusId),
    target_priority_id: uuidOrNull(filters.priorityId),
    target_type_id: uuidOrNull(filters.typeId),
    assignee_filter: filters.assignee ?? "all",
    sort_by: filters.sort ?? "updated",
    sort_ascending: filters.ascending ?? false,
    page_limit: limit,
    page_offset: from,
  })

  if (error) throw new DatabaseError("Could not load issues.")

  const rows = data ?? []
  return {
    page: safePage,
    pageSize: limit,
    total: rows[0]?.total_count ?? 0,
    items: rows.map((issue) => ({
      id: issue.id,
      number: issue.issue_number,
      title: issue.title,
      projectKey: issue.project_key,
      projectName: issue.project_name,
      status: issue.status_name,
      priority: issue.priority_name,
      assigneeName: issue.assignee_name,
      updatedAt: issue.updated_at,
    })),
  }
}

function uuidOrNull(value: string | undefined) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return undefined
  return value
}

const myWorkSelect =
  "id, issue_number, title, updated_at, due_date, project:projects!issues_project_id_fkey(key, name), issue_statuses!issues_status_id_fkey(name), priorities!issues_priority_id_fkey(name), assignee:profiles!issues_assignee_id_fkey(display_name)"

const myWorkLimit = 20

export async function listMyWork(userId: string): Promise<MyWork> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new AuthenticationError("Sign in to see your work.")
  }
  const catalog = await getIssueCatalog()
  const openStatusIds = catalog.statuses.filter((status) => status.category !== "done").map((status) => status.id)
  if (openStatusIds.length === 0) {
    const empty = { items: [], total: 0 }
    return { assigned: empty, reported: empty, dueSoon: empty }
  }

  const horizon = isoDate(7)
  const supabase = await createClient()
  const openIssues = () =>
    supabase.from("issues").select(myWorkSelect, { count: "exact" }).in("status_id", openStatusIds).limit(myWorkLimit)

  const [assigned, reported, dueSoon] = await Promise.all([
    openIssues().eq("assignee_id", userId).order("updated_at", { ascending: false }),
    openIssues().eq("reporter_id", userId).order("updated_at", { ascending: false }),
    openIssues()
      .or(`assignee_id.eq.${userId},reporter_id.eq.${userId}`)
      .not("due_date", "is", null)
      .lte("due_date", horizon)
      .order("due_date", { ascending: true }),
  ])

  if (assigned.error || reported.error || dueSoon.error) {
    throw new DatabaseError("Could not load your work.")
  }

  return {
    assigned: toMyWorkList(assigned.data, assigned.count),
    reported: toMyWorkList(reported.data, reported.count),
    dueSoon: toMyWorkList(dueSoon.data, dueSoon.count),
  }
}

function isoDate(offsetDays: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function toMyWorkList(rows: unknown[] | null, total: number | null): MyWorkList {
  return {
    total: total ?? 0,
    items: (rows ?? []).map((row) => {
      const issue = row as {
        id: string
        issue_number: number
        title: string
        updated_at: string
        due_date: string | null
        project: { key: string; name: string } | { key: string; name: string }[] | null
        issue_statuses: NamedEmbed
        priorities: NamedEmbed
        assignee: NameEmbed
      }
      const project = one(issue.project)
      const status = one(issue.issue_statuses)
      const priority = one(issue.priorities)
      const assignee = one(issue.assignee)
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
        dueDate: issue.due_date,
      }
    }),
  }
}

export async function getIssue(issueId: string, userId: string): Promise<IssueDetail | null> {
  const supabase = await createClient()
  const { data: issue, error } = await supabase
    .from("issues")
    .select(
      "id, issue_number, title, description, created_at, updated_at, due_date, project_id, assignee_id, reporter_id, parent_issue_id, issue_type_id, status_id, priority_id, project:projects!issues_project_id_fkey(id, key, name, archived_at), assignee:profiles!issues_assignee_id_fkey(display_name), reporter:profiles!issues_reporter_id_fkey(display_name)",
    )
    .eq("id", issueId)
    .maybeSingle()

  if (error) throw new DatabaseError("Could not load this issue.")
  if (!issue) return null

  const [catalog, labels, projectLabels, members, comments, history, children, links, choices, parent] = await Promise.all([
    getIssueCatalog(),
    supabase.from("issue_labels").select("label:labels(id, name, color)").eq("issue_id", issueId),
    supabase.from("labels").select("id, name, color").eq("project_id", issue.project_id).order("name"),
    supabase
      .from("project_members")
      .select("user_id, role, profile:profiles!project_members_user_id_fkey(display_name)")
      .eq("project_id", issue.project_id),
    supabase
      .from("comments")
      .select("id, body, created_at, author_id, author:profiles!comments_author_id_fkey(display_name)")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("issue_history")
      .select("id, field, new_value, created_at, actor_id")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("issues")
      .select("id, issue_number, title, issue_statuses!issues_status_id_fkey(name)")
      .eq("parent_issue_id", issueId)
      .order("issue_number")
      .limit(50),
    supabase
      .from("issue_links")
      .select(
        "id, link_type, source_issue_id, target_issue_id, source:issues!issue_links_source_issue_id_fkey(id, issue_number, title, project:projects!issues_project_id_fkey(key)), target:issues!issue_links_target_issue_id_fkey(id, issue_number, title, project:projects!issues_project_id_fkey(key))",
      )
      .or(`source_issue_id.eq.${issueId},target_issue_id.eq.${issueId}`),
    supabase
      .from("issues")
      .select("id, issue_number, title")
      .eq("project_id", issue.project_id)
      .neq("id", issueId)
      .order("updated_at", { ascending: false })
      .limit(100),
    issue.parent_issue_id
      ? supabase.from("issues").select("id, issue_number, title").eq("id", issue.parent_issue_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (labels.error || projectLabels.error || members.error || comments.error || history.error || children.error || links.error || choices.error || parent.error) {
    throw new DatabaseError("Could not load this issue.")
  }

  type ProjectEmbed = { id: string; key: string; name: string; archived_at: string | null }
  const project = one(issue.project as ProjectEmbed | ProjectEmbed[] | null)
  const names = new Map<string, string>()
  for (const status of catalog.statuses) names.set(status.id, status.name)
  for (const priority of catalog.priorities) names.set(priority.id, priority.name)
  const memberRows = (members.data ?? []).map((member) => {
    const profile = one(member.profile as NameEmbed)
    const name = profile?.display_name ?? "Member"
    names.set(member.user_id, name)
    return { id: member.user_id, name }
  })
  const myRole = (members.data ?? []).find((member) => member.user_id === userId)?.role
  const actorNames = new Map(memberRows.map((member) => [member.id, member.name]))

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
    dueDate: issue.due_date ?? "",
    reporterName: one(issue.reporter as NameEmbed)?.display_name ?? "Unknown",
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    projectArchived: Boolean(project?.archived_at),
    canDelete: issue.reporter_id === userId || myRole === "owner" || myRole === "admin",
    labels: (labels.data ?? []).flatMap((row) => {
      const label = one(row.label as IssueLabel | IssueLabel[] | null)
      return label ? [label] : []
    }),
    projectLabels: projectLabels.data ?? [],
    members: memberRows.sort((a, b) => a.name.localeCompare(b.name)),
    comments: (comments.data ?? []).toReversed().map((comment) => ({
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
      summary: historySummary(entry.field, entry.new_value, names),
      actorName: entry.actor_id ? (actorNames.get(entry.actor_id) ?? "Former member") : "TaskForge",
    })),
    parent: parent.data
      ? { id: parent.data.id, number: parent.data.issue_number, title: parent.data.title }
      : null,
    subtasks: (children.data ?? []).map((child) => ({
      id: child.id,
      number: child.issue_number,
      title: child.title,
      status: one(child.issue_statuses as NamedEmbed)?.name ?? "Unknown",
    })),
    links: (links.data ?? []).flatMap((link) => {
      const outgoing = link.source_issue_id === issueId
      const other = one((outgoing ? link.target : link.source) as LinkedIssue | LinkedIssue[] | null)
      const otherProject = one(other?.project ?? null)
      if (!other) return []
      return [{
        id: link.id,
        type: link.link_type,
        direction: outgoing ? "out" as const : "in" as const,
        issueId: other.id,
        number: other.issue_number,
        title: other.title,
        projectKey: otherProject?.key ?? project?.key ?? "ISSUE",
      }]
    }),
    linkChoices: (choices.data ?? []).map((choice) => ({
      id: choice.id,
      number: choice.issue_number,
      title: choice.title,
    })),
  }
}

type LinkedIssue = {
  id: string
  issue_number: number
  title: string
  project: { key: string } | { key: string }[] | null
}

function historySummary(field: string, newValue: string | null, names: Map<string, string>) {
  const next = newValue ? (names.get(newValue) ?? "an unknown value") : "none"
  if (field === "created") return `Created “${newValue ?? "issue"}”`
  if (field === "title") return `Title changed to “${newValue ?? ""}”`
  if (field === "status") return `Status set to ${next}`
  if (field === "priority") return `Priority set to ${next}`
  if (field === "assignee") return newValue ? `Assigned to ${names.get(newValue) ?? "a former member"}` : "Assignee cleared"
  if (field === "due_date") return newValue ? `Due date set to ${formatDueDate(newValue)}` : "Due date cleared"
  if (field === "sprint") return newValue ? "Moved to a sprint" : "Removed from the sprint"
  return `${field} updated`
}

export type ActivityItem = {
  id: string
  summary: string
  createdAt: string
  actorName: string
  issueId: string
  issueKey: string
  issueTitle: string
}

export async function listRecentActivity(userId: string): Promise<ActivityItem[]> {
  void userId
  const supabase = await createClient()
  const catalog = await getIssueCatalog()
  const { data, error } = await supabase
    .from("issue_history")
    .select(
      "id, field, new_value, created_at, actor_id, issue:issues!issue_history_issue_id_fkey(id, issue_number, title, project:projects!issues_project_id_fkey(key))",
    )
    .order("created_at", { ascending: false })
    .limit(12)

  if (error) throw new DatabaseError("Could not load recent activity.")

  const rows = data ?? []
  const names = new Map<string, string>()
  for (const status of catalog.statuses) names.set(status.id, status.name)
  for (const priority of catalog.priorities) names.set(priority.id, priority.name)

  const profileIds = [
    ...new Set(
      rows.flatMap((row) => {
        const ids = row.actor_id ? [row.actor_id] : []
        if (row.field === "assignee" && row.new_value && isUuid(row.new_value)) ids.push(row.new_value)
        return ids
      }),
    ),
  ]
  if (profileIds.length > 0) {
    const profiles = await supabase.from("profiles").select("id, display_name").in("id", profileIds)
    if (profiles.error) throw new DatabaseError("Could not load recent activity.")
    for (const profile of profiles.data ?? []) names.set(profile.id, profile.display_name)
  }

  return rows.flatMap((row) => {
    const issue = one(row.issue as ActivityIssue | ActivityIssue[] | null)
    const project = one(issue?.project ?? null)
    if (!issue || !project?.key) return []
    return [{
      id: row.id,
      summary: historySummary(row.field, row.new_value, names),
      createdAt: row.created_at,
      actorName: row.actor_id ? (names.get(row.actor_id) ?? "Former member") : "TaskForge",
      issueId: issue.id,
      issueKey: issueKey(project.key, issue.issue_number),
      issueTitle: issue.title,
    }]
  })
}

type ActivityIssue = {
  id: string
  issue_number: number
  title: string
  project: { key: string } | { key: string }[] | null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

const boardLimit = 200

export async function listBoard(
  userId: string,
  projectId: string,
  assignee: "all" | "me" | "unassigned",
  query: string,
): Promise<BoardData | null> {
  const supabase = await createClient()
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, key, archived_at")
    .eq("id", projectId)
    .maybeSingle()

  if (projectError) throw new DatabaseError("Could not load the board.")
  if (!project) return null

  const catalog = await getIssueCatalog()
  let request = supabase
    .from("issues")
    .select(
      "id, issue_number, title, status_id, priorities!issues_priority_id_fkey(name), assignee:profiles!issues_assignee_id_fkey(display_name)",
      { count: "exact" },
    )
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(boardLimit)

  const needle = query.trim().replace(/[%_\\]/g, "")
  if (needle) request = request.ilike("title", `%${needle}%`)
  if (assignee === "me") request = request.eq("assignee_id", userId)
  if (assignee === "unassigned") request = request.is("assignee_id", null)

  const { data, error, count } = await request
  if (error) throw new DatabaseError("Could not load the board.")

  const cards: BoardCard[] = (data ?? []).map((issue) => ({
    id: issue.id,
    number: issue.issue_number,
    title: issue.title,
    priority: one(issue.priorities as NamedEmbed)?.name ?? "Unknown",
    assigneeName: one(issue.assignee as NameEmbed)?.display_name ?? null,
    statusId: issue.status_id,
  }))

  return {
    projectId: project.id,
    projectName: project.name,
    projectKey: project.key,
    archived: Boolean(project.archived_at),
    total: count ?? cards.length,
    shown: cards.length,
    columns: catalog.statuses.map((status) => ({
      id: status.id,
      name: status.name,
      issues: cards.filter((card) => card.statusId === status.id),
    })),
  }
}

export async function changeIssueStatus(userId: string, issueId: string, statusId: string) {
  void userId
  const catalog = await getIssueCatalog()
  if (!catalog.statuses.some((status) => status.id === statusId)) {
    throw new AppError("INVALID_ISSUE_STATUS", "Choose a status from the board.", 422)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("issues")
    .update({ status_id: statusId })
    .eq("id", issueId)
    .select("id, project_id")

  if (error) raiseIssueWriteError(error.message)
  if (!data?.length || !data[0]) {
    throw new AuthorizationError("ISSUE_ACCESS_DENIED", "You don't have permission to move this issue.")
  }

  return data[0]
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
      due_date: input.dueDate || null,
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

export async function deleteIssue(issueId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("issues").delete().eq("id", issueId).select("id, project_id")

  if (error) raiseIssueWriteError(error.message)
  if (!data?.length || !data[0]) {
    throw new AuthorizationError("ISSUE_ACCESS_DENIED", "Only the reporter or a project owner or admin can delete this issue.")
  }

  return data[0].project_id
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
      due_date: input.dueDate || null,
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

export async function createSubtask(userId: string, parentIssueId: string, title: string) {
  const supabase = await createClient()
  const { data: parent, error: readError } = await supabase
    .from("issues")
    .select("id, project_id, priority_id")
    .eq("id", parentIssueId)
    .maybeSingle()

  if (readError) throw new DatabaseError("Could not load this issue.")
  if (!parent) throw new NotFoundError("ISSUE_NOT_FOUND", "Issue could not be found.")

  const catalog = await getIssueCatalog()
  const subtaskType = catalog.types.find((type) => type.slug === "subtask")
  const todo = catalog.statuses.find((status) => status.slug === "todo") ?? catalog.statuses[0]
  if (!subtaskType || !todo) throw new DatabaseError("Could not create the subtask.")

  const { data, error } = await supabase
    .from("issues")
    .insert({
      project_id: parent.project_id,
      title,
      description: "",
      issue_type_id: subtaskType.id,
      status_id: todo.id,
      priority_id: parent.priority_id,
      reporter_id: userId,
      parent_issue_id: parent.id,
      issue_number: 1,
    })
    .select("id, project_id")
    .maybeSingle()

  if (error) raiseIssueWriteError(error.message)
  if (!data) throw new AuthorizationError("PROJECT_ACCESS_DENIED", "You don't have access to that project.")
  return data
}

export async function addIssueLink(userId: string, sourceIssueId: string, targetIssueId: string, linkType: string) {
  if (sourceIssueId === targetIssueId) {
    throw new AppError("INVALID_ISSUE", "An issue cannot link to itself.", 422)
  }

  const supabase = await createClient()
  const { data: issues, error: readError } = await supabase
    .from("issues")
    .select("id, project_id")
    .in("id", [sourceIssueId, targetIssueId])

  if (readError) throw new DatabaseError("Could not load these issues.")
  const source = issues?.find((issue) => issue.id === sourceIssueId)
  const target = issues?.find((issue) => issue.id === targetIssueId)
  if (!source || !target) throw new NotFoundError("ISSUE_NOT_FOUND", "Issue could not be found.")
  if (source.project_id !== target.project_id) {
    throw new AppError("INVALID_ISSUE", "Link issues in the same project.", 422)
  }

  const { error } = await supabase.from("issue_links").insert({
    source_issue_id: sourceIssueId,
    target_issue_id: targetIssueId,
    link_type: linkType,
    created_by: userId,
  })

  if (error) raiseIssueWriteError(error.message)
  return source.project_id
}

export async function removeIssueLink(linkId: string, issueId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("issue_links").delete().eq("id", linkId)
  if (error) raiseIssueWriteError(error.message)
  const { data: issue } = await supabase.from("issues").select("project_id").eq("id", issueId).maybeSingle()
  return issue?.project_id ?? null
}
