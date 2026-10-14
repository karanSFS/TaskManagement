import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense, type ReactNode } from "react"
import { Archive } from "lucide-react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { ArchiveProjectButton } from "@/components/projects/archive-project-button"
import { ProjectIcon } from "@/components/projects/project-icon"
import { ProjectNav } from "@/components/projects/project-nav"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { projectHref } from "@/lib/config/nav"
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

  const archived = Boolean(project.archivedAt)
  const canManage = project.role === "owner" || project.role === "admin"

  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid min-w-0 gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ProjectIcon name={project.icon} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">{project.key}</p>
            <h1 className="truncate text-xl font-semibold tracking-tight" title={project.name}>
              {project.name}
            </h1>
          </div>
          {archived ? null : (
            <CreateIssueButton projectId={project.id} className="shrink-0">
              New issue
            </CreateIssueButton>
          )}
        </div>
        <ProjectNav projectId={project.id} />
      </div>
      {archived ? (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
          <Archive className="size-5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">This project is archived and read-only</p>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "Restore it to create issues, invite people, and plan sprints again."
                : "Ask an owner or admin to restore it before adding new work."}
            </p>
          </div>
          {canManage ? (
            <div className="flex shrink-0 gap-2">
              <ArchiveProjectButton projectId={project.id} archived compact />
              {project.role === "owner" ? (
                <Button asChild size="sm" variant="ghost">
                  <Link href={projectHref(project.id, "settings")}>Delete…</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function ProjectFallback() {
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="grid gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
