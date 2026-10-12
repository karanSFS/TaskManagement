import Form from "next/form"
import Link from "next/link"
import { CircleDot, Search } from "lucide-react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { IssueList, IssueListRow } from "@/components/issues/issue-list"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterDrawer, FilterField } from "@/components/shared/filter-drawer"
import { filterFieldClass } from "@/components/shared/field-styles"
import { SegmentedLinks } from "@/components/shared/segmented-links"
import { Button } from "@/components/ui/button"
import { PriorityMark } from "@/components/shared/priority-mark"
import { StatusChip, priorityEdge } from "@/components/shared/visual"
import { getCurrentUser } from "@/lib/auth/session"
import { formatProjectDate, issueKey } from "@/lib/projects/format"
import { getIssueCatalog, listIssueProjects, listIssues } from "@/lib/services/issue.service"
import { boardAssignees, issueSorts } from "@/lib/validations/issue"

export type IssueSearch = {
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

export async function IssuesView({
  searchParams,
  basePath,
  scopeProjectId,
}: {
  searchParams: Promise<IssueSearch>
  basePath: string
  scopeProjectId?: string
}) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const [projects, catalog] = await Promise.all([listIssueProjects(user.id), getIssueCatalog()])
  const query = params.q?.trim() ?? ""
  const page = Number(params.page ?? "1")
  const projectId = scopeProjectId ?? (projects.some((project) => project.id === params.projectId) ? params.projectId : undefined)
  const statusId = catalog.statuses.some((status) => status.id === params.statusId) ? params.statusId : undefined
  const priorityId = catalog.priorities.some((priority) => priority.id === params.priorityId) ? params.priorityId : undefined
  const typeId = catalog.types.some((type) => type.id === params.typeId) ? params.typeId : undefined
  const assignee = boardAssignees.find((value) => value === params.assignee) ?? "all"
  const sort = issueSorts.find((value) => value === params.sort) ?? "updated"
  const ascending = params.dir === "asc"
  const result = await listIssues(user.id, page, { query, projectId, statusId, priorityId, typeId, assignee, sort, ascending })
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const filtered = Boolean(query || (!scopeProjectId && projectId) || statusId || priorityId || typeId || assignee !== "all" || sort !== "updated" || ascending)

  const filters = { q: query, projectId, statusId, priorityId, typeId, assignee, sort, dir: ascending ? "asc" : "desc" }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedLinks
          label="Assignee"
          items={[
            { href: issueHref(basePath, { ...filters, assignee: "all" }, 1), label: "Anyone", active: assignee === "all" },
            { href: issueHref(basePath, { ...filters, assignee: "me" }, 1), label: "Mine", active: assignee === "me" },
            { href: issueHref(basePath, { ...filters, assignee: "unassigned" }, 1), label: "Unassigned", active: assignee === "unassigned" },
          ]}
        />
        <Form action={basePath} replace scroll={false} className="relative min-w-0 flex-1 sm:max-w-64">
          {projectId && !scopeProjectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
          {statusId ? <input type="hidden" name="statusId" value={statusId} /> : null}
          {priorityId ? <input type="hidden" name="priorityId" value={priorityId} /> : null}
          {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
          {assignee !== "all" ? <input type="hidden" name="assignee" value={assignee} /> : null}
          {sort !== "updated" ? <input type="hidden" name="sort" value={sort} /> : null}
          {ascending ? <input type="hidden" name="dir" value="asc" /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={query} aria-label="Search issues" placeholder="Title, key, or label" className={`${fieldClass} h-8 pl-8`} />
        </Form>
        <FilterDrawer action={basePath} title="Filter issues" activeCount={[scopeProjectId ? "" : projectId, statusId, priorityId, typeId, sort !== "updated" ? sort : "", ascending ? "asc" : ""].filter(Boolean).length}>
          {query ? <input type="hidden" name="q" value={query} /> : null}
          {assignee !== "all" ? <input type="hidden" name="assignee" value={assignee} /> : null}
          {scopeProjectId ? null : <FilterField label="Project">
            <select name="projectId" defaultValue={projectId ?? ""} className={fieldClass}>
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </FilterField>}
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
            <Link href={basePath}>Clear</Link>
          </Button>
        ) : null}
      </div>
      {filtered ? (
        <div className="flex flex-wrap gap-1.5">
          {query ? <FilterChip label={`Search: ${query}`} href={issueHref(basePath, { ...filters, q: "" }, 1)} /> : null}
          {projectId && !scopeProjectId ? <FilterChip label={projects.find((project) => project.id === projectId)?.name ?? "Project"} href={issueHref(basePath, { ...filters, projectId: undefined }, 1)} /> : null}
          {statusId ? <FilterChip label={catalog.statuses.find((status) => status.id === statusId)?.name ?? "Status"} href={issueHref(basePath, { ...filters, statusId: undefined }, 1)} /> : null}
          {priorityId ? <FilterChip label={catalog.priorities.find((priority) => priority.id === priorityId)?.name ?? "Priority"} href={issueHref(basePath, { ...filters, priorityId: undefined }, 1)} /> : null}
          {typeId ? <FilterChip label={catalog.types.find((type) => type.id === typeId)?.name ?? "Type"} href={issueHref(basePath, { ...filters, typeId: undefined }, 1)} /> : null}
          {assignee !== "all" ? <FilterChip label={assignee === "me" ? "Assigned to me" : "Unassigned"} href={issueHref(basePath, { ...filters, assignee: "all" }, 1)} /> : null}
        </div>
      ) : null}
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
              <CreateIssueButton projectId={scopeProjectId} size="sm">New issue</CreateIssueButton>
            )
          }
        />
      ) : (
        <IssueList>
          {result.items.map((issue) => (
            <IssueListRow
              key={issue.id}
              id={issue.id}
              issueKey={issueKey(issue.projectKey, issue.number)}
              title={issue.title}
              edge={priorityEdge(issue.priority)}
              meta={
                <>
                  {scopeProjectId ? null : <span className="max-w-40 truncate">{issue.projectName}</span>}
                  <StatusChip name={issue.status} category={catalog.statuses.find((status) => status.name === issue.status)?.category} />
                  <PriorityMark name={issue.priority} />
                  <span>{issue.typeName}</span>
                  <span className="max-w-36 truncate">{issue.assigneeName ?? "Unassigned"}</span>
                  <span className="max-w-36 truncate">Reporter {issue.reporterName}</span>
                  <span>Updated {formatProjectDate(issue.updatedAt)}</span>
                </>
              }
            />
          ))}
        </IssueList>
      )}
      {pages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <p className="mr-auto text-xs text-muted-foreground">Page {result.page} of {pages}</p>
          {result.page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={issueHref(basePath, filters, result.page - 1)}>Previous</Link>
            </Button>
          ) : null}
          {result.page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={issueHref(basePath, filters, result.page + 1)}>Next</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="inline-flex max-w-full items-center rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
      <span className="max-w-48 truncate">{label}</span>
      <span className="ml-1" aria-hidden>×</span>
      <span className="sr-only">Remove filter</span>
    </Link>
  )
}

function issueHref(
  basePath: string,
  filters: { q: string; projectId?: string; statusId?: string; priorityId?: string; typeId?: string; assignee: string; sort: string; dir: string },
  page: number,
) {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.projectId && basePath === "/issues") params.set("projectId", filters.projectId)
  if (filters.statusId) params.set("statusId", filters.statusId)
  if (filters.priorityId) params.set("priorityId", filters.priorityId)
  if (filters.typeId) params.set("typeId", filters.typeId)
  if (filters.assignee !== "all") params.set("assignee", filters.assignee)
  if (filters.sort !== "updated") params.set("sort", filters.sort)
  if (filters.dir === "asc") params.set("dir", "asc")
  if (page > 1) params.set("page", String(page))
  const search = params.toString()
  return search ? `${basePath}?${search}` : basePath
}
