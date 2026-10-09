import Link from "next/link"
import { Suspense } from "react"
import { SquareKanban } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterDrawer, FilterField, filterFieldClass } from "@/components/shared/filter-drawer"
import { BacklogList } from "@/components/sprints/sprint-lists"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { listIssueProjects } from "@/lib/services/issue.service"
import { getSprintWorkspace } from "@/lib/services/sprint.service"

export const metadata = { title: "Backlog" }

const fieldClass = filterFieldClass

export default function BacklogPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  return (
    <div className="grid gap-4">
      <PageHeader title="Backlog" description="Open issues that are not in a sprint." />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <BacklogContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function BacklogContent({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const projects = await listIssueProjects(user.id)
  if (projects.length === 0) {
    return (
      <EmptyState icon={SquareKanban} title="No projects yet" description="Create a project before ordering the backlog." />
    )
  }

  const project = projects.find((item) => item.id === params.projectId) ?? projects[0]
  const workspace = await getSprintWorkspace(user.id, project.id)
  if (!workspace) return <p className="text-sm text-muted-foreground">That project could not be loaded.</p>

  const openSprints = workspace.sprints
    .filter((sprint) => sprint.status !== "completed")
    .map((sprint) => ({ id: sprint.id, name: sprint.name }))

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterDrawer action="/backlog" title="Choose a project">
          <FilterField label="Project">
            <select name="projectId" defaultValue={workspace.projectId} className={fieldClass}>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FilterField>
        </FilterDrawer>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/sprints?projectId=${workspace.projectId}`}>Sprints</Link>
        </Button>
      </div>
      {workspace.truncated ? (
        <p className="text-xs text-muted-foreground">Showing the latest 200 issues.</p>
      ) : null}
      <BacklogList
        projectId={workspace.projectId}
        projectKey={workspace.projectKey}
        issues={workspace.backlog}
        sprints={openSprints}
      />
    </div>
  )
}
