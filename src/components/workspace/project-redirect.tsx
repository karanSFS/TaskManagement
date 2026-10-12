import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { FolderKanban } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { lastProjectCookie, projectHref } from "@/lib/config/nav"
import { listNavProjects } from "@/lib/services/project.service"

export async function ProjectRedirect({
  slug,
  searchParams,
}: {
  slug: string
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [params, cookieStore, projects] = await Promise.all([searchParams, cookies(), listNavProjects()])

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Create a project first"
        description="Boards, backlogs, and sprints live inside a project."
        action={
          <Button asChild size="sm">
            <Link href="/projects/new">New project</Link>
          </Button>
        }
      />
    )
  }

  const requested = typeof params.projectId === "string" ? params.projectId : undefined
  const remembered = cookieStore.get(lastProjectCookie)?.value
  const target =
    projects.find((project) => project.id === requested) ??
    projects.find((project) => project.id === remembered) ??
    projects.find((project) => !project.archived) ??
    projects[0]

  const rest = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key === "projectId" || typeof value !== "string") continue
    rest.set(key, value)
  }
  const query = rest.toString()
  redirect(`${projectHref(target.id, slug)}${query ? `?${query}` : ""}`)
}
