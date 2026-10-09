"use client"

import Link from "next/link"
import { useState, type FormEvent, type MouseEvent, type ReactNode } from "react"
import { Archive, FolderKanban, FolderOpen, ListTodo, Loader2 } from "lucide-react"

import { CreateProjectButton } from "@/components/projects/create-project-dialog"
import { FilterDrawer, FilterField, filterFieldClass } from "@/components/shared/filter-drawer"
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

const fieldClass = filterFieldClass

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
          const className = `overflow-hidden rounded-xl border bg-card shadow-sm transition-colors duration-200 ${active ? "border-primary" : "hover:border-primary/30"}`
          const body = (
            <>
              <span className={`block h-1 ${summaryTone(card.id)}`} />
              <span className="flex items-start justify-between gap-2 px-3 pt-3 text-muted-foreground">
                <span className="text-xs font-medium">{card.label}</span>
                {waiting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <SummaryIcon icon={card.id} />}
              </span>
              <span className="block px-3 pt-2 text-2xl font-semibold tracking-tight tabular-nums">{card.value}</span>
              <span className="block px-3 pt-1 pb-3 text-xs text-muted-foreground">{card.hint}</span>
            </>
          )
          if (!card.href) {
            return (
              <div key={card.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                {body}
              </div>
            )
          }
          return (
            <Link
              key={card.id}
              href={card.href}
              scroll={card.id === "issues"}
              aria-current={active ? "page" : undefined}
              aria-busy={waiting}
              onClick={(event) => {
                if (card.id === "issues") return
                select(card.id, event)
              }}
              className={className}
            >
              {body}
            </Link>
          )
        })}
      </div>
      <div className={loading ? "pointer-events-none flex flex-wrap items-center gap-2 opacity-60" : "flex flex-wrap items-center gap-2"}>
        <FilterDrawer action="/projects" title="Filter projects" activeCount={[query, sort !== "name" ? sort : "", dir === "desc" ? dir : ""].filter(Boolean).length} onSubmit={apply}>
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <FilterField label="Search">
            <input name="q" defaultValue={query} placeholder="Name, key, or lead" className={fieldClass} />
          </FilterField>
          <FilterField label="Sort">
            <select name="sort" defaultValue={sort} className={fieldClass}>
              <option value="name">Name</option>
              <option value="key">Key</option>
              <option value="issues">Open issues</option>
              <option value="members">Members</option>
            </select>
          </FilterField>
          <FilterField label="Direction">
            <select name="dir" defaultValue={dir} className={fieldClass}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </FilterField>
        </FilterDrawer>
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
      </div>
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
      <div className="grid gap-3 p-3 md:grid-cols-2">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    </div>
  )
}

function summaryTone(id: ProjectSummaryCard["id"]) {
  if (id === "active") return "bg-primary"
  if (id === "archived") return "bg-muted-foreground/40"
  if (id === "issues") return "bg-info"
  return "bg-chart-2"
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
