import Link from "next/link"
import { Suspense } from "react"
import { AlarmClock, CalendarClock, CircleDot, ListTodo } from "lucide-react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { PageHeader } from "@/components/layout/page-header"
import { WorkSwitcher } from "@/components/my-work/work-switcher"
import { MyWorkSkeleton } from "@/components/shared/page-skeleton"
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

const fieldClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

const views: { id: MyWorkView; label: string; hint: string }[] = [
  { id: "assigned", label: "Assigned to me", hint: "Open issues on you" },
  { id: "reported", label: "Reported by me", hint: "Open issues you created" },
  { id: "due", label: "Due soon", hint: "Due within 7 days" },
  { id: "overdue", label: "Overdue", hint: "Past the due date" },
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
    <WorkSwitcher
      view={view}
      cards={views.map((item) => ({
        id: item.id,
        href: workHref({ ...filters, view: item.id, page: undefined }),
        label: item.label,
        hint: item.hint,
        value: countFor(item.id, work.counts),
        alert: item.id === "overdue" && work.counts.overdue > 0,
      }))}
      toolbar={
      <form action="/my-work" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={filters.q} placeholder="Search title or KEY-1" aria-label="Search your work" className={`${fieldClass} w-full sm:w-56`} />
        <select name="statusId" defaultValue={filters.statusId} aria-label="Status" className={fieldClass}>
          <option value="">Open statuses</option>
          {catalog.statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
        <select name="priorityId" defaultValue={filters.priorityId} aria-label="Priority" className={fieldClass}>
          <option value="">Any priority</option>
          {catalog.priorities.map((priority) => (
            <option key={priority.id} value={priority.id}>
              {priority.name}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort" className={fieldClass}>
          <option value="updated">Updated</option>
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
        </select>
        <select name="dir" defaultValue={filters.dir} aria-label="Sort direction" className={fieldClass}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Apply
        </Button>
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
      </form>
      }
    >
      {work.total === 0 ? (
        <EmptyWork view={view} filtered={filtered} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium" scope="col">Key</th>
                <th className="px-3 py-2 font-medium" scope="col">Title</th>
                <th className="px-3 py-2 font-medium" scope="col">Project</th>
                <th className="px-3 py-2 font-medium" scope="col">Status</th>
                <th className="px-3 py-2 font-medium" scope="col">Priority</th>
                <th className="px-3 py-2 font-medium" scope="col">Assignee</th>
                <th className="px-3 py-2 font-medium" scope="col">Due</th>
                <th className="px-3 py-2 font-medium" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {work.items.map((issue) => {
                const overdue = issue.dueDate !== null && issue.dueDate < today
                return (
                  <tr key={issue.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-medium text-muted-foreground">{issueKey(issue.projectKey, issue.number)}</td>
                    <td className="max-w-64 px-3 py-2">
                      <IssueOpenButton issueId={issue.id} className="block w-full truncate text-left font-medium hover:underline">
                        {issue.title}
                      </IssueOpenButton>
                    </td>
                    <td className="max-w-40 truncate px-3 py-2 text-muted-foreground">{issue.projectName}</td>
                    <td className="px-3 py-2">{issue.status}</td>
                    <td className="px-3 py-2">{issue.priority}</td>
                    <td className="max-w-36 truncate px-3 py-2 text-muted-foreground">{issue.assigneeName ?? "Unassigned"}</td>
                    <td className={overdue ? "px-3 py-2 text-destructive" : "px-3 py-2 text-muted-foreground"}>
                      {issue.dueDate ? (overdue ? `Overdue · ${formatDueDate(issue.dueDate)}` : formatDueDate(issue.dueDate)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/issues/${issue.id}`} className="text-xs font-medium text-primary hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {work.total > work.pageSize ? (
        <div className="flex items-center justify-end gap-2">
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
    </WorkSwitcher>
  )
}

function EmptyWork({ view, filtered }: { view: MyWorkView; filtered: boolean }) {
  const copy = emptyCopy(view, filtered)
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
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
