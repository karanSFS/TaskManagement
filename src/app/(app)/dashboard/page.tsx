import Link from "next/link"
import { Suspense, type ReactNode } from "react"
import { AlarmClock, CircleDot, FolderKanban, ListTodo, Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ProjectIcon } from "@/components/projects/project-icon"
import { DashboardSkeleton } from "@/components/shared/page-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { displayName } from "@/lib/auth/user"
import { formatDueDate, formatProjectDate, issueKey } from "@/lib/projects/format"
import { countOverdueIssues, listMyWork, listRecentActivity } from "@/lib/services/issue.service"
import { getProjects, type ProjectSummary } from "@/lib/services/project.service"

export const metadata = {
  title: "Home",
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HomeContent />
    </Suspense>
  )
}

async function HomeContent() {
  const user = await getCurrentUser()
  if (!user) return null

  const [projects, work, activity, overdue] = await Promise.all([
    getProjects(user.id),
    listMyWork(user.id),
    listRecentActivity(user.id),
    countOverdueIssues(),
  ])

  const active = projects.filter((project) => !project.archivedAt)
  const archived = projects.filter((project) => project.archivedAt)
  const openIssues = active.reduce((total, project) => total + project.openIssueCount, 0)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="grid gap-4">
      <PageHeader
        title={`Hello, ${displayName(user)}`}
        description="Open work across the projects you belong to."
        actions={
          <Button asChild>
            <Link href="/issues/new">
              <Plus />
              New issue
            </Link>
          </Button>
        }
      />
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          href="/projects"
          icon="projects"
          label="Active projects"
          value={active.length}
          hint={archived.length > 0 ? `${archived.length} archived` : "Workspaces you belong to"}
        />
        <Metric href="/issues" icon="issues" label="Open issues" value={openIssues} hint="Not done, in active projects" />
        <Metric href="/my-work" icon="assigned" label="Assigned to you" value={work.assigned.total} hint="Open issues on you" />
        <Metric
          href="/my-work"
          icon="overdue"
          label="Overdue issues"
          value={overdue}
          hint="Open issues past their due date"
          alert={overdue > 0}
        />
      </dl>
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Panel
          title="Assigned to you"
          href="/my-work"
          action="My Work"
        >
          {work.assigned.items.length === 0 ? (
            <EmptyPanel
              title="Nothing is assigned to you"
              description="Open issues you take on will show up here."
              href="/issues"
              action="Browse issues"
            />
          ) : (
            <ul className="divide-y">
              {work.assigned.items.slice(0, 6).map((issue) => (
                <li key={issue.id}>
                  <Link href={`/issues/${issue.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50">
                    <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{issueKey(issue.projectKey, issue.number)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{issue.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Upcoming deadlines" href="/my-work" action="My Work">
          {work.dueSoon.items.length === 0 ? (
            <EmptyPanel
              title="No deadlines this week"
              description="Issues due in the next 7 days, including overdue, show up here."
              href="/issues/new"
              action="New issue"
            />
          ) : (
            <ul className="divide-y">
              {work.dueSoon.items.slice(0, 6).map((issue) => {
                const late = issue.dueDate !== null && issue.dueDate < today
                return (
                  <li key={issue.id}>
                    <Link href={`/issues/${issue.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50">
                      <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{issueKey(issue.projectKey, issue.number)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
                      <span className={late ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                        {late ? "Overdue" : issue.dueDate ? formatDueDate(issue.dueDate) : ""}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Projects" href="/projects" action="All projects">
          {projects.length === 0 ? (
            <EmptyPanel
              title="No projects yet"
              description="Create a workspace before filing issues."
              href="/projects/new"
              action="New project"
            />
          ) : (
            <ul className="divide-y">
              {[...active, ...archived].slice(0, 6).map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent activity" href="/issues" action="Issues">
          {activity.length === 0 ? (
            <EmptyPanel
              title="No issue activity yet"
              description="Status changes, assignments, and new issues will show up here."
              href="/issues/new"
              action="New issue"
            />
          ) : (
            <ul className="divide-y">
              {activity.slice(0, 6).map((entry) => (
                <li key={entry.id}>
                  <Link href={`/issues/${entry.issueId}`} className="grid gap-0.5 px-3 py-2 hover:bg-muted/50">
                    <span className="truncate text-sm">{entry.summary}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {entry.actorName} · {entry.issueKey} {entry.issueTitle} · {formatProjectDate(entry.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Metric({
  href,
  icon,
  label,
  value,
  hint,
  alert = false,
}: {
  href: string
  icon: "projects" | "issues" | "assigned" | "overdue"
  label: string
  value: number
  hint: string
  alert?: boolean
}) {
  return (
    <Link href={href} className="rounded-lg border bg-card px-3 py-3 hover:bg-muted/40">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <MetricIcon name={icon} />
      </div>
      <dd className={alert ? "mt-2 font-mono text-2xl font-semibold tracking-tight text-destructive tabular-nums" : "mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums"}>
        {value}
      </dd>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Link>
  )
}

function MetricIcon({ name }: { name: "projects" | "issues" | "assigned" | "overdue" }) {
  const className = "size-4 text-muted-foreground"
  switch (name) {
    case "projects":
      return <FolderKanban className={className} />
    case "issues":
      return <CircleDot className={className} />
    case "assigned":
      return <ListTodo className={className} />
    default:
      return <AlarmClock className={className} />
  }
}

function Panel({
  title,
  href,
  action,
  children,
}: {
  title: string
  href: string
  action: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="text-sm font-medium">{title}</h2>
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          {action}
        </Link>
      </div>
      {children}
    </section>
  )
}

function EmptyPanel({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return (
    <div className="grid gap-2 px-3 py-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button asChild size="sm" variant="outline" className="w-fit">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  )
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  return (
    <li>
      <Link href={`/projects/${project.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50">
        <ProjectIcon name={project.icon} />
        <span className="min-w-0 flex-1 truncate text-sm">{project.name}</span>
        <span className="font-mono text-xs text-muted-foreground">{project.key}</span>
        {project.archivedAt ? <Badge variant="secondary">Archived</Badge> : <span className="text-xs text-muted-foreground">{project.openIssueCount} open</span>}
      </Link>
    </li>
  )
}
