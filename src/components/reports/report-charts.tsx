"use client"

import type { ReactNode } from "react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { ReportBar, ReportCount } from "@/lib/services/report.service"

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
}: {
  projects: ReportBar[]
  sprints: (ReportBar & { status: string })[]
  statuses: ReportCount[]
  priorities: ReportCount[]
  types: ReportCount[]
}) {
  return (
    <div className="grid gap-4">
      <ChartCard title="Projects" description="Open and done issues in each active project.">
        <SplitChart rows={projects} empty="No active projects yet." quiet="No issues in these projects yet." />
      </ChartCard>
      <ChartCard title="Sprints" description="The latest 12 sprints.">
        <SplitChart rows={sprints} empty="No sprints yet." quiet="These sprints have no issues yet." />
        {sprints.length > 0 ? (
          <ul className="grid gap-1 text-xs text-muted-foreground">
            {sprints.map((sprint) => (
              <li key={`${sprint.name}-${sprint.status}`}>
                {sprint.name} · {sprintStatus(sprint.status)} · {sprint.done} done, {sprint.open} open
              </li>
            ))}
          </ul>
        ) : null}
      </ChartCard>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Status" description="Issues by status.">
          <CountChart rows={statuses} empty="No issues yet." />
        </ChartCard>
        <ChartCard title="Priority" description="Issues by priority.">
          <CountChart rows={priorities} empty="No issues yet." />
        </ChartCard>
        <ChartCard title="Type" description="Issues by type.">
          <CountChart rows={types} empty="No issues yet." />
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
    <div className="h-56 overflow-x-auto">
      <div className="h-full min-w-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows.map((row) => ({ ...row, label: short(row.name) }))} margin={{ left: 0, right: 8, top: 8 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="open" name="Open" fill="var(--chart-1)" radius={3} />
            <Bar dataKey="done" name="Done" fill="var(--chart-2)" radius={3} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {rows.map((row) => (
          <li key={row.name}>{row.name}: {row.open} open, {row.done} done</li>
        ))}
      </ul>
    </div>
  )
}

function CountChart({ rows, empty }: { rows: ReportCount[]; empty: string }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  if (total === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="h-52 overflow-x-auto">
      <div className="h-full min-w-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows.map((row) => ({ ...row, label: short(row.name) }))} margin={{ left: 0, right: 8, top: 8 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" name="Issues" fill="var(--chart-1)" radius={3} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {rows.map((row) => (
          <li key={row.name}>{row.name}: {row.count}</li>
        ))}
      </ul>
    </div>
  )
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-2 rounded-lg border bg-card px-3 py-3">
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

function sprintStatus(status: string) {
  if (status === "active") return "Active"
  if (status === "completed") return "Completed"
  return "Planned"
}
