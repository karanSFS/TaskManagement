"use client"

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { useOpenIssue } from "@/components/issues/issue-drawer"
import { changeIssueStatus } from "@/lib/actions/issues"
import { assignIssueToSprint } from "@/lib/actions/sprints"
import { userInitials } from "@/lib/auth/user"
import { issueKey } from "@/lib/projects/format"
import type { BoardCard, BoardColumn, BoardSprint } from "@/lib/services/issue.service"

const collision: CollisionDetection = (args) => pointerWithin(args)

export function IssueBoard({
  columns,
  projectKey,
  projectId,
  sprints,
}: {
  columns: BoardColumn[]
  projectKey: string
  projectId: string
  sprints: BoardSprint[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(columns)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )
  const activeCard = activeId ? items.flatMap((column) => column.issues).find((card) => card.id === activeId) : null

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const issueId = String(event.active.id)
    const statusId = event.over ? String(event.over.id) : ""
    if (!statusId || pending) return

    const current = items.find((column) => column.issues.some((card) => card.id === issueId))
    if (!current || current.id === statusId) return
    const target = items.find((column) => column.id === statusId)
    if (!target) return

    const previous = items
    setItems(moveCard(items, issueId, statusId))
    startTransition(async () => {
      const result = await changeIssueStatus(issueId, statusId)
      if (result?.error) {
        setItems(previous)
        toast.error(result.error)
        return
      }
      toast.success(`Moved to ${target.name}.`)
      router.refresh()
    })
  }

  function onSprint(issueId: string, sprintId: string) {
    if (pending) return
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
    <div className="grid min-w-0 gap-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {items.map((column) => (
          <button
            key={column.id}
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs"
            onClick={() => document.getElementById(`board-column-${column.id}`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })}
          >
            <span className={`size-1.5 rounded-full ${categoryDot(column.category)}`} />
            {column.name}
            <span className="text-muted-foreground">{column.issues.length}</span>
          </button>
        ))}
      </div>
      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="min-w-0 overflow-x-auto pb-2">
          <div className="flex w-max min-w-full gap-3">
            {items.map((column) => (
              <Column
                key={column.id}
                column={column}
                projectKey={projectKey}
                sprints={sprints}
                pending={pending}
                onSprint={onSprint}
              />
            ))}
          </div>
        </div>
        <DragOverlay>{activeCard ? <CardView card={activeCard} projectKey={projectKey} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}

function Column({
  column,
  projectKey,
  sprints,
  pending,
  onSprint,
}: {
  column: BoardColumn
  projectKey: string
  sprints: BoardSprint[]
  pending: boolean
  onSprint: (issueId: string, sprintId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <section
      id={`board-column-${column.id}`}
      ref={setNodeRef}
      aria-label={column.name}
      className={`flex max-h-[calc(100svh-16rem)] w-72 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2 ${isOver ? "border-ring bg-muted/60" : ""}`}
    >
      <header className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <span className={`size-1.5 rounded-full ${categoryDot(column.category)}`} />
          {column.name}
        </h2>
        <span className="text-xs text-muted-foreground">{column.issues.length}</span>
      </header>
      <div className="grid min-h-24 content-start gap-2 overflow-y-auto">
        {column.issues.length === 0 ? <p className="px-1 text-xs text-muted-foreground">Nothing here.</p> : null}
        {column.issues.map((card) => (
          <Card key={card.id} card={card} projectKey={projectKey} sprints={sprints} pending={pending} onSprint={onSprint} />
        ))}
      </div>
    </section>
  )
}

function Card({
  card,
  projectKey,
  sprints,
  pending,
  onSprint,
}: {
  card: BoardCard
  projectKey: string
  sprints: BoardSprint[]
  pending: boolean
  onSprint: (issueId: string, sprintId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id, disabled: pending })

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={isDragging ? "opacity-40" : ""}>
      <CardView
        card={card}
        projectKey={projectKey}
        sprints={sprints}
        pending={pending}
        onSprint={onSprint}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  )
}

function CardView({
  card,
  projectKey,
  overlay = false,
  sprints = [],
  pending = false,
  onSprint,
  dragAttributes,
  dragListeners,
}: {
  card: BoardCard
  projectKey: string
  overlay?: boolean
  sprints?: BoardSprint[]
  pending?: boolean
  onSprint?: (issueId: string, sprintId: string) => void
  dragAttributes?: ReturnType<typeof useDraggable>["attributes"]
  dragListeners?: ReturnType<typeof useDraggable>["listeners"]
}) {
  const sprintOptions = card.sprintId && !sprints.some((sprint) => sprint.id === card.sprintId)
    ? [{ id: card.sprintId, name: card.sprintName ?? "Current sprint" }, ...sprints]
    : sprints

  return (
    <article className={`rounded-lg border border-l-2 bg-card px-2.5 py-2 ${priorityClass(card.priority)} ${overlay ? "shadow-md" : ""}`}>
      <div className="flex items-start gap-1.5">
        {dragListeners ? (
          <button
            type="button"
            className="mt-0.5 text-muted-foreground"
            aria-label={`Drag ${card.title}`}
            {...dragAttributes}
            {...dragListeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/issues/${card.id}`}
              className="text-xs font-medium text-muted-foreground hover:underline"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {issueKey(projectKey, card.number)}
            </Link>
            <Assignee name={card.assigneeName} />
          </div>
          <BoardTitle issueId={card.id} title={card.title} />
          <p className="mt-1 text-xs text-muted-foreground">{card.priority}</p>
        </div>
      </div>
      {onSprint && !overlay ? (
        <select
          className="mt-2 h-7 w-full rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring"
          aria-label={`Sprint for ${card.title}`}
          value={card.sprintId ?? ""}
          disabled={pending}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onSprint(card.id, event.target.value)}
        >
          <option value="">Backlog</option>
          {sprintOptions.map((sprint) => (
            <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
          ))}
        </select>
      ) : null}
    </article>
  )
}

function BoardTitle({ issueId, title }: { issueId: string; title: string }) {
  const openIssue = useOpenIssue()
  return (
    <button
      type="button"
      className="mt-1 block w-full truncate text-left text-sm hover:underline"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => openIssue(issueId)}
    >
      {title}
    </button>
  )
}

function Assignee({ name }: { name: string | null }) {
  const label = name ?? "Unassigned"
  return (
    <span
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium"
      title={label}
    >
      {name ? userInitials(name) : "–"}
    </span>
  )
}

function moveCard(columns: BoardColumn[], issueId: string, statusId: string): BoardColumn[] {
  const card = columns.flatMap((column) => column.issues).find((item) => item.id === issueId)
  if (!card) return columns
  const moved = { ...card, statusId }

  return columns.map((column) => ({
    ...column,
    issues:
      column.id === statusId
        ? [moved, ...column.issues.filter((item) => item.id !== issueId)]
        : column.issues.filter((item) => item.id !== issueId),
  }))
}

function priorityClass(priority: string) {
  switch (priority) {
    case "Highest":
      return "border-l-destructive"
    case "High":
      return "border-l-orange-500"
    case "Medium":
      return "border-l-amber-500"
    case "Low":
      return "border-l-sky-500"
    default:
      return "border-l-border"
  }
}

function categoryDot(category: string) {
  if (category === "done") return "bg-chart-2"
  if (category === "in_progress") return "bg-chart-1"
  return "bg-muted-foreground/50"
}
