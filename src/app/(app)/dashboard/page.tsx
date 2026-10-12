import Link from "next/link"
import { Suspense, type ReactNode } from "react"
import { Archive, ArrowRight, FolderPlus, Plus, UserPlus, Zap } from "lucide-react"

import { InvitationCard } from "@/components/invitations/invitation-actions"
import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { ArchiveProjectButton } from "@/components/projects/archive-project-button"
import { CreateProjectButton } from "@/components/projects/create-project-dialog"
import { ProjectIcon } from "@/components/projects/project-icon"
import { DashboardSkeleton } from "@/components/shared/page-skeleton"
import { priorityDot, projectAccent } from "@/components/shared/priority-mark"
import { PersonStack, ProgressMeter } from "@/components/shared/visual"
import { getCurrentUser } from "@/lib/auth/session"
import { displayName } from "@/lib/auth/user"
import { projectHref } from "@/lib/config/nav"
import { formatDueDate, formatProjectDate, issueKey } from "@/lib/projects/format"
import { listMyInvitations } from "@/lib/services/invitation.service"
import { getMyWork, listMyWork, listRecentActivity, type MyWorkItem } from "@/lib/services/issue.service"
import { getProjects, type ProjectSummary } from "@/lib/services/project.service"
import { listActiveSprintProgress, type HomeSprint } from "@/lib/services/sprint.service"

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

  const [projects, myWork, upcoming, activity, sprints, invitations] = await Promise.all([
    getProjects(user.id),
    getMyWork(user.id, { view: "assigned" }),
    listMyWork(user.id),
    listRecentActivity(user.id),
    listActiveSprintProgress(),
    user.email ? listMyInvitations(user.email) : Promise.resolve([]),
  ])

  const active = projects.filter((project) => !project.archivedAt)
  const archived = projects.filter((project) => project.archivedAt)
  const openIssues = active.reduce((total, project) => total + project.openIssueCount, 0)
  const today = new Date().toISOString().slice(0, 10)
  const pendingInvites = invitations.filter((invitation) => invitation.status === "pending")
  const { counts } = myWork

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Hello, {displayName(user)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{homeSummary(counts.assigned, counts.dueSoon, counts.overdue, active.length)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {active.length > 0 ? (
            <CreateIssueButton>
              <Plus />
              New issue
            </CreateIssueButton>
          ) : null}
          <CreateProjectButton variant="outline" takenKeys={projects.map((project) => project.key)}>
            <FolderPlus />
            New project
          </CreateProjectButton>
        </div>
      </header>

      {pendingInvites.length > 0 ? (
        <section aria-labelledby="home-invites" className="grid gap-3">
          <PanelHeading
            id="home-invites"
            title={pendingInvites.length === 1 ? "You have an invitation" : `You have ${pendingInvites.length} invitations`}
            href={pendingInvites.length > 2 ? "/invitations" : undefined}
            action="All invitations"
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {pendingInvites.slice(0, 2).map((invitation) => (
              <InvitationCard key={invitation.id} invitation={{ ...invitation, emailMatches: true }} />
            ))}
          </div>
        </section>
      ) : null}

      {active.length === 0 ? (
        archived.length > 0 ? <ArchivedOnly projects={archived} /> : <FirstRun />
      ) : null}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        <Stat href="/my-work" label="Assigned to you" value={counts.assigned} />
        <Stat href="/my-work?view=due" label="Due this week" value={counts.dueSoon} />
        <Stat href="/my-work?view=overdue" label="Overdue" value={counts.overdue} alert={counts.overdue > 0} />
        <Stat href="/issues" label="Open in your projects" value={openIssues} />
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]">
        <Panel
          title="Assigned to you"
          href="/my-work"
          action={counts.assigned > 7 ? `View all ${counts.assigned}` : "My work"}
        >
          {myWork.items.length === 0 ? (
            <PanelEmpty>
              Nothing is assigned to you. Pick something up from a project board, or{" "}
              <Link href="/issues" className="font-medium text-primary hover:underline">browse all issues</Link>.
            </PanelEmpty>
          ) : (
            <ul className="divide-y">
              {myWork.items.slice(0, 7).map((issue) => (
                <WorkRow key={issue.id} issue={issue} today={today} />
              ))}
            </ul>
          )}
        </Panel>

        <div className="grid min-w-0 gap-6">
          <Panel title="Coming up" href="/my-work?view=due" action="Due soon">
            {upcoming.dueSoon.items.length === 0 ? (
              <PanelEmpty>No deadlines in the next 7 days.</PanelEmpty>
            ) : (
              <ul className="divide-y">
                {upcoming.dueSoon.items.slice(0, 5).map((issue) => (
                  <DueRow key={issue.id} issue={issue} today={today} />
                ))}
              </ul>
            )}
          </Panel>

          {sprints.length > 0 ? (
            <Panel title="Active sprints">
              <ul className="divide-y">
                {sprints.map((sprint) => (
                  <SprintRow key={sprint.id} sprint={sprint} />
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Recent activity">
            {activity.length === 0 ? (
              <PanelEmpty>New issues, status changes, and assignments show up here.</PanelEmpty>
            ) : (
              <ol className="grid gap-3 px-4 py-3">
                {activity.slice(0, 6).map((entry) => (
                  <li key={entry.id} className="min-w-0">
                    <IssueOpenButton issueId={entry.issueId} className="grid w-full text-left">
                      <span className="text-sm [overflow-wrap:anywhere]">{entry.summary}</span>
                      <span className="mt-0.5 truncate text-xs text-muted-foreground">
                        {entry.actorName} · {entry.issueKey} · {formatProjectDate(entry.createdAt)}
                      </span>
                    </IssueOpenButton>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      {active.length > 0 ? (
        <section aria-labelledby="home-projects" className="grid gap-3">
          <PanelHeading id="home-projects" title="Your projects" href="/projects" action="All projects" />
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {active.slice(0, 6).map((project) => (
              <ProjectTile key={project.id} project={project} />
            ))}
          </ul>
          {archived.length > 0 ? (
            <Link href="/projects?status=archived" className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Archive className="size-3.5" />
              {archived.length} archived {archived.length === 1 ? "project" : "projects"}
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function homeSummary(assigned: number, dueSoon: number, overdue: number, activeProjects: number) {
  if (activeProjects === 0) return "You have no active projects right now."
  if (assigned === 0) return "Nothing is assigned to you. A good moment to plan the next sprint."
  const parts = [`${assigned} ${assigned === 1 ? "issue is" : "issues are"} assigned to you`]
  if (overdue > 0) parts.push(`${overdue} overdue`)
  else if (dueSoon > 0) parts.push(`${dueSoon} due this week`)
  return `${parts.join(", ")}.`
}

function ArchivedOnly({ projects }: { projects: ProjectSummary[] }) {
  return (
    <section className="grid gap-4 rounded-xl border border-warning/40 bg-warning/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
          <Archive className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">All your projects are archived</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Archived projects are read-only: you can&apos;t create issues, assign work, or invite people there. Restore a project to
            keep working, or start a new one.
          </p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {projects.slice(0, 4).map((project) => {
          const canRestore = project.role === "owner" || project.role === "admin"
          return (
            <li key={project.id} className="flex min-w-0 items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
              <ProjectIcon name={project.icon} />
              <Link href={`/projects/${project.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                {project.name}
              </Link>
              {canRestore ? (
                <ArchiveProjectButton projectId={project.id} archived compact />
              ) : (
                <span className="text-xs text-muted-foreground">Ask an owner to restore</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function FirstRun() {
  const steps = [
    { icon: FolderPlus, title: "Create a project", body: "Give the work a name and a short key, like WEB. Issues are numbered WEB-1, WEB-2…" },
    { icon: UserPlus, title: "Invite your team", body: "Send invitations from the project's Members tab. People join when they accept." },
    { icon: Zap, title: "Plan a sprint", body: "Add issues to the backlog, pull them into a sprint, and track them on the board." },
  ]
  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Get started with FixTask</h2>
        <p className="mt-1 text-sm text-muted-foreground">Three steps to your first sprint.</p>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-lg border bg-muted/30 p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs text-accent-foreground">{index + 1}</span>
              {step.title}
            </span>
            <p className="mt-1.5 text-xs text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
      <CreateProjectButton className="w-fit">
        <FolderPlus />
        Create your first project
      </CreateProjectButton>
    </section>
  )
}

function Stat({ href, label, value, alert = false }: { href: string; label: string; value: number; alert?: boolean }) {
  return (
    <Link href={href} className="group bg-card px-4 py-3 transition-colors hover:bg-muted/40">
      <dt className="text-xs text-muted-foreground group-hover:text-foreground">{label}</dt>
      <dd className={alert ? "mt-1 text-2xl font-semibold tracking-tight text-destructive tabular-nums" : "mt-1 text-2xl font-semibold tracking-tight tabular-nums"}>
        {value}
      </dd>
    </Link>
  )
}

function PanelHeading({ id, title, href, action }: { id?: string; title: string; href?: string; action?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="text-sm font-semibold tracking-tight">{title}</h2>
      {href && action ? (
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {action}
          <ArrowRight className="size-3" />
        </Link>
      ) : null}
    </div>
  )
}

function Panel({ title, href, action, children }: { title: string; href?: string; action?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-2.5">
        <PanelHeading title={title} href={href} action={action} />
      </div>
      {children}
    </section>
  )
}

function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-sm text-muted-foreground">{children}</p>
}

function WorkRow({ issue, today }: { issue: MyWorkItem; today: string }) {
  const late = issue.dueDate !== null && issue.dueDate < today
  return (
    <li className="flex min-w-0 items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
      <span className={`size-2 shrink-0 rounded-full ${priorityDot(issue.priority)}`} title={`${issue.priority} priority`} />
      <div className="min-w-0 flex-1">
        <IssueOpenButton issueId={issue.id} className="block w-full truncate text-left text-sm font-medium hover:underline">
          {issue.title}
        </IssueOpenButton>
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-mono">{issueKey(issue.projectKey, issue.number)}</span> · {issue.projectName}
        </p>
      </div>
      <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">{issue.status}</span>
      {issue.dueDate ? (
        <span className={late ? "shrink-0 text-xs font-medium text-destructive" : "shrink-0 text-xs text-muted-foreground"}>
          {formatDueDate(issue.dueDate)}
        </span>
      ) : null}
    </li>
  )
}

function DueRow({ issue, today }: { issue: MyWorkItem; today: string }) {
  const late = issue.dueDate !== null && issue.dueDate < today
  return (
    <li className="min-w-0 px-4 py-2.5">
      <IssueOpenButton issueId={issue.id} className="block w-full truncate text-left text-sm font-medium hover:underline">
        {issue.title}
      </IssueOpenButton>
      <p className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate font-mono">{issueKey(issue.projectKey, issue.number)}</span>
        <span className={late ? "shrink-0 font-medium text-destructive" : "shrink-0"}>
          {late ? "Overdue · " : ""}
          {issue.dueDate ? formatDueDate(issue.dueDate) : ""}
        </span>
      </p>
    </li>
  )
}

function SprintRow({ sprint }: { sprint: HomeSprint }) {
  const total = sprint.open + sprint.done
  const percent = total === 0 ? 0 : Math.round((sprint.done / total) * 100)
  return (
    <li>
      <Link href={projectHref(sprint.projectId, "sprints")} className="block px-4 py-3 hover:bg-muted/40">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{sprint.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{percent}%</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {sprint.projectName}
          {sprint.endDate ? ` · ends ${formatDueDate(sprint.endDate)}` : ""}
        </span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
          <span className="block h-full bg-primary" style={{ width: `${percent}%` }} />
        </span>
      </Link>
    </li>
  )
}

function ProjectTile({ project }: { project: ProjectSummary }) {
  const accent = projectAccent(project.key)
  return (
    <li className="min-w-0">
      <Link
        href={projectHref(project.id, "board")}
        className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${accent.wash} ${accent.text}`}>
            <ProjectIcon name={project.icon} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{project.name}</span>
            <span className="block font-mono text-[11px] text-muted-foreground">{project.key}</span>
          </span>
        </span>
        <ProgressMeter done={project.doneIssueCount} open={project.openIssueCount} barClass={accent.bar} />
        <span className="mt-auto flex justify-end">
          <PersonStack people={project.roster} total={project.memberCount} />
        </span>
      </Link>
    </li>
  )
}
