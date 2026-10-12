import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarRange } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { PlanSprintButton } from "@/components/sprints/create-sprint-form"
import { SprintList } from "@/components/sprints/sprint-lists"
import { getCurrentUser } from "@/lib/auth/session"
import { projectHref } from "@/lib/config/nav"
import { getSprintWorkspace } from "@/lib/services/sprint.service"

export async function SprintsView({ projectId }: { projectId: string }) {
  const user = await getCurrentUser()
  if (!user) return null

  const workspace = await getSprintWorkspace(user.id, projectId)
  if (!workspace) notFound()

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto max-w-2xl text-sm text-muted-foreground">
          {workspace.archived
            ? "This project is archived. You can still complete the sprint that is running."
            : "One sprint can be active. Completing it sends unfinished issues back to the backlog."}
        </p>
        <Link href={projectHref(projectId, "backlog")} className="text-xs font-medium text-primary hover:underline">
          Backlog
        </Link>
        {workspace.archived ? null : <PlanSprintButton key={projectId} projectId={projectId} />}
      </div>
      {workspace.truncated ? <p className="text-xs text-muted-foreground">Showing the latest 200 issues in each list.</p> : null}
      {workspace.sprints.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No sprints yet"
          description="Plan a sprint, then add issues to it from the backlog."
          action={workspace.archived ? undefined : <PlanSprintButton key={`${projectId}-empty`} projectId={projectId} />}
        />
      ) : (
        <SprintList
          projectId={projectId}
          projectKey={workspace.projectKey}
          sprints={workspace.sprints}
          canManage={workspace.canManage}
          readOnly={workspace.archived}
        />
      )}
    </div>
  )
}
