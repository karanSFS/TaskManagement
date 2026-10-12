import Form from "next/form"
import Link from "next/link"
import { Suspense } from "react"
import { AlarmClock, CalendarClock, CircleDot, ListTodo, Search } from "lucide-react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { IssueList, IssueListRow } from "@/components/issues/issue-list"
import { PageHeader } from "@/components/layout/page-header"
import { MyWorkSkeleton } from "@/components/shared/page-skeleton"
import { FilterDrawer, FilterField } from "@/components/shared/filter-drawer"
import { filterFieldClass } from "@/components/shared/field-styles"
import { SegmentedLinks } from "@/components/shared/segmented-links"
import { PriorityMark } from "@/components/shared/priority-mark"
import { StatusChip, priorityEdge } from "@/components/shared/visual"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { formatDueDate, issueKey } from "@/lib/projects/format"
import { getIssueCatalog, getMyWork, type MyWorkView } from "@/lib/services/issue.service"
import { myWorkSorts, myWorkViews } from "@/lib/validations/issue"

export const metadata = { title: "My Work" }

type WorkSearch = {
  view?: string
  q?: string
  statusId?: string
  priorityId?: string
  sort?: string
  dir?: string
  page?: string
}

const fieldClass = filterFieldClass

const views: { id: MyWorkView; label: string }[] = [
  { id: "assigned", label: "Assigned" },
  { id: "reported", label: "Reported" },
  { id: "due", label: "Due soon" },
  { id: "overdue", label: "Overdue" },
]

export default function MyWorkPage({ searchParams }: { searchParams: Promise<WorkSearch> }) {
  return (
    <div className="grid gap-4">
      <PageHeader title="My Work" description="Open issues assigned to you, reported by you, due soon, or overdue." />
      <Suspense fallback={<MyWorkSkeleton />}>
        <MyWorkContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function MyWorkContent({ searchParams }: { searchParams: Promise<WorkSearch> }) {
  const user = await getCurrentUser()
  if (!user) return null

  const params = await searchParams
  const view = myWorkViews.find((item) => item === params.view) ?? "assigned"
  const sort = myWorkSorts.find((item) => item === params.sort) ?? "updated"
  const ascending = params.dir === "asc"
  const page = Number(params.page)
  const [catalog, work] = await Promise.all([
    getIssueCatalog(),
    getMyWork(user.id, {
      view,
      query: params.q,
      statusId: params.statusId,
      priorityId: params.priorityId,
      sort,
      ascending,
      page: Number.isFinite(page) ? page : 1,
    }),
  ])

  const filters = {
    view,
    q: params.q?.trim() ?? "",
    statusId: catalog.statuses.some((status) => status.id === params.statusId) ? params.statusId! : "",
    priorityId: catalog.priorities.some((priority) => priority.id === params.priorityId) ? params.priorityId! : "",
    sort,
    dir: ascending ? "asc" : "desc",
  }
  const today = new Date().toISOString().slice(0, 10)
  const filtered = Boolean(filters.q || filters.statusId || filters.priorityId)
  const from = work.total === 0 ? 0 : (work.page - 1) * work.pageSize + 1
  const to = Math.min(work.page * work.pageSize, work.total)

  return (
    <div className="grid gap-4">
      <SegmentedLinks
        label="My work"
        items={views.map((item) => ({
          href: workHref({ ...filters, view: item.id, page: undefined }),
          label: `${item.label} ${countFor(item.id, work.counts)}`,
          active: view === item.id,
        }))}
      />
      <div className="flex flex-wrap items-center gap-2">
          <Form action="/my-work" replace scroll={false} className="relative min-w-0 flex-1 sm:max-w-64">
            {view !== "assigned" ? <input type="hidden" name="view" value={view} /> : null}
            {filters.statusId ? <input type="hidden" name="statusId" value={filters.statusId} /> : null}
            {filters.priorityId ? <input type="hidden" name="priorityId" value={filters.priorityId} /> : null}
            {sort !== "updated" ? <input type="hidden" name="sort" value={sort} /> : null}
            {filters.dir === "asc" ? <input type="hidden" name="dir" value="asc" /> : null}
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={filters.q} aria-label="Search your work" placeholder="Title or KEY-1" className={`${fieldClass} h-8 pl-8`} />
          </Form>
          <FilterDrawer
            action="/my-work"
            title="Filter your work"
            activeCount={[filters.statusId, filters.priorityId, sort !== "updated" ? sort : "", filters.dir === "asc" ? "asc" : ""].filter(Boolean).length}
          >
            <input type="hidden" name="view" value={view} />
            {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
            <FilterField label="Status">
              <select name="statusId" defaultValue={filters.statusId} className={fieldClass}>
                <option value="">Open statuses</option>
                {catalog.statuses.map((status) => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Priority">
              <select name="priorityId" defaultValue={filters.priorityId} className={fieldClass}>
                <option value="">Any priority</option>
                {catalog.priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>{priority.name}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Sort">
              <select name="sort" defaultValue={sort} className={fieldClass}>
                <option value="updated">Updated</option>
                <option value="due">Due date</option>
                <option value="priority">Priority</option>
                <option value="title">Title</option>
              </select>
            </FilterField>
            <FilterField label="Direction">
              <select name="dir" defaultValue={filters.dir} className={fieldClass}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </FilterField>
          </FilterDrawer>
          {filtered ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={workHref({ view })}>Clear</Link>
            </Button>
          ) : null}
          {work.total > 0 ? (
            <p className="text-xs text-muted-foreground sm:ml-auto" role="status">
              Showing {from}–{to} of {work.total}
            </p>
          ) : null}
      </div>
      {work.total === 0 ? (
        <EmptyWork view={view} filtered={filtered} />
      ) : (
        <IssueList>
          {work.items.map((issue) => {
            const overdue = issue.dueDate !== null && issue.dueDate < today
            return (
              <IssueListRow
                key={issue.id}
                id={issue.id}
                issueKey={issueKey(issue.projectKey, issue.number)}
                title={issue.title}
                edge={priorityEdge(issue.priority)}
                meta={
                  <>
                    <span className="max-w-40 truncate">{issue.projectName}</span>
                    <StatusChip name={issue.status} />
                    <PriorityMark name={issue.priority} />
                    <span className="max-w-36 truncate">{issue.assigneeName ?? "Unassigned"}</span>
                    <span className={overdue ? "font-medium text-destructive" : undefined}>
                      {issue.dueDate ? (overdue ? `Overdue · ${formatDueDate(issue.dueDate)}` : `Due ${formatDueDate(issue.dueDate)}`) : "No due date"}
                    </span>
                  </>
                }
              />
            )
          })}
        </IssueList>
      )}
      {work.total > work.pageSize ? (
        <div className="flex items-center justify-end gap-2">
          <p className="mr-auto text-xs text-muted-foreground">Page {work.page} of {Math.ceil(work.total / work.pageSize)}</p>
          {work.page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={workHref({ ...filters, page: work.page - 1 })}>Previous</Link>
            </Button>
          ) : null}
          {to < work.total ? (
            <Button asChild variant="outline" size="sm">
              <Link href={workHref({ ...filters, page: work.page + 1 })}>Next</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function EmptyWork({ view, filtered }: { view: MyWorkView; filtered: boolean }) {
  const copy = emptyCopy(view, filtered)
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-card/70 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <SummaryIcon view={view} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-5">{copy.title}</p>
          <p className="text-sm leading-5 text-muted-foreground">{copy.description}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <CreateIssueButton size="sm">Create issue</CreateIssueButton>
        <Button asChild size="sm" variant="outline">
          <Link href="/projects">Browse projects</Link>
        </Button>
      </div>
    </div>
  )
}

function SummaryIcon({ view }: { view: MyWorkView }) {
  const className = "size-3.5"
  switch (view) {
    case "assigned":
      return <ListTodo className={className} aria-hidden />
    case "reported":
      return <CircleDot className={className} aria-hidden />
    case "due":
      return <CalendarClock className={className} aria-hidden />
    case "overdue":
      return <AlarmClock className={className} aria-hidden />
  }
}

function countFor(view: MyWorkView, counts: { assigned: number; reported: number; dueSoon: number; overdue: number }) {
  switch (view) {
    case "assigned":
      return counts.assigned
    case "reported":
      return counts.reported
    case "due":
      return counts.dueSoon
    case "overdue":
      return counts.overdue
  }
}

function emptyCopy(view: MyWorkView, filtered: boolean) {
  if (filtered) {
    return { title: "No matching issues", description: "Nothing in this view matches the current search or filters." }
  }
  switch (view) {
    case "assigned":
      return { title: "Nothing is assigned to you", description: "Open issues assigned to you will show up here." }
    case "reported":
      return { title: "You have not reported open issues", description: "Issues you create stay in this list until they are done." }
    case "due":
      return { title: "Nothing is due this week", description: "Open issues assigned to you or reported by you appear here when they are due within 7 days." }
    case "overdue":
      return { title: "Nothing is overdue", description: "Open issues assigned to you or reported by you appear here after their due date." }
  }
}

function workHref(filters: {
  view?: MyWorkView
  q?: string
  statusId?: string
  priorityId?: string
  sort?: string
  dir?: string
  page?: number
}) {
  const params = new URLSearchParams()
  if (filters.view && filters.view !== "assigned") params.set("view", filters.view)
  if (filters.q) params.set("q", filters.q)
  if (filters.statusId) params.set("statusId", filters.statusId)
  if (filters.priorityId) params.set("priorityId", filters.priorityId)
  if (filters.sort && filters.sort !== "updated") params.set("sort", filters.sort)
  if (filters.dir === "asc") params.set("dir", "asc")
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
  const query = params.toString()
  return query ? `/my-work?${query}` : "/my-work"
}
