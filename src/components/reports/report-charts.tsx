"use client"

import type { ReactNode } from "react"
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { MetricLink, sprintTone } from "@/components/shared/visual"
import type { ReportBar, ReportCount, ReportSummary } from "@/lib/services/report.service"

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
}

export function ReportCharts({
  projects,
  sprints,
  statuses,
  priorities,
  types,
  summary,
  ranged,
}: {
  projects: ReportBar[]
  sprints: (ReportBar & { status: string })[]
  statuses: ReportCount[]
  priorities: ReportCount[]
  types: ReportCount[]
  summary: ReportSummary
  ranged: boolean
}) {
  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricLink label="Issues" value={summary.issues} hint={ranged ? "Created in this range" : "Issues you can access"} tone="bg-primary" href={ranged ? undefined : "/issues"} />
        <MetricLink label="Open" value={summary.open} hint="Not done" tone="bg-info" />
        <MetricLink label="Done" value={summary.done} hint="Status category is done" tone="bg-success" />
        <MetricLink
          label="Completion"
          value={summary.completion === null ? "—" : `${summary.completion}%`}
          hint={summary.completion === null ? "No issues in this view" : "Done divided by issues"}
          tone="bg-chart-2"
        />
        <MetricLink label="Active projects" value={summary.activeProjects} hint="Not archived" tone="bg-primary" href={ranged ? undefined : "/projects"} />
        <MetricLink label="Active sprints" value={summary.activeSprints} hint="Running now, across the selected projects" tone="bg-info" href={ranged ? undefined : "/sprints"} />
      </div>
      <ChartCard title="Projects" description={ranged ? "Issues created in this range, by project." : "Open and done issues in each active project."}>
        <SplitChart rows={projects} empty="No active projects yet." quiet="No issues in these projects yet." />
      </ChartCard>
      <ChartCard title="Sprint progress" description={ranged ? "Sprints that contain issues created in this range." : "The latest 12 sprints."}>
        {sprints.length === 0 ? <p className="text-sm text-muted-foreground">No sprints yet.</p> : (
          <ul className="grid gap-3">
            {sprints.map((sprint) => {
              const total = sprint.open + sprint.done
              const percent = total === 0 ? 0 : Math.round((sprint.done / total) * 100)
              return (
                <li key={`${sprint.name}-${sprint.status}`} className={`grid gap-1 rounded-lg border border-t-2 bg-card px-2 py-2 ${sprintTone(sprint.status)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-medium">{sprint.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {sprintStatus(sprint.status)} · {sprint.done} done, {sprint.open} open
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full bg-chart-2" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </ChartCard>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <ChartCard title="Status" description="Issues by status.">
          <CountChart rows={statuses} empty="No issues yet." color="var(--chart-1)" />
        </ChartCard>
        <ChartCard title="Priority" description="Issues by priority.">
          <CountChart rows={priorities} empty="No issues yet." color="var(--chart-4)" fills={priorityFills(priorities)} />
        </ChartCard>
        <ChartCard title="Type" description="Issues by type.">
          <CountChart rows={types} empty="No issues yet." color="var(--chart-3)" />
        </ChartCard>
      </div>
    </div>
  )
}

function SplitChart({ rows, empty, quiet }: { rows: ReportBar[]; empty: string; quiet: string }) {
  const total = rows.reduce((sum, row) => sum + row.open + row.done, 0)
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  if (total === 0) return <p className="text-sm text-muted-foreground">{quiet}</p>
  return (
    <div className="grid min-w-0 gap-2">
      <Legend items={[{ name: "Open", color: "var(--chart-1)" }, { name: "Done", color: "var(--chart-2)" }]} />
      <div className="min-w-0" style={{ height: Math.max(160, rows.length * 48) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11 }} tickFormatter={short} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="open" name="Open" fill="var(--chart-1)" radius={3} barSize={10} />
            <Bar dataKey="done" name="Done" fill="var(--chart-2)" radius={3} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CountChart({ rows, empty, color, fills }: { rows: ReportCount[]; empty: string; color: string; fills?: string[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  if (total === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="min-w-0" style={{ height: Math.max(180, rows.length * 32) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11 }} tickFormatter={short} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Issues" fill={color} radius={3} barSize={12}>
            {fills?.map((fill, index) => <Cell key={rows[index]?.name ?? index} fill={fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.name} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm" style={{ background: item.color }} />
          {item.name}
        </li>
      ))}
    </ul>
  )
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid min-w-0 gap-3 rounded-lg border bg-card px-3 py-3">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function short(name: string) {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name
}

function priorityFills(rows: ReportCount[]) {
  return rows.map((row) => {
    if (row.name === "Highest") return "var(--destructive)"
    if (row.name === "High") return "var(--warning)"
    if (row.name === "Medium") return "var(--info)"
    if (row.name === "Low") return "var(--success)"
    return "var(--chart-5)"
  })
}

function sprintStatus(status: string) {
  if (status === "active") return "Active"
  if (status === "completed") return "Completed"
  return "Planned"
}
