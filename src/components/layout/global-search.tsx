"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { searchIssues } from "@/lib/actions/issues"
import { useOpenIssue } from "@/components/issues/issue-drawer"
import { mainNav, utilityNav } from "@/lib/config/nav"

type GlobalSearchProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type IssueHit = { id: string; key: string; title: string; projectName: string }

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const openIssue = useOpenIssue()
  const [query, setQuery] = useState("")
  const [issues, setIssues] = useState<IssueHit[]>([])
  const pages = [...mainNav, ...utilityNav]
  const needle = query.trim().toLowerCase()
  const visiblePages = pages.filter((item) => {
    if (!needle) return true
    return `${item.title} ${item.description}`.toLowerCase().includes(needle)
  })

  useEffect(() => {
    if (!open) return
    const handle = window.setTimeout(() => {
      void searchIssues(query).then(setIssues)
    }, 250)
    return () => window.clearTimeout(handle)
  }, [open, query])

  function go(href: string) {
    onOpenChange(false)
    setQuery("")
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search TaskForge"
      description="Search issues by key, title, or label, or jump to a page."
    >
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search issues or pages…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No matching pages or issues.</CommandEmpty>
          {issues.length > 0 ? (
            <CommandGroup heading="Issues">
              {issues.map((issue) => (
                <CommandItem
                  key={issue.id}
                  value={issue.id}
                  onSelect={() => {
                    onOpenChange(false)
                    setQuery("")
                    openIssue(issue.id)
                  }}
                >
                  <span className="text-muted-foreground">{issue.key}</span>
                  <span className="truncate">{issue.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {issues.length > 0 && visiblePages.length > 0 ? <CommandSeparator /> : null}
          {visiblePages.length > 0 ? (
            <CommandGroup heading="Pages">
              {visiblePages.map((item) => (
                <CommandItem key={item.href} value={item.href} onSelect={() => go(item.href)}>
                  <item.icon />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
