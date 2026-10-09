import { DatabaseError } from "@/lib/errors/database-error"
import { createClient } from "@/lib/supabase/server"

const pageSize = 20

export type NotificationItem = {
  id: string
  kind: string
  body: string
  readAt: string | null
  createdAt: string
  actorName: string
  issueId: string | null
  projectId: string | null
  issueKey: string | null
  issueTitle: string | null
  projectName: string | null
}

type ActorEmbed = { display_name: string } | { display_name: string }[] | null
type ProjectEmbed = { name: string; key?: string } | { name: string; key?: string }[] | null
type IssueEmbed = {
  issue_number: number
  title: string
  project: ProjectEmbed
} | {
  issue_number: number
  title: string
  project: ProjectEmbed
}[] | null

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const notificationSelect =
  "id, kind, body, read_at, created_at, issue_id, project_id, actor:profiles!notifications_actor_id_fkey(display_name), issue:issues!notifications_issue_id_fkey(issue_number, title, project:projects!issues_project_id_fkey(key, name)), project:projects!notifications_project_id_fkey(name)"

export async function listNotifications(userId: string, page: number, unreadOnly = false) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const from = (safePage - 1) * pageSize
  const supabase = await createClient()
  let query = supabase
    .from("notifications")
    .select(notificationSelect, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1)

  if (unreadOnly) query = query.is("read_at", null)

  const { data, error, count } = await query
  if (error) throw new DatabaseError("Could not load notifications.")

  return {
    page: safePage,
    pageSize,
    total: count ?? 0,
    items: (data ?? []).map(mapNotification),
  }
}

export async function listNotificationPreview(userId: string) {
  const supabase = await createClient()
  const [list, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select(notificationSelect)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ])

  if (list.error || unread.error) throw new DatabaseError("Could not load notifications.")

  return {
    unread: unread.count ?? 0,
    items: (list.data ?? []).map(mapNotification),
  }
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) throw new DatabaseError("Could not update that notification.")
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) throw new DatabaseError("Could not update notifications.")
}

function mapNotification(row: {
  id: string
  kind: string
  body: string
  read_at: string | null
  created_at: string
  issue_id: string | null
  project_id: string | null
  actor: ActorEmbed
  issue: IssueEmbed
  project: ProjectEmbed
}): NotificationItem {
  const issue = one(row.issue)
  const issueProject = one(issue?.project ?? null)
  const project = one(row.project)
  const key = issue && issueProject?.key ? `${issueProject.key}-${issue.issue_number}` : null

  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
    actorName: one(row.actor)?.display_name ?? "TaskForge",
    issueId: row.issue_id,
    projectId: row.project_id,
    issueKey: key,
    issueTitle: issue?.title ?? null,
    projectName: project?.name ?? issueProject?.name ?? null,
  }
}
