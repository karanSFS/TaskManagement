import Link from "next/link"
import { Suspense } from "react"
import { CircleDot } from "lucide-react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterDrawer, FilterField, filterFieldClass } from "@/components/shared/filter-drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LinkPending } from "@/components/shared/pending-ui"
import { ListSkeleton } from "@/components/shared/page-skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { formatProjectDate, issueKey } from "@/lib/projects/format"
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

const fieldClass = filterFieldClass

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
      <div className="flex flex-wrap items-center gap-2">
        <FilterDrawer action="/issues" title="Filter issues" activeCount={[query, projectId, statusId, priorityId, typeId, assignee !== "all" ? assignee : "", sort !== "updated" ? sort : "", ascending ? "asc" : ""].filter(Boolean).length}>
          <FilterField label="Search">
            <input name="q" defaultValue={query} placeholder="Title, key, or label" className={fieldClass} />
          </FilterField>
          <FilterField label="Project">
            <select name="projectId" defaultValue={projectId ?? ""} className={fieldClass}>
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Status">
            <select name="statusId" defaultValue={statusId ?? ""} className={fieldClass}>
              <option value="">Any status</option>
              {catalog.statuses.map((status) => (
                <option key={status.id} value={status.id}>{status.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Priority">
            <select name="priorityId" defaultValue={priorityId ?? ""} className={fieldClass}>
              <option value="">Any priority</option>
              {catalog.priorities.map((priority) => (
                <option key={priority.id} value={priority.id}>{priority.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Type">
            <select name="typeId" defaultValue={typeId ?? ""} className={fieldClass}>
              <option value="">Any type</option>
              {catalog.types.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Assignee">
            <select name="assignee" defaultValue={assignee} className={fieldClass}>
              <option value="all">Anyone</option>
              <option value="me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </FilterField>
          <FilterField label="Sort">
            <select name="sort" defaultValue={sort} className={fieldClass}>
              <option value="updated">Updated</option>
              <option value="created">Created</option>
              <option value="title">Title</option>
              <option value="priority">Priority</option>
              <option value="key">Key</option>
            </select>
          </FilterField>
          <FilterField label="Direction">
            <select name="dir" defaultValue={ascending ? "asc" : "desc"} className={fieldClass}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </FilterField>
        </FilterDrawer>
        {filtered ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/issues">Clear</Link>
          </Button>
        ) : null}
      </div>
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
        <div className="min-w-0 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Assignee</th>
                <th className="px-3 py-2 font-medium">Reporter</th>
                <th className="px-3 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((issue) => (
                <tr key={issue.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-2 align-middle">
                    <Link href={`/issues/${issue.id}`} className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:underline">
                      <LinkPending />
                      {issueKey(issue.projectKey, issue.number)}
                    </Link>
                  </td>
                  <td className="max-w-64 px-3 py-2 align-middle">
                    <IssueOpenButton issueId={issue.id} className="block max-w-full truncate text-left">
                      {issue.title}
                    </IssueOpenButton>
                  </td>
                  <td className="px-3 py-2 align-middle text-muted-foreground">{issue.typeName}</td>
                  <td className="px-3 py-2 align-middle"><Badge variant="secondary">{issue.status}</Badge></td>
                  <td className="px-3 py-2 align-middle"><Badge variant="outline">{issue.priority}</Badge></td>
                  <td className="max-w-32 truncate px-3 py-2 align-middle">{issue.assigneeName ?? "Unassigned"}</td>
                  <td className="max-w-32 truncate px-3 py-2 align-middle">{issue.reporterName}</td>
                  <td className="whitespace-nowrap px-3 py-2 align-middle text-muted-foreground">{formatProjectDate(issue.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
