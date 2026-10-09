import Link from "next/link"
import type { ReactNode } from "react"

import { userInitials } from "@/lib/auth/user"

export function MetricLink({
  href,
  label,
  value,
  hint,
  tone,
  icon,
  alert = false,
}: {
  href?: string
  label: string
  value: number | string
  hint: string
  tone: string
  icon?: ReactNode
  alert?: boolean
}) {
  const body = (
    <>
      <div className={`h-1 ${tone}`} />
      <div className="px-3 py-3">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-medium">{label}</span>
          {icon}
        </div>
        <p className={alert ? "mt-2 text-2xl font-semibold tracking-tight text-destructive tabular-nums" : "mt-2 text-2xl font-semibold tracking-tight tabular-nums"}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </>
  )
  const className = "overflow-hidden rounded-xl border bg-card shadow-sm transition-colors duration-200"
  if (!href) return <div className={className}>{body}</div>
  return (
    <Link href={href} className={`${className} hover:border-primary/30`}>
      {body}
    </Link>
  )
}

export function ProgressMeter({
  done,
  open,
  barClass = "bg-chart-2",
}: {
  done: number
  open: number
  barClass?: string
}) {
  const total = done + open
  const percent = total === 0 ? null : Math.round((done / total) * 100)
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${barClass}`} style={{ width: `${percent ?? 0}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {percent === null ? "No issues yet" : `${percent}% done · ${open} open · ${done} done`}
      </p>
    </div>
  )
}

export function StatusChip({
  name,
  done = false,
  category,
}: {
  name: string
  done?: boolean
  category?: string
}) {
  const resolved = category === "done" || done ? "done" : category
  const tone =
    resolved === "done"
      ? "bg-success/15 text-success"
      : resolved === "in_progress"
        ? "bg-info/15 text-info"
        : "bg-muted text-muted-foreground"
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{name}</span>
}

export function PersonStack({
  people,
  total,
}: {
  people: { id: string; name: string }[]
  total?: number
}) {
  const shown = people.slice(0, 3)
  const extra = Math.max(0, (total ?? people.length) - shown.length)
  if (shown.length === 0) return null
  return (
    <span className="flex items-center -space-x-1">
      {shown.map((person) => (
        <span key={person.id} title={person.name} className="inline-flex size-5 items-center justify-center rounded-full border bg-muted text-[9px] font-medium">
          {userInitials(person.name)}
        </span>
      ))}
      {extra > 0 ? <span className="pl-1.5 text-[11px] text-muted-foreground">+{extra}</span> : null}
    </span>
  )
}

export function sprintTone(status: string) {
  if (status === "active") return "border-t-primary"
  if (status === "completed") return "border-t-chart-2"
  return "border-t-info"
}

export function priorityEdge(name: string) {
  switch (name) {
    case "Highest":
      return "border-l-destructive"
    case "High":
      return "border-l-warning"
    case "Medium":
      return "border-l-info"
    case "Low":
      return "border-l-success"
    default:
      return "border-l-border"
  }
}
