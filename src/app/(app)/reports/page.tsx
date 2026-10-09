import Link from "next/link"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { ReportCharts } from "@/components/reports/report-charts"
import { FilterDrawer, FilterField, filterFieldClass } from "@/components/shared/filter-drawer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { listIssueProjects } from "@/lib/services/issue.service"
import { getReports } from "@/lib/services/report.service"

export const metadata = { title: "Reports" }

const fieldClass = filterFieldClass

type ReportSearch = { projectId?: string; from?: string; to?: string }

export default function ReportsPage({ searchParams }: { searchParams: Promise<ReportSearch> }) {
  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader title="Reports" description="Project, sprint, and issue totals from the database." />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ReportContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function ReportContent({ searchParams }: { searchParams: Promise<ReportSearch> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const projects = await listIssueProjects(user.id)
  const projectId = projects.some((project) => project.id === params.projectId) ? params.projectId : undefined
  let from = isoDate(params.from)
  let to = isoDate(params.to)
  if (from && to && from > to) {
    const swap = from
    from = to
    to = swap
  }
  const report = await getReports(user.id, projectId, { from, to })
  const filtered = Boolean(projectId || from || to)

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterDrawer action="/reports" title="Filter reports" activeCount={[projectId, from, to].filter(Boolean).length}>
          <FilterField label="Project">
            <select name="projectId" defaultValue={projectId ?? ""} className={fieldClass}>
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Created from">
            <input name="from" type="date" defaultValue={from ?? ""} className={fieldClass} />
          </FilterField>
          <FilterField label="Created through">
            <input name="to" type="date" defaultValue={to ?? ""} className={fieldClass} />
          </FilterField>
        </FilterDrawer>
        {filtered ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports">Clear</Link>
          </Button>
        ) : null}
      </div>
      <ReportCharts
        projects={report.projects}
        sprints={report.sprints}
        statuses={report.statuses}
        priorities={report.priorities}
        types={report.types}
        summary={report.summary}
        ranged={report.ranged}
      />
    </div>
  )
}

function isoDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined
  return value
}
