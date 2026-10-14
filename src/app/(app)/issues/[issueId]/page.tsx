import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ChevronRight } from "lucide-react"

import { ActivityTabs } from "@/components/issues/activity-tabs"
import { AttachmentSection } from "@/components/issues/attachment-section"
import { CommentSection } from "@/components/issues/comment-section"
import { DeleteIssueButton } from "@/components/issues/delete-issue-button"
import { CopyLinkButton, InlineDescription, InlineTitle, IssueDetailsPanel, IssueValuesProvider } from "@/components/issues/issue-inline"
import { LabelEditor } from "@/components/issues/label-editor"
import { ReopenIssue } from "@/components/issues/reopen-issue"
import { LinkSection } from "@/components/issues/link-section"
import { SubtaskSection } from "@/components/issues/subtask-section"
import { DetailSkeleton } from "@/components/shared/page-skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { projectHref } from "@/lib/config/nav"
import { formatProjectDate, issueKey } from "@/lib/projects/format"
import { listIssueAttachments } from "@/lib/services/attachment.service"
import { getIssue, getIssueCatalog } from "@/lib/services/issue.service"

export const metadata = { title: "Issue" }

export default function IssuePage({ params }: { params: Promise<{ issueId: string }> }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
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

  const key = issueKey(issue.projectKey, issue.number)

  return (
    <IssueValuesProvider
      issueId={issue.id}
      canEdit={issue.canEdit && !issue.projectArchived}
      initial={{
        title: issue.title,
        description: issue.description,
        issueTypeId: issue.typeId,
        statusId: issue.statusId,
        priorityId: issue.priorityId,
        assigneeId: issue.assigneeId,
        dueDate: issue.dueDate,
      }}
    >
      <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <Link href={projectHref(issue.projectId, "board")} className="truncate hover:text-foreground hover:underline">
              {issue.projectName}
            </Link>
            <ChevronRight className="size-3.5 shrink-0" />
            <span className="shrink-0 font-mono text-xs text-foreground">{key}</span>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <CopyLinkButton path={`/issues/${issue.id}`} />
            {issue.canDelete && !issue.projectArchived ? <DeleteIssueButton issueId={issue.id} issueKey={key} /> : null}
          </div>
        </div>

        {issue.projectArchived ? (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
            This project is archived, so the issue is read-only.
          </p>
        ) : null}

        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="grid min-w-0 gap-6">
            <InlineTitle className="text-2xl" />
            <InlineDescription />
            <ReopenIssue
              issueId={issue.id}
              statuses={catalog.statuses}
              assigneeName={issue.members.find((member) => member.id === issue.assigneeId)?.name}
            />
            <SubtaskSection
              issueId={issue.id}
              projectKey={issue.projectKey}
              parent={issue.parent}
              subtasks={issue.subtasks}
              archived={issue.projectArchived}
            />
            <LinkSection issueId={issue.id} links={issue.links} choices={issue.linkChoices} readOnly={issue.projectArchived} />
            <AttachmentSection issueId={issue.id} projectId={issue.projectId} attachments={attachments} readOnly={issue.projectArchived} />
            <ActivityTabs
              commentCount={issue.comments.length}
              comments={
                <CommentSection
                  issueId={issue.id}
                  currentUserId={user.id}
                  comments={issue.comments}
                  canComment={!issue.projectArchived}
                  mentionNames={issue.members.filter((member) => member.id !== user.id).map((member) => member.name)}
                />
              }
              history={
                issue.history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
                ) : (
                  <ol className="grid gap-3">
                    {issue.history.map((entry) => (
                      <li key={entry.id} className="grid gap-0.5 border-l-2 pl-3">
                        <p className="text-sm [overflow-wrap:anywhere]">{entry.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.actorName} · {formatProjectDate(entry.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )
              }
            />
          </div>

          <aside className="grid min-w-0 gap-5 lg:sticky lg:top-4">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Details</h2>
              <IssueDetailsPanel
                issueId={issue.id}
                projectId={issue.projectId}
                types={catalog.types}
                statuses={catalog.statuses}
                priorities={catalog.priorities}
                members={issue.members}
                currentUserId={user.id}
                reporterName={issue.reporterName}
                createdAt={issue.createdAt}
                updatedAt={issue.updatedAt}
                sprint={issue.sprint}
                openSprints={issue.openSprints}
              />
            </div>
            <div className="rounded-xl border bg-card p-4">
              <LabelEditor issueId={issue.id} labels={issue.labels} projectLabels={issue.projectLabels} readOnly={issue.projectArchived} />
            </div>
          </aside>
        </div>
      </div>
    </IssueValuesProvider>
  )
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
