"use client"

import Link from "next/link"
import { useState, type MouseEvent, type ReactNode } from "react"
import { AlarmClock, CalendarClock, CircleDot, ListTodo, Loader2 } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import type { MyWorkView } from "@/lib/services/issue.service"

export type WorkCard = {
  id: MyWorkView
  href: string
  label: string
  hint: string
  value: number
  alert: boolean
}

export function WorkSwitcher({
  view,
  cards,
  toolbar,
  children,
}: {
  view: MyWorkView
  cards: WorkCard[]
  toolbar: ReactNode
  children: ReactNode
}) {
  const [chosen, setChosen] = useState<MyWorkView | null>(null)
  if (chosen === view) setChosen(null)
  const loading = chosen !== null && chosen !== view
  const shown = chosen ?? view

  function select(next: MyWorkView, event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    if (next === shown) {
      event.preventDefault()
      return
    }
    setChosen(next)
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const active = shown === card.id
          const waiting = loading && active
          return (
            <Link
              key={card.id}
              href={card.href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              aria-busy={waiting}
              onClick={(event) => select(card.id, event)}
              className={
                active
                  ? "flex h-14 items-center gap-2.5 rounded-lg border border-primary bg-primary/5 px-3"
                  : "flex h-14 items-center gap-2.5 rounded-lg border bg-card px-3 hover:bg-muted/40"
              }
            >
              <span
                className={
                  active
                    ? "flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                    : "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                }
              >
                {waiting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <CardIcon view={card.id} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium leading-4">{card.label}</span>
                <span className="mt-0.5 block truncate text-xs leading-4 text-muted-foreground">{card.hint}</span>
              </span>
              <span
                className={
                  card.alert
                    ? "shrink-0 font-mono text-base font-semibold leading-none text-destructive tabular-nums"
                    : "shrink-0 font-mono text-base font-semibold leading-none tabular-nums"
                }
              >
                {card.value}
              </span>
            </Link>
          )
        })}
      </div>
      <div className={loading ? "pointer-events-none opacity-60" : undefined}>{toolbar}</div>
      {loading ? <WorkListSkeleton /> : children}
    </div>
  )
}

function WorkListSkeleton() {
  return (
    <div className="rounded-lg border bg-card" role="status" aria-live="polite">
      <p className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Loading issues
      </p>
      <div className="grid gap-2 p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )
}

function CardIcon({ view }: { view: MyWorkView }) {
  const className = "size-3.5"
  switch (view) {
    case "assigned":
      return <ListTodo className={className} aria-hidden />
    case "reported":
      return <CircleDot className={className} aria-hidden />
    case "due":
      return <CalendarClock className={className} aria-hidden />
    case "overdue":
      return <AlarmClock className={className} aria-hidden />
  }
}
