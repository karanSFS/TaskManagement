import Link from "next/link"
import { Suspense } from "react"
import { CalendarRange } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { PlanSprintButton } from "@/components/sprints/create-sprint-form"
import { SprintList } from "@/components/sprints/sprint-lists"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { listIssueProjects } from "@/lib/services/issue.service"
import { getSprintWorkspace } from "@/lib/services/sprint.service"

export const metadata = { title: "Sprints" }

const fieldClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export default function SprintsPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  return (
    <div className="grid gap-4">
      <PageHeader title="Sprints" description="Plan a sprint, start one, and complete it when the work is done." />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
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
      <form action="/sprints" className="flex flex-wrap items-center gap-2">
        <select name="projectId" defaultValue={workspace.projectId} className={fieldClass} aria-label="Project">
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/backlog?projectId=${workspace.projectId}`}>Backlog</Link>
        </Button>
      </form>
      {workspace.archived ? (
        <p className="text-sm text-muted-foreground">This project is archived. You can still close the active sprint.</p>
      ) : (
        <PlanSprintButton key={workspace.projectId} projectId={workspace.projectId} />
      )}
      {workspace.truncated ? <p className="text-xs text-muted-foreground">Showing the latest 200 issues.</p> : null}
      <SprintList projectId={workspace.projectId} projectKey={workspace.projectKey} sprints={workspace.sprints} />
    </div>
  )
}
