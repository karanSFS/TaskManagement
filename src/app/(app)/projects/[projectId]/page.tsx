import Link from "next/link"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { CircleDot } from "lucide-react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { EditProjectButton } from "@/components/projects/create-project-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { DetailSkeleton } from "@/components/shared/page-skeleton"
import { LinkPending } from "@/components/shared/pending-ui"
import { MetricLink, ProgressMeter, StatusChip } from "@/components/shared/visual"
import { isProjectIcon } from "@/lib/projects/icons"
import { getCurrentUser } from "@/lib/auth/session"
import { formatProjectDate, issueKey, roleLabel } from "@/lib/projects/format"
import { getIssueCatalog } from "@/lib/services/issue.service"
import { getProject } from "@/lib/services/project.service"

export const metadata = { title: "Project" }

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ProjectOverview params={params} />
    </Suspense>
  )
}

async function ProjectOverview({ params }: { params: Promise<{ projectId: string }> }) {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()])
  if (!user) {
    return null
  }

  const [project, catalog] = await Promise.all([getProject(projectId, user.id), getIssueCatalog()])
  if (!project) {
    notFound()
  }

  const doneStatus = catalog.statuses.find((status) => status.category === "done")

  const totalIssues = project.openIssueCount + project.doneIssueCount
  const canEdit = project.role === "owner" || project.role === "admin" || project.leadId === user.id
  const leadId = project.leadId && project.members.some((member) => member.userId === project.leadId) ? project.leadId : project.members[0]?.userId

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground [overflow-wrap:anywhere]">{project.description || "No description yet."}</p>
        {canEdit && leadId ? (
          <EditProjectButton
            projectId={project.id}
            members={project.members.map((member) => ({ id: member.userId, name: member.name }))}
            defaultValues={{
              name: project.name,
              key: project.key,
              description: project.description,
              icon: project.icon && isProjectIcon(project.icon) ? project.icon : "",
              leadId,
            }}
          />
        ) : null}
      </div>
      <div className="rounded-xl border bg-card px-3 py-3 shadow-sm">
        <ProgressMeter done={project.doneIssueCount} open={project.openIssueCount} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricLink label="Open issues" value={project.openIssueCount} hint="Not done in this project" tone="bg-info" href={`/projects/${project.id}/issues`} />
        <MetricLink label="Done" value={project.doneIssueCount} hint="Completed in this project" tone="bg-success" href={doneStatus ? `/projects/${project.id}/issues?statusId=${doneStatus.id}` : undefined} />
        <MetricLink label="Members" value={project.memberCount} hint={`${roleLabel(project.role)} · lead ${project.leadName}`} tone="bg-primary" href={`/projects/${project.id}/members`} />
      </div>
      <p className="text-xs text-muted-foreground">Created {formatProjectDate(project.createdAt)} · next number {issueKey(project.key, project.nextIssueNumber)}</p>
      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Recent issues</h2>
          <div className="flex items-center gap-3 text-sm font-medium">
            {totalIssues > 0 ? (
              <Link href={`/projects/${project.id}/issues`} className="text-muted-foreground hover:underline">
                View all
              </Link>
            ) : null}
            {project.archivedAt ? null : (
              <CreateIssueButton projectId={project.id} size="sm" variant="ghost">
                New issue
              </CreateIssueButton>
            )}
          </div>
        </div>
        {project.archivedAt ? (
          <p className="text-sm text-muted-foreground">
            This project is archived. Restore it in settings to file new issues.
          </p>
        ) : null}
        {project.issues.length === 0 ? (
          <EmptyState
            icon={CircleDot}
            title="No issues yet"
            description={project.archivedAt ? "This project is archived, so new issues stay closed until it is restored." : "Create an issue to start tracking work in this project."}
            action={
              project.archivedAt ? undefined : (
                <CreateIssueButton projectId={project.id} size="sm">
                  New issue
                </CreateIssueButton>
              )
            }
          />
        ) : null}
        {project.issues.length > 0 ? (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
            {project.issues.map((issue) => (
              <li key={issue.id} className="min-w-0">
                <div className="grid min-w-0 gap-1 px-3 py-2.5 text-sm hover:bg-muted/40 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-3">
                  <Link href={`/issues/${issue.id}`} className="inline-flex w-fit items-center gap-1 font-mono text-xs text-muted-foreground hover:underline">
                    <LinkPending />
                    {issueKey(project.key, issue.number)}
                  </Link>
                  <div className="grid min-w-0 gap-1">
                    <IssueOpenButton issueId={issue.id} className="min-w-0 truncate text-left font-medium">{issue.title}</IssueOpenButton>
                    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <StatusChip name={issue.status} category={issue.category} />
                      <span className="max-w-40 truncate">{issue.sprintName ?? "Backlog"}</span>
                      <span className="max-w-40 truncate">{issue.assigneeName ?? "Unassigned"}</span>
                      <span>{formatProjectDate(issue.updatedAt)}</span>
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}

