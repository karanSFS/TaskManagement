import Link from "next/link"
import { Suspense } from "react"
import { CalendarRange } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterDrawer, FilterField, filterFieldClass } from "@/components/shared/filter-drawer"
import { PlanSprintButton } from "@/components/sprints/create-sprint-form"
import { SprintList } from "@/components/sprints/sprint-lists"
import { Button } from "@/components/ui/button"
import { DetailSkeleton } from "@/components/shared/page-skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { listIssueProjects } from "@/lib/services/issue.service"
import { getSprintWorkspace } from "@/lib/services/sprint.service"

export const metadata = { title: "Sprints" }

const fieldClass = filterFieldClass

export default function SprintsPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader title="Sprints" description="Plan a sprint, start one, and complete it when the work is done." />
      <Suspense fallback={<DetailSkeleton />}>
        <SprintsContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function SprintsContent({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const projects = await listIssueProjects(user.id)
  if (projects.length === 0) {
    return (
      <EmptyState icon={CalendarRange} title="No projects yet" description="Create a project before planning a sprint." />
    )
  }

  const project = projects.find((item) => item.id === params.projectId) ?? projects[0]
  const workspace = await getSprintWorkspace(user.id, project.id)
  if (!workspace) return <p className="text-sm text-muted-foreground">That project could not be loaded.</p>

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <FilterDrawer action="/sprints" title="Choose a project">
          <FilterField label="Project">
            <select name="projectId" defaultValue={workspace.projectId} className={fieldClass}>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FilterField>
        </FilterDrawer>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/backlog?projectId=${workspace.projectId}`}>Backlog</Link>
        </Button>
        <p className="text-sm font-medium">
          {workspace.projectName} <span className="font-mono text-xs font-normal text-muted-foreground">{workspace.projectKey}</span>
        </p>
        {workspace.archived ? (
          <p className="text-sm text-muted-foreground">This project is archived. You can still close the active sprint.</p>
        ) : (
          <PlanSprintButton key={workspace.projectId} projectId={workspace.projectId} />
        )}
      </div>
      {workspace.truncated ? <p className="text-xs text-muted-foreground">Showing the latest 200 issues in each list.</p> : null}
      {workspace.sprints.length === 0 ? (
        <EmptyState icon={CalendarRange} title="No sprints yet" description="Plan one to start scheduling work. Only one sprint can be active." />
      ) : (
        <SprintList projectId={workspace.projectId} projectKey={workspace.projectKey} sprints={workspace.sprints} />
      )}
    </div>
  )
}
