import Link from "next/link"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { CircleDot } from "lucide-react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { EditProjectButton } from "@/components/projects/create-project-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { LinkPending } from "@/components/shared/pending-ui"
import { Skeleton } from "@/components/ui/skeleton"
import { isProjectIcon } from "@/lib/projects/icons"
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

  const totalIssues = project.openIssueCount + project.doneIssueCount
  const canEdit = project.role === "owner" || project.role === "admin" || project.leadId === user.id
  const leadId = project.leadId && project.members.some((member) => member.userId === project.leadId) ? project.leadId : project.members[0]?.userId

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{project.description || "No description yet."}</p>
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
      <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open issues" value={String(project.openIssueCount)} />
        <Stat label="Done" value={String(project.doneIssueCount)} />
        <Stat label="Members" value={String(project.memberCount)} />
        <Stat label="Your role" value={roleLabel(project.role)} />
      </dl>
      <dl className="grid gap-2 sm:grid-cols-2">
        <Stat label="Lead" value={project.leadName} />
        <Stat label="Created" value={formatProjectDate(project.createdAt)} />
      </dl>
      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Recent issues</h2>
          <div className="flex items-center gap-3 text-sm font-medium">
            {totalIssues > 0 ? (
              <Link href={`/issues?projectId=${project.id}`} className="text-muted-foreground hover:underline">
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
        <p className="text-sm text-muted-foreground">
          {project.openIssueCount} open · {project.doneIssueCount} done · next number {issueKey(project.key, project.nextIssueNumber)}
        </p>
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
          <ul className="divide-y rounded-lg border bg-card">
            {project.issues.map((issue) => (
              <li key={issue.id}>
                <div className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                  <Link href={`/issues/${issue.id}`} className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:underline">
                    <LinkPending />
                    {issueKey(project.key, issue.number)}
                  </Link>
                  <IssueOpenButton issueId={issue.id} className="min-w-0 flex-1 truncate text-left">{issue.title}</IssueOpenButton>
                  <span className="text-xs text-muted-foreground">{issue.status}</span>
                </div>
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
