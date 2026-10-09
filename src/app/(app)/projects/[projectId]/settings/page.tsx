import { notFound } from "next/navigation"
import { Suspense } from "react"

import { ArchiveProjectButton } from "@/components/projects/archive-project-button"
import { DeleteProjectButton } from "@/components/projects/delete-project-button"
import { EditProjectButton } from "@/components/projects/create-project-dialog"
import { ProjectIcon } from "@/components/projects/project-icon"
import { FormSkeleton } from "@/components/shared/page-skeleton"
import { projectAccent } from "@/components/shared/priority-mark"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth/session"
import { formatProjectDate } from "@/lib/projects/format"
import { isProjectIcon } from "@/lib/projects/icons"
import { getProject } from "@/lib/services/project.service"

export const metadata = { title: "Project settings" }

export default function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
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

  const accent = projectAccent(project.key)

  return (
    <div className="grid max-w-2xl gap-4">
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className={`h-1 ${accent.bar}`} />
        <div className="flex items-start gap-3 px-3 py-3">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${accent.wash} ${accent.text}`}>
            <ProjectIcon name={project.icon} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{project.name}</h2>
              <Badge variant="outline">{project.key}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{project.description || "No description yet."}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Lead {project.leadName} · {project.memberCount} {project.memberCount === 1 ? "member" : "members"} · {project.openIssueCount} open
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Created {formatProjectDate(project.createdAt)} by {project.createdByName}.
            </p>
          </div>
        </div>
      </section>
      <section className="grid gap-3 rounded-xl border bg-card px-3 py-3 shadow-sm">
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
        <section className={project.archivedAt ? "grid gap-2 rounded-xl border border-warning bg-card px-3 py-3 shadow-sm" : "grid gap-2 rounded-xl border bg-card px-3 py-3 shadow-sm"}>
          <h2 className="text-sm font-medium">{project.archivedAt ? "Restore project" : "Archive project"}</h2>
          <p className="text-sm text-muted-foreground">
            {project.archivedAt
              ? "Restoring the project lets members file new issues again. Existing issues stay as they are."
              : "Archived projects stay readable, but nobody can file new issues in them."}
          </p>
          <div className="flex flex-wrap gap-2">
            <ArchiveProjectButton projectId={project.id} archived={Boolean(project.archivedAt)} />
            {project.archivedAt && project.role === "owner" ? (
              <DeleteProjectButton projectId={project.id} projectName={project.name} />
            ) : null}
          </div>
          {project.archivedAt && project.role === "owner" ? (
            <p className="text-xs text-muted-foreground">Deleting removes the project for every member.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
