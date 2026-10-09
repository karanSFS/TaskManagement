"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { LinkPending, RevealButton } from "@/components/shared/pending-ui"
import { Button } from "@/components/ui/button"
import { assignIssueToSprint, completeSprint, startSprint } from "@/lib/actions/sprints"
import { issueKey } from "@/lib/projects/format"
import type { SprintIssue, SprintSummary } from "@/lib/services/sprint.service"

const fieldClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export function BacklogList({
  projectId,
  projectKey,
  issues,
  sprints,
}: {
  projectId: string
  projectKey: string
  issues: SprintIssue[]
  sprints: { id: string; name: string }[]
}) {
  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground">The backlog is empty.</p>
  }

  return (
    <ul className="divide-y rounded-lg border bg-card">
      {issues.map((issue) => (
        <BacklogRow key={issue.id} projectId={projectId} projectKey={projectKey} issue={issue} sprints={sprints} />
      ))}
    </ul>
  )
}

function BacklogRow({
  projectId,
  projectKey,
  issue,
  sprints,
}: {
  projectId: string
  projectKey: string
  issue: SprintIssue
  sprints: { id: string; name: string }[]
}) {
  const [pending, startTransition] = useTransition()

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5">
      <IssueLine issueId={issue.id} projectKey={projectKey} number={issue.number} title={issue.title} status={issue.status} />
      {sprints.length > 0 ? (
        <select
          className={fieldClass}
          aria-label={`Add ${issue.title} to a sprint`}
          defaultValue=""
          disabled={pending}
          onChange={(event) => {
            const sprintId = event.target.value
            if (!sprintId) return
            event.target.value = ""
            startTransition(async () => {
              const result = await assignIssueToSprint(projectId, issue.id, sprintId)
              if (result?.error) toast.error(result.error)
            })
          }}
        >
          <option value="">Add to sprint</option>
          {sprints.map((sprint) => (
            <option key={sprint.id} value={sprint.id}>
              {sprint.name}
            </option>
          ))}
        </select>
      ) : null}
    </li>
  )
}

export function SprintList({
  projectId,
  projectKey,
  sprints,
}: {
  projectId: string
  projectKey: string
  sprints: SprintSummary[]
}) {
  if (sprints.length === 0) {
    return <p className="text-sm text-muted-foreground">No sprints yet. Plan one to start scheduling work.</p>
  }

  return (
    <div className="grid gap-4">
      {sprints.map((sprint) => (
        <SprintCard key={sprint.id} projectId={projectId} projectKey={projectKey} sprint={sprint} />
      ))}
    </div>
  )
}

function SprintCard({
  projectId,
  projectKey,
  sprint,
}: {
  projectId: string
  projectKey: string
  sprint: SprintSummary
}) {
  const [pending, startTransition] = useTransition()
  const done = sprint.issues.filter((issue) => issue.done).length
  const total = sprint.issues.length
  const dates = [sprint.startDate, sprint.endDate].filter(Boolean).join(" – ")

  return (
    <section className="grid gap-2 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">{sprint.name}</h2>
          <p className="text-xs text-muted-foreground">
            {sprint.status === "active" ? "Active" : sprint.status === "completed" ? "Completed" : "Planned"}
            {dates ? ` · ${dates}` : ""}
            {total > 0 ? ` · ${done}/${total} done` : ""}
          </p>
        </div>
        {sprint.status === "future" ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await startSprint(projectId, sprint.id)
                if (result?.error) toast.error(result.error)
                else toast.success(result?.success ?? "Sprint started.")
              })
            }}
          >
            {pending ? "Starting…" : "Start sprint"}
          </Button>
        ) : null}
        {sprint.status === "active" ? (
          <CompleteSprintButton projectId={projectId} sprintId={sprint.id} />
        ) : null}
      </div>
      {sprint.goal ? <p className="text-sm text-muted-foreground">{sprint.goal}</p> : null}
      {total > 0 ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${Math.round((done / total) * 100)}%` }} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No issues in this sprint.</p>
      )}
      {total > 0 ? (
        <ul className="divide-y rounded-lg border">
          {sprint.issues.map((issue) => (
            <li key={issue.id} className="flex items-center gap-3 px-3 py-2">
              <IssueLine issueId={issue.id} projectKey={projectKey} number={issue.number} title={issue.title} status={issue.status} />
              {sprint.status !== "completed" ? (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await assignIssueToSprint(projectId, issue.id, "")
                      if (result?.error) toast.error(result.error)
                    })
                  }}
                >
                  Backlog
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function IssueLine({
  issueId,
  projectKey,
  number,
  title,
  status,
}: {
  issueId: string
  projectKey: string
  number: number
  title: string
  status: string
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Link href={`/issues/${issueId}`} className="inline-flex w-24 shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:underline">
        <LinkPending />
        {issueKey(projectKey, number)}
      </Link>
      <IssueOpenButton issueId={issueId} className="min-w-0 flex-1 truncate text-left text-sm hover:underline">
        {title}
      </IssueOpenButton>
      <span className="hidden text-xs text-muted-foreground sm:inline">{status}</span>
    </div>
  )
}

function CompleteSprintButton({ projectId, sprintId }: { projectId: string; sprintId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  return (
    <>
      <RevealButton type="button" size="sm" variant="outline" disabled={pending} onReveal={() => setOpen(true)}>
        {pending ? "Completing…" : "Complete sprint"}
      </RevealButton>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Complete this sprint?"
        description="Issues that are not done return to the backlog."
        confirmLabel="Complete sprint"
        pending={pending}
        onConfirm={() => {
          startTransition(async () => {
            const result = await completeSprint(projectId, sprintId)
            if (result?.error) {
              toast.error(result.error)
              return
            }
            toast.success(result?.success ?? "Sprint completed.")
            setOpen(false)
          })
        }}
      />
    </>
  )
}
