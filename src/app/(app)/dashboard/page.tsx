import Link from "next/link"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { displayName } from "@/lib/auth/user"
import { issueKey } from "@/lib/projects/format"
import { listMyWork } from "@/lib/services/issue.service"
import { getProjects } from "@/lib/services/project.service"

export const metadata = {
  title: "Home",
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  )
}

async function HomeContent() {
  const user = await getCurrentUser()
  if (!user) return null

  const [projects, work] = await Promise.all([getProjects(user.id), listMyWork(user.id)])
  const active = projects.filter((project) => !project.archivedAt)
  const openIssues = active.reduce((total, project) => total + project.openIssueCount, 0)

  return (
    <div className="grid gap-4">
      <PageHeader
        title={`Hello, ${displayName(user)}`}
        description="Open work across the projects you belong to."
        actions={
          <Button asChild>
            <Link href="/issues/new">New issue</Link>
          </Button>
        }
      />
      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat label="Active projects" value={String(active.length)} href="/projects" />
        <Stat label="Open issues" value={String(openIssues)} href="/issues" />
        <Stat label="Assigned to you" value={String(work.assigned.total)} href="/my-work" />
      </dl>
      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Assigned to you</h2>
          <Link href="/my-work" className="text-sm text-muted-foreground hover:underline">
            My Work
          </Link>
        </div>
        {work.assigned.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is assigned to you.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {work.assigned.items.slice(0, 8).map((issue) => (
              <li key={issue.id}>
                <Link href={`/issues/${issue.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                  <span className="w-24 shrink-0 text-sm font-medium text-muted-foreground">
                    {issueKey(issue.projectKey, issue.number)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{issue.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-lg border bg-card px-4 py-3">
        <h2 className="text-sm font-medium">Keyboard</h2>
        <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
          <li>
            <span className="font-mono text-foreground">/</span> search pages
          </li>
          <li>
            <span className="font-mono text-foreground">C</span> create issue
          </li>
          <li>
            <span className="font-mono text-foreground">⌘B</span> collapse sidebar
          </li>
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-lg border bg-card px-3 py-2 hover:bg-muted/50">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </Link>
  )
}

function HomeFallback() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-28 w-full" />
    </div>
  )
}
