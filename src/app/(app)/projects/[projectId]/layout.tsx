import { notFound } from "next/navigation"
import { Suspense, type ReactNode } from "react"

import { ProjectIcon } from "@/components/projects/project-icon"
import { ProjectNav } from "@/components/projects/project-nav"
import { projectAccent } from "@/components/shared/priority-mark"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { getProject } from "@/lib/services/project.service"

export default function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ projectId: string }>
}) {
  return (
    <Suspense fallback={<ProjectFallback />}>
      <ProjectFrame params={params}>{children}</ProjectFrame>
    </Suspense>
  )
}

async function ProjectFrame({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ projectId: string }>
}) {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()])
  if (!user || !isUuid(projectId)) {
    notFound()
  }

  const project = await getProject(projectId, user.id)
  if (!project) {
    notFound()
  }

  const accent = projectAccent(project.key)

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className={`h-1 ${accent.bar}`} />
        <div className="flex items-center gap-3 px-3 py-3">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${accent.wash} ${accent.text}`}>
            <ProjectIcon name={project.icon} />
          </span>
          <h1 className="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
          <Badge variant="outline">{project.key}</Badge>
          {project.archivedAt ? <Badge variant="secondary">Archived</Badge> : <Badge variant="outline">Active</Badge>}
        </div>
      </div>
      <ProjectNav projectId={project.id} />
      {children}
    </div>
  )
}

function ProjectFallback() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
