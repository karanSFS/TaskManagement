"use client"

import { useEffect, useRef, useState } from "react"
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
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const requestId = useRef(0)
  const pages = [...mainNav, ...utilityNav]
  const needle = query.trim().toLowerCase()
  const visiblePages = pages.filter((item) => {
    if (!needle) return true
    return `${item.title} ${item.description}`.toLowerCase().includes(needle)
  })

  useEffect(() => {
    if (!open || query.trim().length < 2) return
    const request = requestId.current
    const handle = window.setTimeout(() => {
      void searchIssues(query).then((result) => {
        if (request !== requestId.current) return
        if (result.error) {
          setIssues([])
          setStatus("error")
          return
        }
        setIssues(result.issues)
        setStatus("idle")
      })
    }, 250)
    return () => window.clearTimeout(handle)
  }, [open, query])

  function onQueryChange(value: string) {
    setQuery(value)
    requestId.current += 1
    if (value.trim().length < 2) {
      setIssues([])
      setStatus("idle")
      return
    }
    setIssues([])
    setStatus("loading")
  }

  function close() {
    requestId.current += 1
    setQuery("")
    setIssues([])
    setStatus("idle")
    onOpenChange(false)
  }

  function go(href: string) {
    close()
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Search FixTask"
      description="Search issues by key, title, or label, or jump to a page."
    >
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search issues or pages…" value={query} onValueChange={onQueryChange} />
        <CommandList>
          {status === "loading" || status === "error" ? null : <CommandEmpty>No matching pages or issues.</CommandEmpty>}
          {status === "loading" ? (
            <p className={visiblePages.length > 0 ? "px-2 py-1.5 text-xs text-muted-foreground" : "px-2 py-6 text-center text-sm text-muted-foreground"}>
              Searching…
            </p>
          ) : null}
          {status === "error" ? (
            <p className="px-2 py-6 text-center text-sm text-destructive" role="alert">
              Search failed. Try again.
            </p>
          ) : null}
          {issues.length > 0 ? (
            <CommandGroup heading="Issues">
              {issues.map((issue) => (
                <CommandItem
                  key={issue.id}
                  value={issue.id}
                  onSelect={() => {
                    close()
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
