import Link from "next/link"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { issueKey } from "@/lib/projects/format"
import { listIssueProjects, listIssues } from "@/lib/services/issue.service"

export const metadata = { title: "Issues" }

type IssueSearch = { q?: string; page?: string; projectId?: string }

const fieldClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export default function IssuesPage({ searchParams }: { searchParams: Promise<IssueSearch> }) {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Issues"
        description="Work across the projects you belong to."
        actions={
          <Button asChild>
            <Link href="/issues/new">New issue</Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <IssueList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function IssueList({ searchParams }: { searchParams: Promise<IssueSearch> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const query = params.q?.trim() ?? ""
  const page = Number(params.page ?? "1")
  const projects = await listIssueProjects(user.id)
  const projectId = projects.some((project) => project.id === params.projectId) ? params.projectId : undefined
  const result = await listIssues(user.id, page, query, projectId)
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const filtered = Boolean(query || projectId)

  return (
    <div className="grid gap-3">
      <form action="/issues" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search titles"
          className={`${fieldClass} w-full max-w-xs`}
        />
        <select name="projectId" defaultValue={projectId ?? ""} className={fieldClass} aria-label="Project">
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
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
        <p className="text-sm text-muted-foreground">
          {filtered ? "No issues match these filters." : "No issues yet. Create one to get started."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {result.items.map((issue) => (
            <li key={issue.id}>
              <Link href={`/issues/${issue.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                <span className="w-24 shrink-0 text-sm font-medium text-muted-foreground">
                  {issueKey(issue.projectKey, issue.number)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
                <span className="hidden text-xs text-muted-foreground lg:inline">{issue.priority}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{issue.status}</span>
                <span className="hidden w-28 truncate text-right text-xs text-muted-foreground md:inline">
                  {issue.assigneeName ?? "Unassigned"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 ? (
        <div className="flex items-center gap-2 text-sm">
          {result.page > 1 ? (
            <Link href={issueHref(query, projectId, result.page - 1)} className="underline">
              Previous
            </Link>
          ) : null}
          <span className="text-muted-foreground">
            Page {result.page} of {pages}
          </span>
          {result.page < pages ? (
            <Link href={issueHref(query, projectId, result.page + 1)} className="underline">
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function issueHref(query: string, projectId: string | undefined, page: number) {
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  if (projectId) params.set("projectId", projectId)
  if (page > 1) params.set("page", String(page))
  const search = params.toString()
  return search ? `/issues?${search}` : "/issues"
}
