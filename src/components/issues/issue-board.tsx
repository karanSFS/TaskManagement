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
import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { changeIssueStatus } from "@/lib/actions/issues"
import { issueKey } from "@/lib/projects/format"
import type { BoardCard, BoardColumn } from "@/lib/services/issue.service"

const collision: CollisionDetection = (args) => pointerWithin(args)

export function IssueBoard({ columns, projectKey }: { columns: BoardColumn[]; projectKey: string }) {
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

    const previous = items
    setItems(moveCard(items, issueId, statusId))
    startTransition(async () => {
      const result = await changeIssueStatus(issueId, statusId)
      if (result?.error) {
        setItems(previous)
        toast.error(result.error)
      }
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((column) => (
          <Column key={column.id} column={column} projectKey={projectKey} />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? <CardView card={activeCard} projectKey={projectKey} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ column, projectKey }: { column: BoardColumn; projectKey: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <section
      ref={setNodeRef}
      aria-label={column.name}
      className={`flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2 ${isOver ? "border-ring" : ""}`}
    >
      <header className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium">{column.name}</h2>
        <span className="text-xs text-muted-foreground">{column.issues.length}</span>
      </header>
      <div className="grid min-h-24 content-start gap-2">
        {column.issues.map((card) => (
          <Card key={card.id} card={card} projectKey={projectKey} />
        ))}
      </div>
    </section>
  )
}

function Card({ card, projectKey }: { card: BoardCard; projectKey: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id })

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={isDragging ? "opacity-40" : ""}>
      <CardView card={card} projectKey={projectKey} dragAttributes={attributes} dragListeners={listeners} />
    </div>
  )
}

function CardView({
  card,
  projectKey,
  overlay = false,
  dragAttributes,
  dragListeners,
}: {
  card: BoardCard
  projectKey: string
  overlay?: boolean
  dragAttributes?: ReturnType<typeof useDraggable>["attributes"]
  dragListeners?: ReturnType<typeof useDraggable>["listeners"]
}) {
  return (
    <article
      className={`rounded-lg border bg-card px-2.5 py-2 ${overlay ? "shadow-md" : ""}`}
      {...dragAttributes}
      {...dragListeners}
    >
      <p className="text-xs font-medium text-muted-foreground">{issueKey(projectKey, card.number)}</p>
      <Link href={`/issues/${card.id}`} className="mt-1 block text-sm hover:underline">
        {card.title}
      </Link>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {card.priority} · {card.assigneeName ?? "Unassigned"}
      </p>
    </article>
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
