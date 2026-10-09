"use client"

import { Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { markAllRead, markRead } from "@/lib/actions/notifications"
import { notificationHref, notificationLabel } from "@/lib/notifications/format"
import { formatProjectDate } from "@/lib/projects/format"
import type { NotificationItem } from "@/lib/services/notification.service"

export function NotificationInbox({ items, unread }: { items: NotificationItem[]; unread: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="grid gap-3">
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await markAllRead()
              if (result.error) toast.error(result.error)
            })
          }}
        >
          Mark all read
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={unread ? "No unread notifications" : "No notifications yet"}
          description={unread ? "You are caught up." : "Assignments, mentions, and comments will show up here."}
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="grid w-full gap-1 px-3 py-2.5 text-left hover:bg-muted/50"
                onClick={() => {
                  startTransition(async () => {
                    if (!item.readAt) {
                      const result = await markRead(item.id)
                      if (result.error) {
                        toast.error(result.error)
                        return
                      }
                    }
                    router.push(notificationHref(item))
                  })
                }}
              >
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {item.readAt ? null : <span className="size-1.5 rounded-full bg-primary" />}
                  <span className="font-medium text-foreground">{item.actorName}</span>
                  <span>{notificationLabel(item.kind)}</span>
                  <span>{formatProjectDate(item.createdAt)}</span>
                </span>
                <span className="text-sm">
                  {item.issueKey ? <span className="mr-2 text-muted-foreground">{item.issueKey}</span> : null}
                  {item.issueTitle ?? item.projectName ?? "Notification"}
                </span>
                {item.kind === "commented" || item.kind === "mentioned" ? (
                  <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
