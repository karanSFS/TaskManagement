"use client"

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CalendarClock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { useOpenIssue } from "@/components/issues/issue-drawer"
import { PriorityMark } from "@/components/shared/priority-mark"
import { changeIssueStatus } from "@/lib/actions/issues"
import { boardScrollEdges } from "@/lib/issues/board-scroll"
import { userInitials } from "@/lib/auth/user"
import { formatDueDate, issueKey } from "@/lib/projects/format"
import type { BoardCard, BoardColumn } from "@/lib/services/issue.service"
import { cn } from "@/lib/utils"

const collision: CollisionDetection = (args) => pointerWithin(args)

export function IssueBoard({
  columns,
  projectKey,
  projectId,
  readOnly,
  today,
}: {
  columns: BoardColumn[]
  projectKey: string
  projectId: string
  readOnly: boolean
  today: string
}) {
  const router = useRouter()
  const [items, setItems] = useState(columns)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Press Space to pick up the card, use the arrow keys to move it, and press Space again to drop it. Press Enter to open it.",
        },
      }}
    >
      <BoardScroller>
        {items.map((column, index) => (
          <Column
            key={column.id}
            column={column}
            projectKey={projectKey}
            projectId={projectId}
            canCreate={!readOnly && index === 0}
            disabled={readOnly || pending}
            today={today}
          />
        ))}
      </BoardScroller>
      <DragOverlay>
        {activeCard ? (
          <div className="w-[min(18rem,80vw)] rotate-1">
            <CardFace card={activeCard} projectKey={projectKey} today={today} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function BoardScroller({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const node = scroller.current
    const inner = track.current
    if (!node || !inner) return

    const update = () => {
      const next = boardScrollEdges(node.scrollLeft, node.clientWidth, node.scrollWidth)
      setEdges((current) => (current.left === next.left && current.right === next.right ? current : next))
    }

    node.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(node)
    observer.observe(inner)
    return () => {
      node.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [])

  return (
    <div className="grid min-w-0 gap-1">
      <div className="relative min-w-0">
        <div ref={scroller} className="min-w-0 snap-x overflow-x-auto pb-3">
          <div ref={track} className="flex w-max min-w-full gap-3">
            {children}
          </div>
        </div>
        {edges.left ? <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" /> : null}
        {edges.right ? <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" /> : null}
      </div>
      {edges.right ? <p className="text-xs text-muted-foreground">Swipe sideways for more columns.</p> : null}
    </div>
  )
}

function Column({
  column,
  projectKey,
  projectId,
  canCreate,
  disabled,
  today,
}: {
  column: BoardColumn
  projectKey: string
  projectId: string
  canCreate: boolean
  disabled: boolean
  today: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.name}, ${column.issues.length} issues`}
      className={cn(
        "flex max-h-[calc(100svh-15rem)] min-h-72 w-[min(18rem,80vw)] shrink-0 snap-start flex-col rounded-xl bg-muted/50 transition-colors",
        isOver && "bg-accent ring-2 ring-primary/40",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 className="flex min-w-0 items-center gap-2 text-xs font-semibold tracking-wide uppercase">
          <span className={cn("size-2 shrink-0 rounded-full", categoryDot(column.category))} />
          <span className="truncate">{column.name}</span>
        </h2>
        <span className="rounded-full bg-background px-1.5 text-xs text-muted-foreground tabular-nums">{column.issues.length}</span>
      </header>
      <div className="grid min-h-16 content-start gap-2 overflow-y-auto px-2 pb-2">
        {column.issues.length === 0 ? (
          <p className="rounded-lg border border-dashed px-2 py-6 text-center text-xs text-muted-foreground">
            {disabled ? "No issues" : "Drop issues here"}
          </p>
        ) : null}
        {column.issues.map((card) => (
          <DraggableCard key={card.id} card={card} projectKey={projectKey} disabled={disabled} today={today} />
        ))}
      </div>
      {canCreate ? (
        <div className="px-2 pb-2">
          <CreateIssueButton projectId={projectId} variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            + Add issue
          </CreateIssueButton>
        </div>
      ) : null}
    </section>
  )
}

function DraggableCard({ card, projectKey, disabled, today }: { card: BoardCard; projectKey: string; disabled: boolean; today: string }) {
  const openIssue = useOpenIssue()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id, disabled })

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      openIssue(card.id)
      return
    }
    listeners?.onKeyDown?.(event)
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      aria-label={`${issueKey(projectKey, card.number)}: ${card.title}`}
      className={cn(
        "cursor-pointer rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        !disabled && "active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
      onClick={() => openIssue(card.id)}
    >
      <CardFace card={card} projectKey={projectKey} today={today} />
    </div>
  )
}

function CardFace({ card, projectKey, today, overlay = false }: { card: BoardCard; projectKey: string; today: string; overlay?: boolean }) {
  const late = card.dueDate !== null && card.dueDate < today
  return (
    <article className={cn("grid gap-2 rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm", overlay && "shadow-lg")}>
      <p className="line-clamp-3 text-sm [overflow-wrap:anywhere]">{card.title}</p>
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <span className="shrink-0 font-mono">{issueKey(projectKey, card.number)}</span>
        <PriorityMark name={card.priority} />
        {card.dueDate ? (
          <span className={cn("inline-flex shrink-0 items-center gap-1", late && "font-medium text-destructive")}>
            <CalendarClock className="size-3" />
            {formatDueDate(card.dueDate)}
          </span>
        ) : null}
        <span className="ml-auto">
          <Assignee name={card.assigneeName} />
        </span>
      </div>
    </article>
  )
}

function Assignee({ name }: { name: string | null }) {
  const label = name ? `Assigned to ${name}` : "Unassigned"
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
        name ? "bg-accent text-accent-foreground" : "border border-dashed text-muted-foreground",
      )}
      title={label}
      aria-label={label}
    >
      {name ? userInitials(name) : "?"}
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

function categoryDot(category: string) {
  if (category === "done") return "bg-success"
  if (category === "in_progress") return "bg-info"
  return "bg-muted-foreground/50"
}
