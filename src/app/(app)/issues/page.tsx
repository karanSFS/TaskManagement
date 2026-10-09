import Link from "next/link"
import { Suspense } from "react"
import { CircleDot } from "lucide-react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/shared/page-skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { issueKey } from "@/lib/projects/format"
import { getIssueCatalog, listIssueProjects, listIssues } from "@/lib/services/issue.service"
import { boardAssignees, issueSorts } from "@/lib/validations/issue"

export const metadata = { title: "Issues" }

type IssueSearch = {
  q?: string
  page?: string
  projectId?: string
  statusId?: string
  priorityId?: string
  typeId?: string
  assignee?: string
  sort?: string
  dir?: string
}

const fieldClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export default function IssuesPage({ searchParams }: { searchParams: Promise<IssueSearch> }) {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Issues"
        description="Search by title, key, or label. Filters run in the database."
        actions={
          <CreateIssueButton>New issue</CreateIssueButton>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <IssueList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function IssueList({ searchParams }: { searchParams: Promise<IssueSearch> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const [projects, catalog] = await Promise.all([listIssueProjects(user.id), getIssueCatalog()])
  const query = params.q?.trim() ?? ""
  const page = Number(params.page ?? "1")
  const projectId = projects.some((project) => project.id === params.projectId) ? params.projectId : undefined
  const statusId = catalog.statuses.some((status) => status.id === params.statusId) ? params.statusId : undefined
  const priorityId = catalog.priorities.some((priority) => priority.id === params.priorityId) ? params.priorityId : undefined
  const typeId = catalog.types.some((type) => type.id === params.typeId) ? params.typeId : undefined
  const assignee = boardAssignees.find((value) => value === params.assignee) ?? "all"
  const sort = issueSorts.find((value) => value === params.sort) ?? "updated"
  const ascending = params.dir === "asc"
  const result = await listIssues(user.id, page, { query, projectId, statusId, priorityId, typeId, assignee, sort, ascending })
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const filtered = Boolean(query || projectId || statusId || priorityId || typeId || assignee !== "all" || sort !== "updated" || ascending)

  const filters = { q: query, projectId, statusId, priorityId, typeId, assignee, sort, dir: ascending ? "asc" : "desc" }

  return (
    <div className="grid gap-3">
      <form action="/issues" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={query} placeholder="Title, key, or label" aria-label="Search issues" className={`${fieldClass} w-full max-w-xs`} />
        <select name="projectId" defaultValue={projectId ?? ""} className={fieldClass} aria-label="Project">
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select name="statusId" defaultValue={statusId ?? ""} className={fieldClass} aria-label="Status">
          <option value="">Any status</option>
          {catalog.statuses.map((status) => (
            <option key={status.id} value={status.id}>{status.name}</option>
          ))}
        </select>
        <select name="priorityId" defaultValue={priorityId ?? ""} className={fieldClass} aria-label="Priority">
          <option value="">Any priority</option>
          {catalog.priorities.map((priority) => (
            <option key={priority.id} value={priority.id}>{priority.name}</option>
          ))}
        </select>
        <select name="typeId" defaultValue={typeId ?? ""} className={fieldClass} aria-label="Type">
          <option value="">Any type</option>
          {catalog.types.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
        <select name="assignee" defaultValue={assignee} className={fieldClass} aria-label="Assignee">
          <option value="all">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <select name="sort" defaultValue={sort} className={fieldClass} aria-label="Sort">
          <option value="updated">Updated</option>
          <option value="created">Created</option>
          <option value="title">Title</option>
          <option value="priority">Priority</option>
          <option value="key">Key</option>
        </select>
        <select name="dir" defaultValue={ascending ? "asc" : "desc"} className={fieldClass} aria-label="Direction">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Apply</Button>
        {filtered ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/issues">Clear</Link>
          </Button>
        ) : null}
      </form>
      <p className="text-xs text-muted-foreground">
        {result.total} {result.total === 1 ? "issue" : "issues"}
      </p>
      {result.items.length === 0 ? (
        <EmptyState
          icon={CircleDot}
          title={filtered ? "No matching issues" : "No issues yet"}
          description={filtered ? "No issues match these filters." : "Create an issue to start tracking work."}
          action={
            filtered ? undefined : (
              <CreateIssueButton size="sm">New issue</CreateIssueButton>
            )
          }
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {result.items.map((issue) => (
            <li key={issue.id}>
              <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                <Link href={`/issues/${issue.id}`} className="w-24 shrink-0 text-sm font-medium text-muted-foreground hover:underline">
                  {issueKey(issue.projectKey, issue.number)}
                </Link>
                <IssueOpenButton issueId={issue.id} className="min-w-0 flex-1 truncate text-left text-sm">
                  {issue.title}
                </IssueOpenButton>
                <span className="hidden text-xs text-muted-foreground lg:inline">{issue.priority}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{issue.status}</span>
                <span className="hidden w-28 truncate text-right text-xs text-muted-foreground md:inline">
                  {issue.assigneeName ?? "Unassigned"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 ? (
        <div className="flex items-center gap-2 text-sm">
          {result.page > 1 ? <Link href={issueHref(filters, result.page - 1)} className="underline">Previous</Link> : null}
          <span className="text-muted-foreground">Page {result.page} of {pages}</span>
          {result.page < pages ? <Link href={issueHref(filters, result.page + 1)} className="underline">Next</Link> : null}
        </div>
      ) : null}
    </div>
  )
}

function issueHref(
  filters: { q: string; projectId?: string; statusId?: string; priorityId?: string; typeId?: string; assignee: string; sort: string; dir: string },
  page: number,
) {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.projectId) params.set("projectId", filters.projectId)
  if (filters.statusId) params.set("statusId", filters.statusId)
  if (filters.priorityId) params.set("priorityId", filters.priorityId)
  if (filters.typeId) params.set("typeId", filters.typeId)
  if (filters.assignee !== "all") params.set("assignee", filters.assignee)
  if (filters.sort !== "updated") params.set("sort", filters.sort)
  if (filters.dir === "asc") params.set("dir", "asc")
  if (page > 1) params.set("page", String(page))
  const search = params.toString()
  return search ? `/issues?${search}` : "/issues"
}
