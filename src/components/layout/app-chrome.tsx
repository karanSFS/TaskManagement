"use client"

import { useCallback, useState } from "react"
import { Monitor, Moon, Plus, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { CreateIssueDialog } from "@/components/issues/create-issue-dialog"
import { GlobalSearch } from "@/components/layout/global-search"
import { NotificationBell } from "@/components/layout/notification-bell"
import { UserMenu } from "@/components/layout/user-menu"
import type { NotificationItem } from "@/lib/services/notification.service"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard-shortcut"

type AppChromeProps = {
  user: {
    id: string
    email: string
    fullName: string
  }
  notifications: {
    unread: number
    items: NotificationItem[]
  }
}

export function AppChrome({ user, notifications }: AppChromeProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const openSearch = useCallback(() => setSearchOpen(true), [])
  const openCreate = useCallback(() => setCreateOpen(true), [])

  useKeyboardShortcut("/", openSearch)
  useKeyboardShortcut("c", openCreate)

  return (
    <>
      <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur md:px-4">
        <SidebarTrigger />
        <Button
          variant="outline"
          className="h-8 min-w-0 flex-1 justify-start px-2 text-muted-foreground sm:max-w-sm"
          onClick={openSearch}
        >
          <Search />
          <span className="truncate">Search issues and pages</span>
          <Kbd className="ml-auto font-mono">/</Kbd>
        </Button>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus />
          <span className="hidden sm:inline">Create issue</span>
          <Kbd className="hidden bg-primary-foreground/15 font-mono text-primary-foreground sm:inline-flex">C</Kbd>
        </Button>
        <NotificationBell userId={user.id} unread={notifications.unread} items={notifications.items} />
        <ThemeToggle />
        <UserMenu user={user} />
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <CreateIssueDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const current = theme ?? "system"
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor
  const next = current === "light" ? "dark" : current === "dark" ? "system" : "light"
  const label = `Theme: ${current}. Switch to ${next}.`

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      suppressHydrationWarning
      onClick={() => setTheme(next)}
    >
      <Icon />
    </Button>
  )
}
