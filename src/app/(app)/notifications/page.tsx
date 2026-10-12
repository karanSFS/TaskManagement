import Form from "next/form"
import Link from "next/link"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { NotificationInbox } from "@/components/notifications/notification-inbox"
import { filterFieldClass } from "@/components/shared/field-styles"
import { ListSkeleton } from "@/components/shared/page-skeleton"
import { SegmentedLinks } from "@/components/shared/segmented-links"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { isNotificationKind, notificationKinds, notificationLabel } from "@/lib/notifications/format"
import { countUnreadNotifications, listNotifications } from "@/lib/services/notification.service"
import { cn } from "@/lib/utils"

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
  const [result, unreadCount] = await Promise.all([
    listNotifications(user.id, page, { unread, kind }),
    countUnreadNotifications(user.id, kind),
  ])
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize))

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedLinks
          label="Notification view"
          items={[
            { href: inboxHref(false, 1, kind), label: "All", active: !unread },
            { href: inboxHref(true, 1, kind), label: unreadCount > 0 ? `Unread ${unreadCount}` : "Unread", active: unread },
          ]}
        />
        <Form action="/notifications" replace scroll={false} className="flex min-w-0 items-center gap-2">
          {unread ? <input type="hidden" name="view" value="unread" /> : null}
          <label className="min-w-0">
            <span className="sr-only">Type</span>
            <select name="kind" defaultValue={kind ?? ""} className={cn(filterFieldClass, "h-8 w-auto max-w-52")}>
              <option value="">All types</option>
              {notificationKinds.map((item) => (
                <option key={item} value={item}>{notificationLabel(item)}</option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm" variant="outline">Apply</Button>
        </Form>
        {kind ? (
          <Link href={inboxHref(unread, 1)} replace scroll={false} className="text-xs font-medium text-primary hover:underline">
            Clear type
          </Link>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {result.total} {result.total === 1 ? "notification" : "notifications"}
      </p>
      <NotificationInbox items={result.items} unread={unread} hasUnread={unreadCount > 0} />
      {pages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <p className="mr-auto text-xs text-muted-foreground">Page {result.page} of {pages}</p>
          {result.page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={inboxHref(unread, result.page - 1, kind)}>Previous</Link>
            </Button>
          ) : null}
          {result.page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={inboxHref(unread, result.page + 1, kind)}>Next</Link>
            </Button>
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
