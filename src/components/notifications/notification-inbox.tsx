"use client"

import { AtSign, Bell, CalendarRange, Check, Clock, FolderPlus, Mail, MessageSquare, Pencil, UserRound, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition, type ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { markAllRead, markRead } from "@/lib/actions/notifications"
import { formatNotificationTime, notificationHref, notificationLabel } from "@/lib/notifications/format"
import type { NotificationItem } from "@/lib/services/notification.service"

export function NotificationInbox({ items, unread }: { items: NotificationItem[]; unread: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const unreadCount = items.filter((item) => !item.readAt).length

  function markOne(id: string, href?: string) {
    startTransition(async () => {
      const result = await markRead(id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (href) router.push(href)
      else router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await markAllRead()
              if (result.error) {
                toast.error(result.error)
                return
              }
              toast.success(result.success ?? "Notifications marked read.")
              router.refresh()
            })
          }}
        >
          {pending ? "Updating…" : "Mark all read"}
        </Button>
        {unreadCount > 0 ? <p className="text-xs text-muted-foreground">{unreadCount} unread on this page</p> : null}
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={unread ? "No unread notifications" : "No notifications yet"}
          description={unread ? "You are caught up." : "Assignments, mentions, and comments will show up here."}
        />
      ) : (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.id} className={`rounded-xl border bg-card shadow-sm ${item.readAt ? "" : "border-l-2 border-l-primary"}`}>
              <div className="flex items-start gap-3 px-3 py-3">
                <span className="mt-0.5 text-muted-foreground">{kindIcon(item.kind)}</span>
                <button
                  type="button"
                  className="grid min-w-0 flex-1 gap-1 text-left"
                  onClick={() => {
                    if (!item.readAt) markOne(item.id, notificationHref(item))
                    else router.push(notificationHref(item))
                  }}
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {item.readAt ? null : <span className="size-1.5 rounded-full bg-primary" />}
                    <span className="font-medium text-foreground">{item.actorName}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{notificationLabel(item.kind)}</span>
                    <time dateTime={item.createdAt}>{formatNotificationTime(item.createdAt)}</time>
                  </span>
                  <span className={item.readAt ? "text-sm" : "text-sm font-semibold"}>
                    {item.issueKey ? <span className="mr-2 font-mono text-xs font-normal text-muted-foreground">{item.issueKey}</span> : null}
                    {item.issueTitle ?? item.projectName ?? "Notification"}
                  </span>
                  {item.kind === "commented" || item.kind === "mentioned" ? (
                    <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
                  ) : item.projectName && !item.issueTitle ? (
                    <span className="text-xs text-muted-foreground">{item.projectName}</span>
                  ) : null}
                </button>
                {item.readAt ? null : (
                  <Button type="button" variant="ghost" size="xs" disabled={pending} onClick={() => markOne(item.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function kindIcon(kind: string): ReactNode {
  const className = "size-4"
  switch (kind) {
    case "assigned":
      return <UserRound className={className} />
    case "mentioned":
      return <AtSign className={className} />
    case "commented":
      return <MessageSquare className={className} />
    case "issue_updated":
      return <Pencil className={className} />
    case "project_member_added":
      return <FolderPlus className={className} />
    case "sprint_changed":
      return <CalendarRange className={className} />
    case "project_invited":
      return <Mail className={className} />
    case "invitation_accepted":
      return <Check className={className} />
    case "invitation_rejected":
      return <X className={className} />
    case "invitation_expired":
      return <Clock className={className} />
    case "invitation_revoked":
      return <X className={className} />
    default:
      return <Bell className={className} />
  }
}
