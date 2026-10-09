import Link from "next/link"
import { Suspense } from "react"
import { FolderKanban, SearchX } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ArchiveProjectButton } from "@/components/projects/archive-project-button"
import { CreateProjectButton, EditProjectButton } from "@/components/projects/create-project-dialog"
import { ProjectBrowser } from "@/components/projects/project-browser"
import { ProjectIcon } from "@/components/projects/project-icon"
import { EmptyState } from "@/components/shared/empty-state"
import { LinkPending } from "@/components/shared/pending-ui"
import { ProjectsSkeleton } from "@/components/shared/page-skeleton"
import { projectAccent } from "@/components/shared/priority-mark"
import { PersonStack, ProgressMeter } from "@/components/shared/visual"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { roleLabel } from "@/lib/projects/format"
import { isProjectIcon } from "@/lib/projects/icons"
import { getProjects, type ProjectSummary } from "@/lib/services/project.service"

export const metadata = { title: "Projects" }

type ProjectSearch = {
  q?: string
  status?: string
  sort?: string
  dir?: string
}

const statuses = ["all", "active", "archived"] as const
const sorts = ["name", "key", "issues", "members"] as const

type ProjectStatus = (typeof statuses)[number]
type ProjectSort = (typeof sorts)[number]

export default function ProjectsPage({ searchParams }: { searchParams: Promise<ProjectSearch> }) {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Projects"
        description="Workspaces you belong to. Each project has its own key and issue numbers."
      />
      <Suspense fallback={<ProjectsSkeleton />}>
        <ProjectWorkspace searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function ProjectWorkspace({ searchParams }: { searchParams: Promise<ProjectSearch> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const projects = await getProjects(user.id)
  const status = statuses.find((item) => item === params.status) ?? "all"
  const sort = sorts.find((item) => item === params.sort) ?? "name"
  const descending = params.dir === "desc"
  const query = params.q?.trim() ?? ""
  const active = projects.filter((project) => !project.archivedAt)
  const archived = projects.filter((project) => project.archivedAt)
  const openIssues = projects.reduce((total, project) => total + project.openIssueCount, 0)
  const needle = query.toLowerCase()
  const visible = projects
    .filter((project) => {
      if (status === "active" && project.archivedAt) return false
      if (status === "archived" && !project.archivedAt) return false
      if (!needle) return true
      return `${project.name} ${project.key} ${project.description} ${project.leadName}`.toLowerCase().includes(needle)
    })
    .sort((a, b) => compareProjects(a, b, sort, descending))

  const filters = { q: query, status, sort, dir: descending ? "desc" : "asc" }
  const filtered = Boolean(query || status !== "all" || sort !== "name" || descending)

  return (
    <ProjectBrowser
      signature={`${status}|${query}|${sort}|${filters.dir}`}
      status={status}
      query={query}
      sort={sort}
      dir={filters.dir}
      filtered={filtered}
      takenKeys={projects.map((project) => project.key)}
      cards={[
        { id: "all", href: projectsHref({ ...filters, status: "all" }), label: "Total projects", value: projects.length, hint: "Workspaces you belong to" },
        { id: "active", href: projectsHref({ ...filters, status: "active" }), label: "Active projects", value: active.length, hint: "Open for new issues" },
        { id: "archived", href: projectsHref({ ...filters, status: "archived" }), label: "Archived projects", value: archived.length, hint: "Read only until restored" },
        { id: "issues", href: "/issues", label: "Open issues", value: openIssues, hint: "Not done, in your projects" },
      ]}
    >
      <p className="text-xs text-muted-foreground" role="status">
        {visible.length === 0 ? "No matching projects" : `${visible.length} ${visible.length === 1 ? "project" : "projects"}`}
      </p>
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to give the work a name, a key, and a place for members."
          action={<CreateProjectButton size="sm">Create project</CreateProjectButton>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching projects"
          description="Nothing matches this search or status. Clear the filters to see every workspace."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/projects">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-2 xl:grid-cols-2">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} userId={user.id} />
          ))}
        </ul>
      )}
    </ProjectBrowser>
  )
}

function ProjectCard({ project, userId }: { project: ProjectSummary; userId: string }) {
  const canEdit = project.role === "owner" || project.role === "admin" || project.leadId === userId
  const leadId = project.leadId && project.roster.some((member) => member.id === project.leadId) ? project.leadId : project.roster[0]?.id
  const accent = projectAccent(project.key)

  return (
    <li className="relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className={`h-1 ${accent.bar}`} />
      <Link href={`/projects/${project.id}`} className="absolute inset-0 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={`Open ${project.name}`}>
        <LinkPending className="absolute top-4 right-3 size-4" />
      </Link>
      <div className="pointer-events-none flex items-start gap-3 px-3 py-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${accent.wash} ${accent.text}`}>
          <ProjectIcon name={project.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <Badge variant="outline">{project.key}</Badge>
            {project.archivedAt ? <Badge variant="secondary">Archived</Badge> : <Badge variant="outline">Active</Badge>}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.description || "No description"}</p>
          <div className="mt-2">
            <ProgressMeter done={project.doneIssueCount} open={project.openIssueCount} barClass={accent.bar} />
          </div>
          <p className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Lead {project.leadName} · {roleLabel(project.role)}</span>
            <PersonStack people={project.roster} total={project.memberCount} />
          </p>
        </div>
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-2 border-t px-3 py-2">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/projects/${project.id}`}>
            <LinkPending />
            Open
          </Link>
        </Button>
        {canEdit && leadId ? (
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
        {canEdit ? <ArchiveProjectButton projectId={project.id} archived={Boolean(project.archivedAt)} compact /> : null}
      </div>
    </li>
  )
}

function compareProjects(a: ProjectSummary, b: ProjectSummary, sort: ProjectSort, descending: boolean) {
  const direction = descending ? -1 : 1
  if (sort === "key") return a.key.localeCompare(b.key) * direction
  if (sort === "issues") return (a.openIssueCount - b.openIssueCount) * direction
  if (sort === "members") return (a.memberCount - b.memberCount) * direction
  return a.name.localeCompare(b.name) * direction
}

function projectsHref(filters: { q?: string; status?: ProjectStatus; sort?: ProjectSort; dir?: string }) {
  const params = new URLSearchParams()
  if (filters.status && filters.status !== "all") params.set("status", filters.status)
  if (filters.q) params.set("q", filters.q)
  if (filters.sort && filters.sort !== "name") params.set("sort", filters.sort)
  if (filters.dir === "desc") params.set("dir", "desc")
  const query = params.toString()
  return query ? `/projects?${query}` : "/projects"
}
