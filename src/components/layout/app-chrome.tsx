"use client"

import { useCallback, useState } from "react"
import { Bell, Monitor, Moon, Plus, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { CreateIssueDialog } from "@/components/layout/create-issue-dialog"
import { GlobalSearch } from "@/components/layout/global-search"
import { UserMenu } from "@/components/layout/user-menu"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard-shortcut"

type AppChromeProps = {
  user: {
    email: string
    fullName: string
  }
}

export function AppChrome({ user }: AppChromeProps) {
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
          <span className="truncate">Search pages</span>
          <Kbd className="ml-auto font-mono">/</Kbd>
        </Button>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus />
          <span className="hidden sm:inline">Create issue</span>
          <Kbd className="hidden bg-primary-foreground/15 font-mono text-primary-foreground sm:inline-flex">C</Kbd>
        </Button>
        <NotificationsMenu />
        <ThemeToggle />
        <UserMenu user={user} />
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <CreateIssueDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-3">
          <p className="text-sm font-medium">Notifications</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Nothing yet. Assignments, mentions, and comments arrive in Phase 8.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
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
