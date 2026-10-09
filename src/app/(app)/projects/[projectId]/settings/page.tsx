import { notFound } from "next/navigation"
import { Suspense } from "react"

import { ArchiveProjectButton } from "@/components/projects/archive-project-button"
import { EditProjectButton } from "@/components/projects/create-project-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { formatProjectDate } from "@/lib/projects/format"
import { isProjectIcon } from "@/lib/projects/icons"
import { getProject } from "@/lib/services/project.service"

export const metadata = { title: "Project settings" }

export default function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <SettingsContent params={params} />
    </Suspense>
  )
}

async function SettingsContent({ params }: { params: Promise<{ projectId: string }> }) {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()])
  if (!user) {
    return null
  }

  const project = await getProject(projectId, user.id)
  if (!project) {
    notFound()
  }

  const canEdit = project.role === "owner" || project.role === "admin" || project.leadId === user.id
  const leadId = project.leadId && project.members.some((member) => member.userId === project.leadId)
    ? project.leadId
    : project.members[0]?.userId

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border bg-card px-3 py-3">
        <h2 className="text-sm font-medium">Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Created {formatProjectDate(project.createdAt)} by {project.createdByName}.
        </p>
      </section>
      <section className="grid gap-3 rounded-lg border bg-card px-3 py-3">
        <div>
          <h2 className="text-sm font-medium">Project settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {canEdit
              ? "Name, key, description, icon, and lead."
              : "Only the lead, an owner, or an admin can change these settings."}
          </p>
        </div>
        {canEdit && leadId ? (
          <EditProjectButton
            projectId={project.id}
            members={project.members.map((member) => ({ id: member.userId, name: member.name }))}
            defaultValues={{
              name: project.name,
              key: project.key,
              description: project.description,
              icon: project.icon && isProjectIcon(project.icon) ? project.icon : "",
              leadId,
            }}
          />
        ) : null}
      </section>
      {canEdit ? (
        <section className="grid gap-2 rounded-lg border bg-card px-3 py-3">
          <h2 className="text-sm font-medium">{project.archivedAt ? "Restore project" : "Archive project"}</h2>
          <p className="text-sm text-muted-foreground">
            {project.archivedAt
              ? "Restoring the project lets members file new issues again. Existing issues stay as they are."
              : "Archived projects stay readable, but nobody can file new issues in them."}
          </p>
          <ArchiveProjectButton projectId={project.id} archived={Boolean(project.archivedAt)} />
        </section>
      ) : null}
    </div>
  )
}
