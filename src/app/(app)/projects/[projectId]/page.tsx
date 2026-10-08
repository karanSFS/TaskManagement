import Link from "next/link"
import { Suspense } from "react"
import { notFound } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { formatProjectDate, issueKey, roleLabel } from "@/lib/projects/format"
import { getProject } from "@/lib/services/project.service"

export const metadata = { title: "Project" }

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <ProjectOverview params={params} />
    </Suspense>
  )
}

async function ProjectOverview({ params }: { params: Promise<{ projectId: string }> }) {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()])
  if (!user) {
    return null
  }

  const project = await getProject(projectId, user.id)
  if (!project) {
    notFound()
  }

  const byStatus = new Map<string, number>()
  for (const issue of project.issues) {
    byStatus.set(issue.status, (byStatus.get(issue.status) ?? 0) + 1)
  }

  return (
    <div className="grid gap-4">
      <p className="max-w-2xl text-sm text-muted-foreground">{project.description || "No description yet."}</p>
      <dl className="grid gap-3 sm:grid-cols-4">
        <Stat label="Your role" value={roleLabel(project.role)} />
        <Stat label="Lead" value={project.leadName} />
        <Stat label="Members" value={String(project.memberCount)} />
        <Stat label="Created" value={formatProjectDate(project.createdAt)} />
      </dl>
      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Issues</h2>
          <Link href={`/issues/new?projectId=${project.id}`} className="text-sm font-medium text-primary hover:underline">
            New issue
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {project.openIssueCount} open · {project.doneIssueCount} done · next number {issueKey(project.key, project.nextIssueNumber)}
        </p>
        {byStatus.size > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {[...byStatus.entries()].map(([status, count]) => (
              <li key={status} className="rounded-md border bg-card px-2 py-1 text-xs">
                {status} · {count}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No issues yet.</p>
        )}
        {project.issues.length > 0 ? (
          <ul className="divide-y rounded-lg border bg-card">
            {project.issues.slice(0, 8).map((issue) => (
              <li key={issue.id}>
                <Link href={`/issues/${issue.id}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                  <span className="font-medium text-muted-foreground">{issueKey(project.key, issue.number)}</span>
                  <span className="min-w-0 flex-1 truncate">{issue.title}</span>
                  <span className="text-xs text-muted-foreground">{issue.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  )
}
