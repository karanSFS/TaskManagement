import Form from "next/form"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Search, SquareKanban } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { filterFieldClass } from "@/components/shared/field-styles"
import { SegmentedLinks } from "@/components/shared/segmented-links"
import { PlanSprintButton } from "@/components/sprints/create-sprint-form"
import { BacklogList } from "@/components/sprints/sprint-lists"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { projectHref } from "@/lib/config/nav"
import { getSprintWorkspace } from "@/lib/services/sprint.service"
import { filterBacklog, type BacklogSort, type BacklogStatus } from "@/lib/sprints/backlog"
import { cn } from "@/lib/utils"

export type BacklogSearch = { q?: string; status?: string; sort?: string; dir?: string }

export async function BacklogView({ projectId, searchParams }: { projectId: string; searchParams: Promise<BacklogSearch> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const workspace = await getSprintWorkspace(user.id, projectId)
  if (!workspace) notFound()

  const base = projectHref(projectId, "backlog")
  const query = params.q?.trim() ?? ""
  const status: BacklogStatus = params.status === "done" || params.status === "all" ? params.status : "open"
  const sort: BacklogSort = params.sort === "title" || params.sort === "key" || params.sort === "priority" ? params.sort : "updated"
  const direction = params.dir === "asc" || params.dir === "desc" ? params.dir : sort === "key" || sort === "title" ? "asc" : "desc"
  const issues = filterBacklog(workspace.backlog, workspace.projectKey, { query, status, sort, direction })
  const openCount = workspace.backlog.filter((issue) => !issue.done).length
  const doneCount = workspace.backlog.filter((issue) => issue.done).length
  const openSprints = workspace.archived
    ? []
    : workspace.sprints.filter((sprint) => sprint.status !== "completed").map((sprint) => ({ id: sprint.id, name: sprint.name }))

  function href(next: { status?: BacklogStatus; sort?: BacklogSort; q?: string }) {
    const search = new URLSearchParams()
    const merged = { status, sort, q: query, ...next }
    if (merged.status !== "open") search.set("status", merged.status)
    if (merged.sort !== "updated") search.set("sort", merged.sort)
    if (merged.q) search.set("q", merged.q)
    const value = search.toString()
    return value ? `${base}?${value}` : base
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedLinks
          label="Backlog status"
          items={[
            { href: href({ status: "open" }), label: `Open ${openCount}`, active: status === "open" },
            { href: href({ status: "done" }), label: `Done ${doneCount}`, active: status === "done" },
            { href: href({ status: "all" }), label: "All", active: status === "all" },
          ]}
        />
        <Form action={base} replace scroll={false} className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
          {status !== "open" ? <input type="hidden" name="status" value={status} /> : null}
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search the backlog</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={query} placeholder="Title, key, or assignee" className={cn(filterFieldClass, "h-8 pl-8")} />
          </label>
          <label className="shrink-0">
            <span className="sr-only">Sort</span>
            <select name="sort" defaultValue={sort} className={cn(filterFieldClass, "h-8 w-auto")}>
              <option value="updated">Recently updated</option>
              <option value="priority">Priority</option>
              <option value="key">Key</option>
              <option value="title">Title</option>
            </select>
          </label>
          <Button type="submit" size="sm" variant="outline">Apply</Button>
        </Form>
        {query ? (
          <Link href={href({ q: "" })} replace scroll={false} className="text-xs font-medium text-primary hover:underline">
            Clear search
          </Link>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link href={projectHref(projectId, "sprints")} className="text-xs font-medium text-primary hover:underline">
            Sprints
          </Link>
          {!workspace.archived ? <PlanSprintButton key={projectId} projectId={projectId} /> : null}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Issues that are not in a sprint. {openSprints.length === 0 && !workspace.archived ? "Plan a sprint before you can schedule them." : "Add one to a sprint when you are ready to work on it."}
      </p>
      {workspace.truncated ? (
        <p className="text-xs text-muted-foreground">Showing the latest 200 issues that are not in a sprint.</p>
      ) : null}
      {issues.length === 0 ? (
        <BacklogEmpty base={href({ status: "done", q: "" })} status={status} query={query} openCount={openCount} doneCount={doneCount} />
      ) : (
        <BacklogList projectId={projectId} projectKey={workspace.projectKey} issues={issues} sprints={openSprints} />
      )}
    </div>
  )
}

function BacklogEmpty({
  base,
  status,
  query,
  openCount,
  doneCount,
}: {
  base: string
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
            <Link href={base}>Show done issues</Link>
          </Button>
        }
      />
    )
  }

  if (openCount + doneCount === 0) {
    return <EmptyState icon={SquareKanban} title="The backlog is empty" description="New issues that are not in a sprint appear here." />
  }

  return <EmptyState icon={SquareKanban} title="No matching issues" description="Try a different search or status." />
}
