import Link from "next/link"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { NotificationInbox } from "@/components/notifications/notification-inbox"
import { FilterDrawer, FilterField, filterFieldClass } from "@/components/shared/filter-drawer"
import { ListSkeleton } from "@/components/shared/page-skeleton"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { isNotificationKind, notificationLabel } from "@/lib/notifications/format"
import { listNotifications } from "@/lib/services/notification.service"

export const metadata = { title: "Notifications" }

type InboxSearch = { page?: string; view?: string; kind?: string }

export default function NotificationsPage({ searchParams }: { searchParams: Promise<InboxSearch> }) {
  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader title="Notifications" description="Assignments, mentions, comments, and project changes for your account." />
      <Suspense fallback={<ListSkeleton />}>
        <Inbox searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Inbox({ searchParams }: { searchParams: Promise<InboxSearch> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const unread = params.view === "unread"
  const kind = params.kind && isNotificationKind(params.kind) ? params.kind : undefined
  const page = Number(params.page ?? "1")
  const result = await listNotifications(user.id, page, { unread, kind })
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize))

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant={unread ? "ghost" : "outline"} size="sm">
          <Link href={inboxHref(false, 1, kind)}>All</Link>
        </Button>
        <Button asChild variant={unread ? "outline" : "ghost"} size="sm">
          <Link href={inboxHref(true, 1, kind)}>Unread</Link>
        </Button>
        <FilterDrawer action="/notifications" title="Filter notifications" activeCount={kind ? 1 : 0}>
          {unread ? <input type="hidden" name="view" value="unread" /> : null}
          <FilterField label="Type">
            <select name="kind" defaultValue={kind ?? ""} className={filterFieldClass}>
              <option value="">All types</option>
              <option value="assigned">{notificationLabel("assigned")}</option>
              <option value="mentioned">{notificationLabel("mentioned")}</option>
              <option value="commented">{notificationLabel("commented")}</option>
              <option value="issue_updated">{notificationLabel("issue_updated")}</option>
              <option value="project_member_added">{notificationLabel("project_member_added")}</option>
              <option value="sprint_changed">{notificationLabel("sprint_changed")}</option>
            </select>
          </FilterField>
        </FilterDrawer>
      </div>
      <p className="text-xs text-muted-foreground">
        {result.total} {result.total === 1 ? "notification" : "notifications"}
      </p>
      <NotificationInbox items={result.items} unread={unread} />
      {pages > 1 ? (
        <div className="flex items-center gap-2 text-sm">
          {result.page > 1 ? (
            <Link href={inboxHref(unread, result.page - 1, kind)} className="underline">Previous</Link>
          ) : null}
          <span className="text-muted-foreground">Page {result.page} of {pages}</span>
          {result.page < pages ? (
            <Link href={inboxHref(unread, result.page + 1, kind)} className="underline">Next</Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function inboxHref(unread: boolean, page: number, kind?: string) {
  const params = new URLSearchParams()
  if (unread) params.set("view", "unread")
  if (kind) params.set("kind", kind)
  if (page > 1) params.set("page", String(page))
  const search = params.toString()
  return search ? `/notifications?${search}` : "/notifications"
}
