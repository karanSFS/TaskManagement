import Form from "next/form"
import Link from "next/link"
import { Suspense } from "react"
import { FolderKanban, Search, SearchX } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ArchiveProjectButton } from "@/components/projects/archive-project-button"
import { CreateProjectButton, EditProjectButton } from "@/components/projects/create-project-dialog"
import { ProjectIcon } from "@/components/projects/project-icon"
import { EmptyState } from "@/components/shared/empty-state"
import { filterFieldClass } from "@/components/shared/field-styles"
import { ProjectsSkeleton } from "@/components/shared/page-skeleton"
import { projectAccent } from "@/components/shared/priority-mark"
import { PersonStack, ProgressMeter } from "@/components/shared/visual"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { projectHref } from "@/lib/config/nav"
import { roleLabel } from "@/lib/projects/format"
import { isProjectIcon } from "@/lib/projects/icons"
import { getProjects, type ProjectSummary } from "@/lib/services/project.service"
import { cn } from "@/lib/utils"

export const metadata = { title: "Projects" }

type ProjectSearch = {
  q?: string
  status?: string
  sort?: string
}

const statuses = ["active", "archived", "all"] as const
const sorts = ["name", "issues", "members"] as const

type ProjectStatus = (typeof statuses)[number]
type ProjectSort = (typeof sorts)[number]

export default function ProjectsPage({ searchParams }: { searchParams: Promise<ProjectSearch> }) {
  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectWorkspace searchParams={searchParams} />
    </Suspense>
  )
}

async function ProjectWorkspace({ searchParams }: { searchParams: Promise<ProjectSearch> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const projects = await getProjects(user.id)
  const active = projects.filter((project) => !project.archivedAt)
  const archived = projects.filter((project) => project.archivedAt)
  const fallbackStatus: ProjectStatus = active.length === 0 && archived.length > 0 ? "archived" : "active"
  const status = statuses.find((item) => item === params.status) ?? fallbackStatus
  const sort = sorts.find((item) => item === params.sort) ?? "name"
  const query = params.q?.trim() ?? ""
  const needle = query.toLowerCase()
  const pool = status === "active" ? active : status === "archived" ? archived : projects
  const visible = pool
    .filter((project) => !needle || `${project.name} ${project.key} ${project.description} ${project.leadName}`.toLowerCase().includes(needle))
    .sort((a, b) => compareProjects(a, b, sort))
  const tabs: { id: ProjectStatus; label: string; count: number }[] = [
    { id: "active", label: "Active", count: active.length },
    { id: "archived", label: "Archived", count: archived.length },
    { id: "all", label: "All", count: projects.length },
  ]

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Projects"
        description="Every project has its own board, backlog, sprints, and members."
        actions={<CreateProjectButton takenKeys={projects.map((project) => project.key)} />}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to give the work a name, a key, and a place for your team."
          action={<CreateProjectButton size="sm">Create project</CreateProjectButton>}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav aria-label="Project status" className="flex rounded-lg border bg-muted/40 p-0.5">
              {tabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={projectsHref({ status: tab.id, q: query, sort })}
                  aria-current={tab.id === status ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm transition-colors",
                    tab.id === status ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label} <span className="text-muted-foreground tabular-nums">{tab.count}</span>
                </Link>
              ))}
            </nav>
            <Form action="/projects" replace className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
              <input type="hidden" name="status" value={status} />
              <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                <span className="sr-only">Search projects</span>
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input name="q" defaultValue={query} placeholder="Search name, key, or lead" className={cn(filterFieldClass, "pl-8")} />
              </label>
              <label className="shrink-0">
                <span className="sr-only">Sort</span>
                <select name="sort" defaultValue={sort} className={cn(filterFieldClass, "w-auto")}>
                  <option value="name">Name</option>
                  <option value="issues">Most open issues</option>
                  <option value="members">Most members</option>
                </select>
              </label>
              <Button type="submit" size="sm" variant="outline">Apply</Button>
            </Form>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={query ? "No matching projects" : status === "archived" ? "No archived projects" : "No active projects"}
              description={query ? "Try a different search." : status === "active" ? "Restore an archived project or create a new one." : "Archived projects show up here."}
              action={
                query ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={projectsHref({ status, sort })}>Clear search</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {visible.map((project) => (
                <ProjectRow key={project.id} project={project} userId={user.id} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function ProjectRow({ project, userId }: { project: ProjectSummary; userId: string }) {
  const manager = project.role === "owner" || project.role === "admin"
  const canEdit = manager || project.leadId === userId
  const leadId = project.leadId && project.roster.some((member) => member.id === project.leadId) ? project.leadId : project.roster[0]?.id
  const accent = projectAccent(project.key)
  const archived = Boolean(project.archivedAt)

  return (
    <li className="grid min-w-0 gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_11rem_9rem_auto] md:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${accent.wash} ${accent.text}`}>
          <ProjectIcon name={project.icon} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Link href={projectHref(project.id, archived ? "" : "board")} className="truncate text-sm font-medium hover:underline">
              {project.name}
            </Link>
            <span className="font-mono text-[11px] text-muted-foreground [overflow-wrap:anywhere]">{project.key}</span>
            {archived ? <Badge variant="secondary">Archived</Badge> : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.description || "No description"}</p>
        </div>
      </div>
      <ProgressMeter done={project.doneIssueCount} open={project.openIssueCount} barClass={accent.bar} />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground md:block">
        <p className="truncate">Lead: {project.leadName}</p>
        <div className="flex items-center gap-2 md:mt-1">
          <PersonStack people={project.roster} total={project.memberCount} />
          <span>{roleLabel(project.role)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {canEdit && leadId && !archived ? (
          <EditProjectButton
            label="Edit"
            projectId={project.id}
            members={project.roster}
            defaultValues={{
              name: project.name,
              key: project.key,
              description: project.description,
              icon: project.icon && isProjectIcon(project.icon) ? project.icon : "",
              leadId,
            }}
          />
        ) : null}
        {manager ? <ArchiveProjectButton projectId={project.id} archived={archived} compact /> : null}
      </div>
    </li>
  )
}

function compareProjects(a: ProjectSummary, b: ProjectSummary, sort: ProjectSort) {
  if (sort === "issues") return b.openIssueCount - a.openIssueCount || a.name.localeCompare(b.name)
  if (sort === "members") return b.memberCount - a.memberCount || a.name.localeCompare(b.name)
  return a.name.localeCompare(b.name)
}

function projectsHref(filters: { q?: string; status?: ProjectStatus; sort?: ProjectSort }) {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.q) params.set("q", filters.q)
  if (filters.sort && filters.sort !== "name") params.set("sort", filters.sort)
  const query = params.toString()
  return query ? `/projects?${query}` : "/projects"
}
