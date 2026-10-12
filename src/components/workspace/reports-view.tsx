import Link from "next/link"

import { ReportCharts } from "@/components/reports/report-charts"
import { FilterDrawer, FilterField } from "@/components/shared/filter-drawer"
import { filterFieldClass } from "@/components/shared/field-styles"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { listIssueProjects } from "@/lib/services/issue.service"
import { getReports } from "@/lib/services/report.service"

export type ReportSearch = { projectId?: string; from?: string; to?: string }

export async function ReportsView({
  searchParams,
  basePath,
  scopeProjectId,
}: {
  searchParams: Promise<ReportSearch>
  basePath: string
  scopeProjectId?: string
}) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const projects = scopeProjectId ? [] : await listIssueProjects(user.id)
  const projectId = scopeProjectId ?? (projects.some((project) => project.id === params.projectId) ? params.projectId : undefined)
  let from = isoDate(params.from)
  let to = isoDate(params.to)
  if (from && to && from > to) {
    const swap = from
    from = to
    to = swap
  }
  const report = await getReports(user.id, projectId, { from, to })
  const filtered = Boolean((!scopeProjectId && projectId) || from || to)

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterDrawer
          action={basePath}
          title="Filter reports"
          activeCount={[scopeProjectId ? "" : projectId, from, to].filter(Boolean).length}
        >
          {scopeProjectId ? null : (
            <FilterField label="Project">
              <select name="projectId" defaultValue={projectId ?? ""} className={filterFieldClass}>
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </FilterField>
          )}
          <FilterField label="Created from">
            <input name="from" type="date" defaultValue={from ?? ""} className={filterFieldClass} />
          </FilterField>
          <FilterField label="Created through">
            <input name="to" type="date" defaultValue={to ?? ""} className={filterFieldClass} />
          </FilterField>
        </FilterDrawer>
        {filtered ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={basePath}>Clear</Link>
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
