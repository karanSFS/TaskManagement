import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { AttachmentSection } from "@/components/issues/attachment-section"
import { CommentSection } from "@/components/issues/comment-section"
import { DeleteIssueButton } from "@/components/issues/delete-issue-button"
import { EditIssueButton } from "@/components/issues/issue-editor"
import { LabelEditor } from "@/components/issues/label-editor"
import { LinkSection } from "@/components/issues/link-section"
import { SubtaskSection } from "@/components/issues/subtask-section"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { formatDueDate, formatProjectDate, issueKey } from "@/lib/projects/format"
import { getIssue, getIssueCatalog } from "@/lib/services/issue.service"
import { listIssueAttachments } from "@/lib/services/attachment.service"

export const metadata = { title: "Issue" }

export default function IssuePage({ params }: { params: Promise<{ issueId: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <IssueContent params={params} />
    </Suspense>
  )
}

async function IssueContent({ params }: { params: Promise<{ issueId: string }> }) {
  const [{ issueId }, user] = await Promise.all([params, getCurrentUser()])
  if (!user || !isUuid(issueId)) notFound()

  const [issue, catalog, attachments] = await Promise.all([
    getIssue(issueId, user.id),
    getIssueCatalog(),
    listIssueAttachments(user.id, issueId),
  ])
  if (!issue) notFound()

  const status = catalog.statuses.find((item) => item.id === issue.statusId)
  const priority = catalog.priorities.find((item) => item.id === issue.priorityId)
  const type = catalog.types.find((item) => item.id === issue.typeId)
  const assignee = issue.members.find((member) => member.id === issue.assigneeId)?.name ?? "Unassigned"

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/projects/${issue.projectId}`} className="text-sm text-muted-foreground hover:underline">
              {issue.projectName}
            </Link>
            <Badge variant="outline">{issueKey(issue.projectKey, issue.number)}</Badge>
            {type ? <Badge variant="outline">{type.name}</Badge> : null}
            {status ? <Badge variant="secondary">{status.name}</Badge> : null}
            {priority ? <Badge variant="outline">{priority.name}</Badge> : null}
            {issue.projectArchived ? <Badge variant="secondary">Project archived</Badge> : null}
          </div>
          <h1 className="mt-2 text-lg font-semibold tracking-tight">{issue.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {issue.canEdit ? (
            <EditIssueButton
              issueId={issue.id}
              types={catalog.types}
              statuses={catalog.statuses}
              priorities={catalog.priorities}
              members={issue.members}
              defaultValues={{
                title: issue.title,
                description: issue.description,
                issueTypeId: issue.typeId,
                statusId: issue.statusId,
                priorityId: issue.priorityId,
                assigneeId: issue.assigneeId,
                dueDate: issue.dueDate,
              }}
            />
          ) : null}
          {issue.canDelete ? <DeleteIssueButton issueId={issue.id} issueKey={issueKey(issue.projectKey, issue.number)} /> : null}
        </div>
      </div>
      <dl className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Reporter" value={issue.reporterName} hint="Created this issue" />
        <Meta label="Assignee" value={assignee} hint="Responsible for the work" />
        <Meta label="Updated" value={formatProjectDate(issue.updatedAt)} />
        <Meta label="Due" value={issue.dueDate ? formatDueDate(issue.dueDate) : "No due date"} />
      </dl>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-6">
          <section className="rounded-lg border bg-card px-3 py-3">
            <h2 className="text-sm font-medium">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{issue.description || "No description yet."}</p>
          </section>
          <CommentSection
            issueId={issue.id}
            currentUserId={user.id}
            comments={issue.comments}
            mentionNames={issue.members.filter((member) => member.id !== user.id).map((member) => member.name)}
          />
          <SubtaskSection
            issueId={issue.id}
            projectKey={issue.projectKey}
            parent={issue.parent}
            subtasks={issue.subtasks}
            archived={issue.projectArchived}
          />
        </div>
        <div className="grid gap-4">
          <LabelEditor issueId={issue.id} labels={issue.labels} projectLabels={issue.projectLabels} />
          <AttachmentSection issueId={issue.id} projectId={issue.projectId} attachments={attachments} />
          <LinkSection issueId={issue.id} links={issue.links} choices={issue.linkChoices} />
          <section className="grid gap-2">
            <h2 className="text-sm font-medium">History</h2>
            {issue.history.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
            <ul className="grid gap-2">
              {issue.history.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <p>{entry.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actorName} · {formatProjectDate(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
