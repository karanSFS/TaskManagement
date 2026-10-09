"use client"

import Link from "next/link"
import { createContext, Suspense, use, useContext, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { DeleteIssueButton } from "@/components/issues/delete-issue-button"
import { IssueEditor } from "@/components/issues/issue-editor"
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

  return (
    <OpenIssueContext.Provider value={{ open: setIssueId, pendingId: pending ? issueId : null }}>
      {children}
      {issueId && request ? (
        <Suspense
          fallback={
            <FormSheet open title="Issue" description="Loading this issue." onOpenChange={(next) => { if (!next) setIssueId(null) }}>
              <p className="text-sm text-muted-foreground" role="status">
                Loading issue…
              </p>
            </FormSheet>
          }
        >
          <LoadedDrawer request={request} onClose={() => setIssueId(null)} />
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
  const { issue } = data
  const key = issueKey(issue.projectKey, issue.number)

  return (
    <FormSheet
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={issue.title}
      description={`${key} · ${issue.projectName}`}
      className="data-[side=right]:sm:max-w-2xl"
    >
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/issues/${issue.id}`}>
            <LinkPending />
            Open full page
          </Link>
        </Button>
        {issue.canDelete ? <DeleteIssueButton issueId={issue.id} issueKey={key} /> : null}
      </div>
      <IssueEditor
        issueId={issue.id}
        types={data.types}
        statuses={data.statuses}
        priorities={data.priorities}
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
        onSaved={onClose}
      />
    </FormSheet>
  )
}
