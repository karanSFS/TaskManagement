"use client"

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { GripVertical } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { LinkPending, RevealButton } from "@/components/shared/pending-ui"
import { EditSprintButton } from "@/components/sprints/create-sprint-form"
import { Badge } from "@/components/ui/badge"
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
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function onDragEnd(event: DragEndEvent) {
    const issueId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : ""
    if (!overId.startsWith("sprint:") || pending) return
    move(issueId, overId.slice("sprint:".length))
  }

  function move(issueId: string, sprintId: string) {
    startTransition(async () => {
      const result = await assignIssueToSprint(projectId, issueId, sprintId)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(result?.success ?? "Sprint updated.")
      router.refresh()
    })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid gap-3">
        {sprints.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <p className="w-full text-xs text-muted-foreground">Drag an issue onto a sprint, or choose one in the row.</p>
            {sprints.map((sprint) => (
              <SprintDrop key={sprint.id} sprint={sprint} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Plan a sprint before these issues can be scheduled.</p>
        )}
        <ul className="divide-y rounded-lg border bg-card">
          {issues.map((issue) => (
            <BacklogRow
              key={issue.id}
              projectKey={projectKey}
              issue={issue}
              sprints={sprints}
              pending={pending}
              onMove={move}
            />
          ))}
        </ul>
      </div>
    </DndContext>
  )
}

function SprintDrop({ sprint }: { sprint: { id: string; name: string } }) {
  const { setNodeRef, isOver } = useDroppable({ id: `sprint:${sprint.id}` })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-full border px-3 py-1 text-xs ${isOver ? "border-ring bg-primary/10" : "bg-card"}`}
    >
      {sprint.name}
    </div>
  )
}

function BacklogRow({
  projectKey,
  issue,
  sprints,
  pending,
  onMove,
}: {
  projectKey: string
  issue: SprintIssue
  sprints: { id: string; name: string }[]
  pending: boolean
  onMove: (issueId: string, sprintId: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: issue.id, disabled: pending || sprints.length === 0 })

  return (
    <li ref={setNodeRef} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${isDragging ? "opacity-40" : ""}`}>
      {sprints.length > 0 ? (
        <button type="button" className="text-muted-foreground" aria-label={`Drag ${issue.title}`} {...attributes} {...listeners}>
          <GripVertical className="size-3.5" />
        </button>
      ) : null}
      <IssueLine projectKey={projectKey} issue={issue} />
      {sprints.length > 0 ? (
        <select
          className={fieldClass}
          aria-label={`Add ${issue.title} to a sprint`}
          defaultValue=""
          disabled={pending}
          onChange={(event) => {
            const sprintId = event.target.value
            if (!sprintId) return
            event.currentTarget.value = ""
            onMove(issue.id, sprintId)
          }}
        >
          <option value="">Add to sprint</option>
          {sprints.map((sprint) => (
            <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
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
  const hasActive = sprints.some((sprint) => sprint.status === "active")

  return (
    <div className="grid gap-4">
      {sprints.map((sprint) => (
        <SprintCard key={sprint.id} projectId={projectId} projectKey={projectKey} sprint={sprint} hasActive={hasActive} />
      ))}
    </div>
  )
}

function SprintCard({
  projectId,
  projectKey,
  sprint,
  hasActive,
}: {
  projectId: string
  projectKey: string
  sprint: SprintSummary
  hasActive: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const done = sprint.issues.filter((issue) => issue.done).length
  const total = sprint.issues.length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const dates = formatSprintDates(sprint.startDate, sprint.endDate)

  function returnToBacklog(issueId: string) {
    startTransition(async () => {
      const result = await assignIssueToSprint(projectId, issueId, "")
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(result?.success ?? "Issue returned to the backlog.")
      router.refresh()
    })
  }

  return (
    <section className="grid gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium">{sprint.name}</h2>
            <Badge variant={sprint.status === "active" ? "default" : "secondary"}>{sprintLabel(sprint.status)}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{dates}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sprint.status !== "completed" ? (
            <EditSprintButton
              sprintId={sprint.id}
              name={sprint.name}
              goal={sprint.goal}
              startDate={sprint.startDate}
              endDate={sprint.endDate}
            />
          ) : null}
          {sprint.status === "future" ? (
            <Button
              type="button"
              size="sm"
              disabled={pending || hasActive}
              title={hasActive ? "Complete the active sprint first." : undefined}
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
              {pending ? "Starting…" : "Start sprint"}
            </Button>
          ) : null}
          {sprint.status === "active" ? <CompleteSprintButton projectId={projectId} sprintId={sprint.id} /> : null}
        </div>
      </div>
      {sprint.goal ? <p className="text-sm text-muted-foreground">{sprint.goal}</p> : <p className="text-sm text-muted-foreground">No goal yet.</p>}
      <div className="grid gap-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{done} of {total} done</span>
          <span>{total === 0 ? "No issues" : `${percent}%`}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      </div>
      {total > 0 ? (
        <ul className="divide-y rounded-lg border">
          {sprint.issues.map((issue) => (
            <li key={issue.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <IssueLine projectKey={projectKey} issue={issue} />
              {sprint.status !== "completed" ? (
                <Button type="button" size="xs" variant="ghost" disabled={pending} onClick={() => returnToBacklog(issue.id)}>
                  Move to backlog
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No issues in this sprint. Add them from the backlog.</p>
      )}
    </section>
  )
}

function IssueLine({ projectKey, issue }: { projectKey: string; issue: SprintIssue }) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
      <Link href={`/issues/${issue.id}`} className="inline-flex w-28 shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:underline">
        <LinkPending />
        {issueKey(projectKey, issue.number)}
      </Link>
      <IssueOpenButton issueId={issue.id} className="min-w-0 flex-1 truncate text-left text-sm hover:underline">
        {issue.title}
      </IssueOpenButton>
      <span className="text-xs text-muted-foreground">{issue.status}</span>
      <span className="text-xs text-muted-foreground">{issue.priority}</span>
      <span className="text-xs text-muted-foreground">{issue.assigneeName ?? "Unassigned"}</span>
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
        {pending ? "Completing…" : "Complete sprint"}
      </RevealButton>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Complete this sprint?"
        description="Issues that are not done return to the backlog. This sprint cannot take new work afterward."
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
