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

export default function ReportsPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  return (
    <div className="grid gap-4">
      <PageHeader title="Reports" description="Project, sprint, and issue totals from the database." />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ReportContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function ReportContent({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const projects = await listIssueProjects(user.id)
  const projectId = projects.some((project) => project.id === params.projectId) ? params.projectId : undefined
  const report = await getReports(user.id, projectId)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterDrawer action="/reports" title="Filter reports" activeCount={projectId ? 1 : 0}>
          <FilterField label="Project">
            <select name="projectId" defaultValue={projectId ?? ""} className={fieldClass}>
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </FilterField>
        </FilterDrawer>
        {projectId ? (
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
      />
    </div>
  )
}
