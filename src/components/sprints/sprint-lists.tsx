"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { LinkPending, RevealButton } from "@/components/shared/pending-ui"
import { PriorityMark } from "@/components/shared/priority-mark"
import { ProgressMeter, StatusChip } from "@/components/shared/visual"
import { EditSprintButton } from "@/components/sprints/create-sprint-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { assignIssueToSprint, completeSprint, deleteSprint, startSprint } from "@/lib/actions/sprints"
import { projectHref } from "@/lib/config/nav"
import { issueKey } from "@/lib/projects/format"
import type { SprintIssue, SprintSummary } from "@/lib/services/sprint.service"

type SprintOption = { id: string; name: string }

export function BacklogList({
  projectId,
  projectKey,
  issues,
  sprints,
}: {
  projectId: string
  projectKey: string
  issues: SprintIssue[]
  sprints: SprintOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function move(issueId: string, sprintId: string, sprintName: string) {
    startTransition(async () => {
      const result = await assignIssueToSprint(projectId, issueId, sprintId)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Added to ${sprintName}.`)
      router.refresh()
    })
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {issues.map((issue) => (
        <li key={issue.id} className="flex min-w-0 flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
          <IssueLine projectKey={projectKey} issue={issue} />
          {sprints.length > 0 ? (
            <MoveMenu
              label="Add to sprint"
              title={`Add ${issue.title} to a sprint`}
              pending={pending}
              options={sprints}
              onPick={(sprintId) => {
                const sprint = sprints.find((item) => item.id === sprintId)
                if (sprint) move(issue.id, sprint.id, sprint.name)
              }}
            />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function SprintList({
  projectId,
  projectKey,
  sprints,
  canManage,
  readOnly,
}: {
  projectId: string
  projectKey: string
  sprints: SprintSummary[]
  canManage: boolean
  readOnly: boolean
}) {
  const active = sprints.find((sprint) => sprint.status === "active") ?? null
  const planned = sprints.filter((sprint) => sprint.status === "future")
  const completed = sprints.filter((sprint) => sprint.status === "completed")
  const openSprints = sprints
    .filter((sprint) => sprint.status !== "completed")
    .map((sprint) => ({ id: sprint.id, name: sprint.name }))

  return (
    <div className="grid gap-6">
      <section aria-labelledby="active-sprint" className="grid gap-2">
        <h2 id="active-sprint" className="text-sm font-semibold tracking-tight">Active</h2>
        {active ? (
          <SprintCard
            projectId={projectId}
            projectKey={projectKey}
            sprint={active}
            openSprints={openSprints}
            canManage={canManage}
            readOnly={readOnly}
            blocked={false}
          />
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
            No sprint is running. Start a planned sprint when the team is ready to work from the board.
          </p>
        )}
      </section>

      <section aria-labelledby="planned-sprints" className="grid gap-2">
        <h2 id="planned-sprints" className="text-sm font-semibold tracking-tight">
          Planned {planned.length > 0 ? <span className="text-muted-foreground">({planned.length})</span> : null}
        </h2>
        {planned.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
            Nothing is planned yet. Plan a sprint, then add issues from the backlog.
          </p>
        ) : (
          <div className="grid gap-3">
            {planned.map((sprint) => (
              <SprintCard
                key={sprint.id}
                projectId={projectId}
                projectKey={projectKey}
                sprint={sprint}
                openSprints={openSprints}
                canManage={canManage}
                readOnly={readOnly}
                blocked={active !== null}
              />
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 ? (
        <details className="grid gap-2">
          <summary className="cursor-pointer text-sm font-semibold tracking-tight text-muted-foreground hover:text-foreground">
            Completed ({completed.length})
          </summary>
          <div className="mt-2 grid gap-3">
            {completed.map((sprint) => (
              <SprintCard
                key={sprint.id}
                projectId={projectId}
                projectKey={projectKey}
                sprint={sprint}
                openSprints={[]}
                canManage={false}
                readOnly
                blocked={false}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}

function SprintCard({
  projectId,
  projectKey,
  sprint,
  openSprints,
  canManage,
  readOnly,
  blocked,
}: {
  projectId: string
  projectKey: string
  sprint: SprintSummary
  openSprints: SprintOption[]
  canManage: boolean
  readOnly: boolean
  blocked: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const done = sprint.issues.filter((issue) => issue.done).length
  const total = sprint.issues.length
  const destinations = [
    ...openSprints.filter((option) => option.id !== sprint.id),
    { id: "", name: "Backlog" },
  ]

  function move(issueId: string, sprintId: string) {
    const name = destinations.find((option) => option.id === sprintId)?.name ?? "the sprint"
    startTransition(async () => {
      const result = await assignIssueToSprint(projectId, issueId, sprintId)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(sprintId ? `Moved to ${name}.` : "Returned to the backlog.")
      router.refresh()
    })
  }

  return (
    <section className="grid gap-3 overflow-hidden rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">{sprint.name}</h3>
            <Badge variant={sprint.status === "active" ? "default" : "secondary"}>{sprintLabel(sprint.status)}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formatSprintDates(sprint.startDate, sprint.endDate)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sprint.status === "active" ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`${projectHref(projectId, "board")}?scope=sprint`}>Open on board</Link>
            </Button>
          ) : null}
          {!readOnly && sprint.status !== "completed" ? (
            <EditSprintButton
              sprintId={sprint.id}
              name={sprint.name}
              goal={sprint.goal}
              startDate={sprint.startDate}
              endDate={sprint.endDate}
            />
          ) : null}
          {!readOnly && sprint.status === "future" ? (
            <Button
              type="button"
              size="sm"
              disabled={pending || blocked}
              title={blocked ? "Complete the active sprint first." : undefined}
              onClick={() => {
                startTransition(async () => {
                  const result = await startSprint(projectId, sprint.id)
                  if (result?.error) toast.error(result.error)
                  else {
                    toast.success(result?.success ?? "Sprint started.")
                    router.refresh()
                  }
                })
              }}
            >
              {pending ? "Starting…" : "Start"}
            </Button>
          ) : null}
          {sprint.status === "active" ? <CompleteSprintButton projectId={projectId} sprintId={sprint.id} /> : null}
          {!readOnly && canManage && sprint.status === "future" ? (
            <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>
      {sprint.goal ? <p className="text-sm [overflow-wrap:anywhere]">{sprint.goal}</p> : null}
      <ProgressMeter done={done} open={total - done} />
      {total > 0 ? (
        <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
          {sprint.issues.map((issue) => (
            <li key={issue.id} className="flex min-w-0 flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center">
              <IssueLine projectKey={projectKey} issue={issue} />
              {!readOnly && sprint.status !== "completed" ? (
                <MoveMenu
                  label="Move"
                  title={`Move ${issue.title}`}
                  pending={pending}
                  options={destinations}
                  onPick={(sprintId) => move(issue.id, sprintId)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : sprint.status !== "completed" ? (
        <p className="text-sm text-muted-foreground">No issues yet. Add them from the backlog.</p>
      ) : (
        <p className="text-sm text-muted-foreground">No issues were recorded in this sprint.</p>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${sprint.name}?`}
        description="This planned sprint is removed. Issues in it return to the backlog."
        confirmLabel="Delete sprint"
        pending={pending}
        destructive
        onConfirm={() => {
          startTransition(async () => {
            const result = await deleteSprint(projectId, sprint.id)
            if (result?.error) {
              toast.error(result.error)
              return
            }
            toast.success(result?.success ?? "Sprint deleted.")
            setConfirmDelete(false)
            router.refresh()
          })
        }}
      />
    </section>
  )
}

function MoveMenu({
  label,
  title,
  pending,
  options,
  onPick,
}: {
  label: string
  title: string
  pending: boolean
  options: SprintOption[]
  onPick: (sprintId: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="w-full shrink-0 sm:w-auto" disabled={pending} aria-label={title}>
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {options.map((option) => (
          <DropdownMenuItem key={option.id || "backlog"} onSelect={() => onPick(option.id)}>
            <span className="truncate">{option.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function IssueLine({ projectKey, issue }: { projectKey: string; issue: SprintIssue }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2">
        <Link href={`/issues/${issue.id}`} className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground hover:underline">
          <LinkPending />
          {issueKey(projectKey, issue.number)}
        </Link>
        <IssueOpenButton issueId={issue.id} className="min-w-0 flex-1 truncate text-left text-sm hover:underline">
          {issue.title}
        </IssueOpenButton>
      </div>
      <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <StatusChip name={issue.status} done={issue.done} />
        <PriorityMark name={issue.priority} />
        <span className="truncate">{issue.assigneeName ?? "Unassigned"}</span>
      </p>
    </div>
  )
}

function CompleteSprintButton({ projectId, sprintId }: { projectId: string; sprintId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  return (
    <>
      <RevealButton type="button" size="sm" variant="outline" disabled={pending} onReveal={() => setOpen(true)}>
        {pending ? "Completing…" : "Complete"}
      </RevealButton>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Complete this sprint?"
        description="Issues that are not done return to the backlog. This sprint stays as a record and cannot take new work."
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
            router.refresh()
          })
        }}
      />
    </>
  )
}

function sprintLabel(status: SprintSummary["status"]) {
  if (status === "active") return "Active"
  if (status === "completed") return "Completed"
  return "Planned"
}

function formatSprintDates(start: string, end: string) {
  if (!start && !end) return "No dates set"
  if (start && end) return `${formatDay(start)} – ${formatDay(end)}`
  if (start) return `Starts ${formatDay(start)}`
  return `Ends ${formatDay(end)}`
}

function formatDay(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)))
}
