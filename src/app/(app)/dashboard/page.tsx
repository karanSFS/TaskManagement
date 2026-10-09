import Link from "next/link"
import { Suspense, type ReactNode } from "react"
import { AlarmClock, ArrowUpRight, CircleDot, FolderKanban, FolderPlus, ListTodo, Plus, CheckCircle2 } from "lucide-react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { CreateProjectButton } from "@/components/projects/create-project-dialog"
import { ProjectIcon } from "@/components/projects/project-icon"
import { DashboardSkeleton } from "@/components/shared/page-skeleton"
import { LinkPending } from "@/components/shared/pending-ui"
import { priorityDot, projectAccent } from "@/components/shared/priority-mark"
import { MetricLink, PersonStack, ProgressMeter } from "@/components/shared/visual"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth/session"
import { displayName } from "@/lib/auth/user"
import { formatDueDate, formatProjectDate, issueKey } from "@/lib/projects/format"
import { countOverdueIssues, listMyWork, listRecentActivity, type MyWorkItem } from "@/lib/services/issue.service"
import { getProjects, type ProjectSummary } from "@/lib/services/project.service"
import { listActiveSprintProgress } from "@/lib/services/sprint.service"

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

  const [projects, work, activity, overdue, sprints] = await Promise.all([
    getProjects(user.id),
    listMyWork(user.id),
    listRecentActivity(user.id),
    countOverdueIssues(),
    listActiveSprintProgress(),
  ])

  const active = projects.filter((project) => !project.archivedAt)
  const archived = projects.filter((project) => project.archivedAt)
  const openIssues = active.reduce((total, project) => total + project.openIssueCount, 0)
  const doneIssues = active.reduce((total, project) => total + project.doneIssueCount, 0)
  const today = new Date().toISOString().slice(0, 10)
  const name = displayName(user)
  const summary = homeSummary(openIssues, work.assigned.total, overdue)

  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden rounded-2xl bg-primary px-5 py-5 text-primary-foreground shadow-sm sm:px-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(120deg,transparent,rgba(37,99,235,0.55))]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-medium tracking-wide text-primary-foreground/80">FixTask</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Hello, {name}</h1>
            <p className="mt-1 text-sm text-primary-foreground/85">{summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CreateIssueButton className="bg-white text-primary hover:bg-white/90">
              <Plus />
              Create issue
            </CreateIssueButton>
            <CreateProjectButton variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <FolderPlus />
              Create project
            </CreateProjectButton>
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricLink href="/projects" label="Active projects" value={active.length} hint={archived.length > 0 ? `${archived.length} archived` : "Workspaces you belong to"} tone="bg-primary" icon={<FolderKanban className="size-4" />} />
        <MetricLink href="/issues" label="Open issues" value={openIssues} hint="Not done, in active projects" tone="bg-info" icon={<CircleDot className="size-4" />} />
        <MetricLink href="/my-work" label="Assigned to you" value={work.assigned.total} hint="Open issues on you" tone="bg-chart-2" icon={<ListTodo className="size-4" />} />
        <MetricLink href="/my-work?view=overdue" label="Overdue" value={overdue} hint="Open issues past their due date" tone={overdue > 0 ? "bg-destructive" : "bg-warning"} icon={<AlarmClock className="size-4" />} alert={overdue > 0} />
        <MetricLink href="/issues" label="Completed" value={doneIssues} hint="Done issues in active projects" tone="bg-success" icon={<CheckCircle2 className="size-4" />} />
      </dl>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <section className="min-w-0">
          <SectionHeading title="Assigned to you" href="/my-work" action="Open My Work" />
          {work.assigned.items.length === 0 ? (
            <EmptyBlock title="Nothing is assigned to you" description="Open issues you take on will show up here." action={<Link href="/issues" className="text-sm font-medium text-info hover:underline">Browse issues</Link>} />
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {work.assigned.items.slice(0, 6).map((issue) => (
                <WorkRow key={issue.id} issue={issue} today={today} />
              ))}
            </ul>
          )}
        </section>
        <section className="min-w-0">
          <SectionHeading title="Deadlines" href="/my-work?view=due" action="Due soon" />
          {work.dueSoon.items.length === 0 ? (
            <EmptyBlock title="No deadlines this week" description="Issues due in the next 7 days, including overdue ones, show up here." action={<CreateIssueButton size="sm" variant="outline">Create issue</CreateIssueButton>} />
          ) : (
            <ul className="grid gap-2">
              {work.dueSoon.items.slice(0, 5).map((issue) => {
                const late = issue.dueDate !== null && issue.dueDate < today
                return (
                  <li key={issue.id} className="rounded-xl border bg-card px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/issues/${issue.id}`} className="font-mono text-xs text-muted-foreground hover:underline">{issueKey(issue.projectKey, issue.number)}</Link>
                      <span className={late ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
                        {late ? "Overdue" : issue.dueDate ? formatDueDate(issue.dueDate) : ""}
                      </span>
                    </div>
                    <IssueOpenButton issueId={issue.id} className="mt-1 block w-full truncate text-left text-sm font-medium hover:underline">{issue.title}</IssueOpenButton>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`size-1.5 rounded-full ${priorityDot(issue.priority)}`} />
                      {issue.priority} · {issue.status}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section>
        <SectionHeading title="Projects" href="/projects" action="All projects" />
        {projects.length === 0 ? (
          <EmptyBlock title="No projects yet" description="Create a workspace before filing issues." action={<CreateProjectButton size="sm">Create project</CreateProjectButton>} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[...active, ...archived].slice(0, 6).map((project) => (
              <HomeProjectCard key={project.id} project={project} />
            ))}
          </ul>
        )}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section>
          <SectionHeading title="Active sprints" href="/sprints" action="Sprint planning" />
          {sprints.length === 0 ? (
            <EmptyBlock title="No active sprint" description="Plan a sprint, then start it when the team is ready. Nothing here is estimated." action={<Link href="/sprints" className="text-sm font-medium text-info hover:underline">Open sprints</Link>} />
          ) : (
            <ul className="grid gap-3">
              {sprints.map((sprint) => {
                const total = sprint.open + sprint.done
                const percent = total === 0 ? 0 : Math.round((sprint.done / total) * 100)
                return (
                  <li key={sprint.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{sprint.name}</p>
                        <p className="text-xs text-muted-foreground">{sprint.projectKey} · {sprint.projectName}</p>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-chart-2" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {sprint.done} of {total} done
                      {sprint.endDate ? ` · ends ${formatDueDate(sprint.endDate)}` : " · no end date"}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <section>
          <SectionHeading title="Recent activity" href="/issues" action="Issues" />
          {activity.length === 0 ? (
            <EmptyBlock title="No issue activity yet" description="Status changes, assignments, and new issues will show up here." action={<CreateIssueButton size="sm" variant="outline">Create issue</CreateIssueButton>} />
          ) : (
            <ol className="relative grid gap-0 border-l border-border pl-4">
              {activity.slice(0, 6).map((entry) => (
                <li key={entry.id} className="relative pb-4 last:pb-0">
                  <span className="absolute top-1.5 -left-[1.2rem] size-2 rounded-full bg-primary ring-4 ring-background" />
                  <IssueOpenButton issueId={entry.issueId} className="grid w-full text-left">
                    <span className="text-sm">{entry.summary}</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {entry.actorName} · {entry.issueKey} · {formatProjectDate(entry.createdAt)}
                    </span>
                  </IssueOpenButton>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

function homeSummary(openIssues: number, assigned: number, overdue: number) {
  if (openIssues === 0 && assigned === 0) return "No open work in your projects yet. Create an issue or a project to get started."
  if (overdue > 0) return `${assigned} assigned to you, ${openIssues} open overall, ${overdue} overdue.`
  return `${assigned} assigned to you and ${openIssues} open across your projects.`
}

function SectionHeading({ title, href, action }: { title: string; href: string; action: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-info hover:underline">
        {action}
        <ArrowUpRight className="size-3" />
      </Link>
    </div>
  )
}

function EmptyBlock({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/70 px-4 py-5">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-3">{action}</div>
    </div>
  )
}

function WorkRow({ issue, today }: { issue: MyWorkItem; today: string }) {
  const late = issue.dueDate !== null && issue.dueDate < today
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40">
      <span className={`size-2 shrink-0 rounded-full ${priorityDot(issue.priority)}`} title={issue.priority} />
      <Link href={`/issues/${issue.id}`} className="w-24 shrink-0 font-mono text-xs text-muted-foreground hover:underline">
        {issueKey(issue.projectKey, issue.number)}
      </Link>
      <IssueOpenButton issueId={issue.id} className="min-w-0 flex-1 truncate text-left text-sm font-medium">{issue.title}</IssueOpenButton>
      <span className="hidden text-xs text-muted-foreground md:inline">{issue.projectName}</span>
      <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">{issue.status}</span>
      <span className={late ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
        {issue.dueDate ? formatDueDate(issue.dueDate) : "No due date"}
      </span>
    </li>
  )
}

function HomeProjectCard({ project }: { project: ProjectSummary }) {
  const accent = projectAccent(project.key)

  return (
    <li className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className={`h-1 ${accent.bar}`} />
      <Link href={`/projects/${project.id}`} className="flex items-start gap-3 px-3 pt-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${accent.wash} ${accent.text}`}>
          <ProjectIcon name={project.icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{project.name}</span>
            <LinkPending />
          </span>
          <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{project.key}</span>
        </span>
        {project.archivedAt ? <Badge variant="secondary">Archived</Badge> : <Badge variant="outline">Active</Badge>}
      </Link>
      <div className="px-3 pt-3 pb-3">
        <ProgressMeter done={project.doneIssueCount} open={project.openIssueCount} barClass={accent.bar} />
        <div className="mt-2 flex justify-end">
          <PersonStack people={project.roster} total={project.memberCount} />
        </div>
      </div>
    </li>
  )
}
