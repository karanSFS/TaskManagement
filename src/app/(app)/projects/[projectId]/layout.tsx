import { notFound } from "next/navigation"
import { Suspense, type ReactNode } from "react"

import { ProjectIcon } from "@/components/projects/project-icon"
import { ProjectNav } from "@/components/projects/project-nav"
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

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <ProjectIcon name={project.icon} />
        <h1 className="truncate text-lg font-semibold tracking-tight">{project.name}</h1>
        <Badge variant="outline">{project.key}</Badge>
        {project.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
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
