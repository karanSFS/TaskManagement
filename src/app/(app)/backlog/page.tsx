import Link from "next/link"
import { Suspense } from "react"
import { SquareKanban } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterDrawer, FilterField, filterFieldClass } from "@/components/shared/filter-drawer"
import { BacklogList } from "@/components/sprints/sprint-lists"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/shared/page-skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { listIssueProjects } from "@/lib/services/issue.service"
import { getSprintWorkspace } from "@/lib/services/sprint.service"
import { filterBacklog, type BacklogSort, type BacklogStatus } from "@/lib/sprints/backlog"

export const metadata = { title: "Backlog" }

const fieldClass = filterFieldClass

type BacklogSearch = { projectId?: string; q?: string; status?: string; sort?: string; dir?: string }

export default function BacklogPage({ searchParams }: { searchParams: Promise<BacklogSearch> }) {
  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader title="Backlog" description="Issues that are not in a sprint. Open work is shown first." />
      <Suspense fallback={<ListSkeleton />}>
        <BacklogContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function BacklogContent({ searchParams }: { searchParams: Promise<BacklogSearch> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const projects = await listIssueProjects(user.id)
  if (projects.length === 0) {
    return (
      <EmptyState icon={SquareKanban} title="No projects yet" description="Create a project before ordering the backlog." />
    )
  }

  const project = projects.find((item) => item.id === params.projectId) ?? projects[0]
  const workspace = await getSprintWorkspace(user.id, project.id)
  if (!workspace) return <p className="text-sm text-muted-foreground">That project could not be loaded.</p>

  const query = params.q?.trim() ?? ""
  const status: BacklogStatus = params.status === "done" || params.status === "all" ? params.status : "open"
  const sort: BacklogSort = params.sort === "title" || params.sort === "key" || params.sort === "priority" ? params.sort : "updated"
  const direction = params.dir === "asc" ? "asc" : "desc"
  const issues = filterBacklog(workspace.backlog, workspace.projectKey, { query, status, sort, direction })
  const openCount = workspace.backlog.filter((issue) => !issue.done).length
  const doneCount = workspace.backlog.filter((issue) => issue.done).length
  const openSprints = workspace.sprints
    .filter((sprint) => sprint.status !== "completed")
    .map((sprint) => ({ id: sprint.id, name: sprint.name }))
  const activeFilters = [query, status !== "open" ? status : "", sort !== "updated" ? sort : "", direction !== "desc" ? direction : ""].filter(Boolean).length

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterDrawer action="/backlog" title="Filter the backlog" activeCount={activeFilters}>
          <FilterField label="Project">
            <select name="projectId" defaultValue={workspace.projectId} className={fieldClass}>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Search">
            <input name="q" defaultValue={query} placeholder="Title, key, or assignee" className={fieldClass} />
          </FilterField>
          <FilterField label="Status">
            <select name="status" defaultValue={status} className={fieldClass}>
              <option value="open">Open</option>
              <option value="done">Done</option>
              <option value="all">Open and done</option>
            </select>
          </FilterField>
          <FilterField label="Sort">
            <select name="sort" defaultValue={sort} className={fieldClass}>
              <option value="updated">Updated</option>
              <option value="priority">Priority</option>
              <option value="key">Key</option>
              <option value="title">Title</option>
            </select>
          </FilterField>
          <FilterField label="Direction">
            <select name="dir" defaultValue={direction} className={fieldClass}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </FilterField>
        </FilterDrawer>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/sprints?projectId=${workspace.projectId}`}>Sprints</Link>
        </Button>
        <p className="text-sm font-medium">{workspace.projectName} <span className="font-mono text-xs font-normal text-muted-foreground">{workspace.projectKey}</span></p>
        <p className="text-xs text-muted-foreground">{openCount} open · {doneCount} done</p>
      </div>
      {workspace.truncated ? (
        <p className="text-xs text-muted-foreground">Showing the latest 200 issues that are not in a sprint.</p>
      ) : null}
      {issues.length === 0 ? (
        <BacklogEmpty
          projectId={workspace.projectId}
          status={status}
          query={query}
          openCount={openCount}
          doneCount={doneCount}
        />
      ) : (
        <BacklogList projectId={workspace.projectId} projectKey={workspace.projectKey} issues={issues} sprints={openSprints} />
      )}
    </div>
  )
}

function BacklogEmpty({
  projectId,
  status,
  query,
  openCount,
  doneCount,
}: {
  projectId: string
  status: BacklogStatus
  query: string
  openCount: number
  doneCount: number
}) {
  if (!query && status === "open" && openCount === 0 && doneCount > 0) {
    return (
      <EmptyState
        icon={SquareKanban}
        title="No open backlog issues"
        description={`${doneCount} done ${doneCount === 1 ? "issue is" : "issues are"} not in a sprint.`}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={`/backlog?projectId=${projectId}&status=done`}>Show done issues</Link>
          </Button>
        }
      />
    )
  }

  if (openCount + doneCount === 0) {
    return (
      <EmptyState icon={SquareKanban} title="The backlog is empty" description="Issues that are not in a sprint will show up here." />
    )
  }

  return (
    <EmptyState icon={SquareKanban} title="No matching issues" description="Try a different search, status, or project." />
  )
}
