import Link from "next/link"
import { FolderKanban } from "lucide-react"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { CreateProjectButton } from "@/components/projects/create-project-dialog"
import { ProjectIcon } from "@/components/projects/project-icon"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { roleLabel } from "@/lib/projects/format"
import { getProjects, type ProjectSummary } from "@/lib/services/project.service"

export const metadata = { title: "Projects" }

export default function ProjectsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Projects"
        description="Workspaces you belong to. Each project has its own key and issue numbers."
        actions={<CreateProjectButton />}
      />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <ProjectLists />
      </Suspense>
    </div>
  )
}

async function ProjectLists() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const projects = await getProjects(user.id)
  const active = projects.filter((project) => !project.archivedAt)
  const archived = projects.filter((project) => project.archivedAt)

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="Create a project to give the work a name, a key, and a place for members."
        action={<CreateProjectButton size="sm">Create project</CreateProjectButton>}
      />
    )
  }

  return (
    <div className="grid gap-6">
      <ProjectRows projects={active} empty="Active projects will show here." />
      {archived.length > 0 ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium">Archived</h2>
          <ProjectRows projects={archived} empty="" />
        </section>
      ) : null}
    </div>
  )
}

function ProjectRows({ projects, empty }: { projects: ProjectSummary[]; empty: string }) {
  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <ul className="divide-y rounded-lg border bg-card">
      {projects.map((project) => (
        <li key={project.id}>
          <Link href={`/projects/${project.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
            <ProjectIcon name={project.icon} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{project.name}</span>
                <Badge variant="outline">{project.key}</Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {project.description || "No description"} · Lead {project.leadName}
              </p>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {project.openIssueCount} open · {project.memberCount} {project.memberCount === 1 ? "member" : "members"} · {roleLabel(project.role)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
