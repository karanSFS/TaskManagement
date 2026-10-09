"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Bell } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { markAllRead, markRead } from "@/lib/actions/notifications"
import { notificationHref, notificationLabel } from "@/lib/notifications/format"
import { formatProjectDate } from "@/lib/projects/format"
import { createClient } from "@/lib/supabase/client"
import type { NotificationItem } from "@/lib/services/notification.service"

export function NotificationBell({
  userId,
  unread,
  items,
}: {
  userId: string
  unread: number
  items: NotificationItem[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [router, userId])

  function openItem(item: NotificationItem) {
    setOpen(false)
    startTransition(async () => {
      if (!item.readAt) {
        const result = await markRead(item.id)
        if (result.error) toast.error(result.error)
      }
      router.push(notificationHref(item))
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"} className="relative">
          <Bell />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
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
          ) : null}
        </div>
        {items.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul className="grid max-h-80 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="grid w-full gap-0.5 px-2 py-2 text-left hover:bg-muted/60"
                  onClick={() => openItem(item)}
                >
                  <span className="flex items-center gap-2 text-xs">
                    {item.readAt ? null : <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className="truncate font-medium">{item.actorName}</span>
                    <span className="truncate text-muted-foreground">{notificationLabel(item.kind)}</span>
                  </span>
                  <span className="truncate text-sm">{item.issueTitle ?? item.projectName ?? item.body}</span>
                  <span className="text-[11px] text-muted-foreground">{formatProjectDate(item.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="w-full"
            onClick={() => {
              setOpen(false)
              router.push("/notifications")
            }}
          >
            Open inbox
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
