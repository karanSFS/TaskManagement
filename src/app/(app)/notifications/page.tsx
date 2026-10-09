import Link from "next/link"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { NotificationInbox } from "@/components/notifications/notification-inbox"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { listNotifications } from "@/lib/services/notification.service"

export const metadata = { title: "Notifications" }

export default function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string; view?: string }> }) {
  return (
    <div className="grid gap-4">
      <PageHeader title="Notifications" description="Assignments, mentions, comments, and project changes." />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <Inbox searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Inbox({ searchParams }: { searchParams: Promise<{ page?: string; view?: string }> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const unread = params.view === "unread"
  const page = Number(params.page ?? "1")
  const result = await listNotifications(user.id, page, unread)
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize))

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Button asChild variant={unread ? "ghost" : "outline"} size="sm">
          <Link href="/notifications">All</Link>
        </Button>
        <Button asChild variant={unread ? "outline" : "ghost"} size="sm">
          <Link href="/notifications?view=unread">Unread</Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {result.total} {result.total === 1 ? "notification" : "notifications"}
      </p>
      <NotificationInbox items={result.items} unread={unread} />
      {pages > 1 ? (
        <div className="flex items-center gap-2 text-sm">
          {result.page > 1 ? (
            <Link href={inboxHref(unread, result.page - 1)} className="underline">Previous</Link>
          ) : null}
          <span className="text-muted-foreground">Page {result.page} of {pages}</span>
          {result.page < pages ? (
            <Link href={inboxHref(unread, result.page + 1)} className="underline">Next</Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function inboxHref(unread: boolean, page: number) {
  const params = new URLSearchParams()
  if (unread) params.set("view", "unread")
  if (page > 1) params.set("page", String(page))
  const search = params.toString()
  return search ? `/notifications?${search}` : "/notifications"
}
