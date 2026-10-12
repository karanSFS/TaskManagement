"use client"

import Link from "next/link"
import { createContext, Suspense, use, useContext, useState, useTransition, type ReactNode } from "react"
import { Loader2, Maximize2 } from "lucide-react"

import { CommentSection } from "@/components/issues/comment-section"
import { ReopenIssue } from "@/components/issues/reopen-issue"
import { DeleteIssueButton } from "@/components/issues/delete-issue-button"
import {
  CopyLinkButton,
  InlineDescription,
  InlineTitle,
  IssueChangedProvider,
  IssueDetailsPanel,
  IssueValuesProvider,
} from "@/components/issues/issue-inline"
import { FormSheet } from "@/components/shared/form-dialog"
import { LinkPending, usePromisePending } from "@/components/shared/pending-ui"
import { Button } from "@/components/ui/button"
import { loadIssueDrawer } from "@/lib/actions/issues"
import { issueKey } from "@/lib/projects/format"

type DrawerData = Awaited<ReturnType<typeof loadIssueDrawer>>

const OpenIssueContext = createContext<{ open: (issueId: string) => void; pendingId: string | null }>({
  open: () => undefined,
  pendingId: null,
})

export function IssueDrawerProvider({ children }: { children: ReactNode }) {
  const [issueId, setIssueId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [requestState, setRequestState] = useState<{ id: string | null; promise: Promise<DrawerData> | null }>({
    id: null,
    promise: null,
  })
  if (issueId !== requestState.id) {
    setRequestState({
      id: issueId,
      promise: issueId ? loadIssueDrawer(issueId) : null,
    })
  }
  const request = requestState.promise
  const pending = usePromisePending(request)

  function reload() {
    if (!issueId) return
    startTransition(() => setRequestState({ id: issueId, promise: loadIssueDrawer(issueId) }))
  }

  return (
    <OpenIssueContext.Provider value={{ open: setIssueId, pendingId: pending ? issueId : null }}>
      {children}
      {issueId && request ? (
        <Suspense
          fallback={
            <FormSheet open title="Issue" description="Loading this issue." onOpenChange={(next) => { if (!next) setIssueId(null) }}>
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading issue…
              </p>
            </FormSheet>
          }
        >
          <IssueChangedProvider onChanged={reload}>
            <LoadedDrawer request={request} onClose={() => setIssueId(null)} />
          </IssueChangedProvider>
        </Suspense>
      ) : null}
    </OpenIssueContext.Provider>
  )
}

export function useOpenIssue() {
  return useContext(OpenIssueContext).open
}

export function IssueOpenButton({
  issueId,
  className,
  children,
}: {
  issueId: string
  className?: string
  children: ReactNode
}) {
  const { open, pendingId } = useContext(OpenIssueContext)
  const pending = pendingId === issueId
  return (
    <button type="button" className={className} aria-busy={pending || undefined} onClick={() => open(issueId)}>
      {pending ? <Loader2 className="mr-1 inline size-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
}

function LoadedDrawer({ request, onClose }: { request: Promise<DrawerData>; onClose: () => void }) {
  const data = use(request)
  if ("error" in data && data.error) {
    return (
      <FormSheet open title="Issue" description="This issue could not be opened." onOpenChange={(next) => { if (!next) onClose() }}>
        <p className="text-sm text-destructive" role="alert">
          {data.error}
        </p>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </FormSheet>
    )
  }
  if (!("issue" in data)) return null
  const { issue, userId } = data
  const key = issueKey(issue.projectKey, issue.number)

  return (
    <FormSheet
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={key}
      description={issue.projectArchived ? `${issue.projectName} · archived, read-only` : issue.projectName}
      className="data-[side=right]:sm:max-w-2xl"
    >
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
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/issues/${issue.id}`} onClick={onClose}>
              <LinkPending />
              <Maximize2 />
              Open full page
            </Link>
          </Button>
          <CopyLinkButton path={`/issues/${issue.id}`} />
          {issue.canDelete && !issue.projectArchived ? (
            <span className="ml-auto">
              <DeleteIssueButton issueId={issue.id} issueKey={key} onDeleted={onClose} />
            </span>
          ) : null}
        </div>

        <InlineTitle />

        <div className="rounded-xl border bg-muted/20 p-3">
          <IssueDetailsPanel
            types={data.types}
            statuses={data.statuses}
            priorities={data.priorities}
            members={issue.members}
            currentUserId={userId}
            reporterName={issue.reporterName}
            createdAt={issue.createdAt}
            updatedAt={issue.updatedAt}
          />
        </div>

        <InlineDescription />

        <ReopenIssue
          issueId={issue.id}
          statuses={data.statuses}
          assigneeName={issue.members.find((member) => member.id === issue.assigneeId)?.name}
        />

        {issue.labels.length > 0 || issue.subtasks.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {[
              issue.labels.length > 0 ? `Labels: ${issue.labels.map((label) => label.name).join(", ")}` : null,
              issue.subtasks.length > 0 ? `${issue.subtasks.length} ${issue.subtasks.length === 1 ? "subtask" : "subtasks"}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            {" · "}
            <Link href={`/issues/${issue.id}`} className="font-medium text-primary hover:underline" onClick={onClose}>
              manage on the full page
            </Link>
          </p>
        ) : null}

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold">
            Comments {issue.comments.length > 0 ? <span className="text-muted-foreground">({issue.comments.length})</span> : null}
          </h2>
          <CommentSection
            issueId={issue.id}
            currentUserId={userId}
            comments={issue.comments}
            canComment={!issue.projectArchived}
            mentionNames={issue.members.filter((member) => member.id !== userId).map((member) => member.name)}
          />
        </section>
      </IssueValuesProvider>
    </FormSheet>
  )
}
