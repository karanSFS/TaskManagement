"use client"

import Link from "next/link"
import { useState, type FormEvent, type MouseEvent, type ReactNode } from "react"
import { Archive, FolderKanban, FolderOpen, ListTodo, Loader2 } from "lucide-react"

import { CreateProjectButton } from "@/components/projects/create-project-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export type ProjectCardFilter = "all" | "active" | "archived"

export type ProjectSummaryCard = {
  id: ProjectCardFilter | "issues"
  href?: string
  label: string
  hint: string
  value: number
}

const fieldClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export function ProjectBrowser({
  signature,
  status,
  query,
  sort,
  dir,
  filtered,
  takenKeys,
  cards,
  children,
}: {
  signature: string
  status: ProjectCardFilter
  query: string
  sort: string
  dir: string
  filtered: boolean
  takenKeys: string[]
  cards: ProjectSummaryCard[]
  children: ReactNode
}) {
  const [chosen, setChosen] = useState<ProjectCardFilter | null>(null)
  const [wait, setWait] = useState<string | null>(null)
  if (chosen === status) setChosen(null)
  if (wait !== null && wait !== signature) setWait(null)
  const switching = chosen !== null && chosen !== status
  const loading = switching || wait !== null
  const shown = chosen ?? status

  function select(id: ProjectCardFilter, event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    if (id === shown) {
      event.preventDefault()
      return
    }
    setChosen(id)
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget)
    const nextStatus = String(data.get("status") ?? "all")
    const nextQuery = String(data.get("q") ?? "").trim()
    const nextSort = String(data.get("sort") ?? "name")
    const nextDir = String(data.get("dir") ?? "asc")
    const next = `${nextStatus}|${nextQuery}|${nextSort}|${nextDir}`
    if (next === signature) return
    setWait(signature)
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const active = card.id === shown
          const waiting = switching && card.id === shown
          const className = active
            ? "flex h-14 items-center gap-2.5 rounded-lg border border-primary bg-primary/5 px-3"
            : "flex h-14 items-center gap-2.5 rounded-lg border bg-card px-3 hover:bg-muted/40"
          const body = (
            <>
              <span
                className={
                  active
                    ? "flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                    : "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                }
              >
                {waiting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <SummaryIcon icon={card.id} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium leading-4">{card.label}</span>
                <span className="mt-0.5 block truncate text-xs leading-4 text-muted-foreground">{card.hint}</span>
              </span>
              <span className="shrink-0 font-mono text-base font-semibold leading-none tabular-nums">{card.value}</span>
            </>
          )
          if (!card.href) {
            return (
              <div key={card.id} className="flex h-14 items-center gap-2.5 rounded-lg border bg-card px-3">
                {body}
              </div>
            )
          }
          return (
            <Link
              key={card.id}
              href={card.href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              aria-busy={waiting}
              onClick={(event) => select(card.id as ProjectCardFilter, event)}
              className={className}
            >
              {body}
            </Link>
          )
        })}
      </div>
      <form action="/projects" onSubmit={apply} className={loading ? "pointer-events-none flex flex-wrap items-center gap-2 opacity-60" : "flex flex-wrap items-center gap-2"}>
        {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
        <input name="q" defaultValue={query} placeholder="Search name, key, or lead" aria-label="Search projects" className={`${fieldClass} w-full sm:w-64`} />
        <select name="sort" defaultValue={sort} aria-label="Sort" className={fieldClass}>
          <option value="name">Name</option>
          <option value="key">Key</option>
          <option value="issues">Open issues</option>
          <option value="members">Members</option>
        </select>
        <select name="dir" defaultValue={dir} aria-label="Sort direction" className={fieldClass}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Apply
        </Button>
        {filtered ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects" onClick={() => setWait(signature)}>
              Clear
            </Link>
          </Button>
        ) : null}
        <div className="sm:ml-auto">
          <CreateProjectButton takenKeys={takenKeys} />
        </div>
      </form>
      {loading ? <ProjectListSkeleton /> : children}
    </div>
  )
}

function ProjectListSkeleton() {
  return (
    <div className="rounded-lg border bg-card" role="status" aria-live="polite">
      <p className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Loading projects
      </p>
      <div className="grid gap-2 p-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

function SummaryIcon({ icon }: { icon: ProjectSummaryCard["id"] }) {
  const className = "size-3.5"
  switch (icon) {
    case "all":
      return <FolderKanban className={className} aria-hidden />
    case "active":
      return <FolderOpen className={className} aria-hidden />
    case "archived":
      return <Archive className={className} aria-hidden />
    case "issues":
      return <ListTodo className={className} aria-hidden />
  }
}
