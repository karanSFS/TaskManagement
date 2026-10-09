import Link from "next/link"
import { Suspense } from "react"

import { CreateIssueForm } from "@/components/issues/create-issue-form"
import { CreateProjectButton } from "@/components/projects/create-project-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { getIssueCatalog, listWritableProjects } from "@/lib/services/issue.service"

export const metadata = { title: "New issue" }

export default function NewIssuePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <NewIssueContent searchParams={searchParams} />
    </Suspense>
  )
}

async function NewIssueContent({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const [{ active, archivedCount }, catalog] = await Promise.all([listWritableProjects(user.id), getIssueCatalog()])
  if (active.length === 0) {
    return (
      <div className="grid gap-3">
        <PageHeader
          title="New issue"
          description={
            archivedCount > 0
              ? "Your projects are archived. Restore one in its settings, or create a new project, to file an issue."
              : "Create a project before filing the first issue."
          }
        />
        <div className="flex gap-2">
          <CreateProjectButton>New project</CreateProjectButton>
          {archivedCount > 0 ? (
            <Button asChild variant="outline" className="w-fit">
              <Link href="/projects">View projects</Link>
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  const requested = active.find((project) => project.id === params.projectId)
  const defaultProjectId = requested?.id ?? active[0].id

  return (
    <div className="grid gap-4">
      <PageHeader title="New issue" description="The project key and the next number are assigned when you save." />
      <CreateIssueForm
        projects={active}
        types={catalog.types}
        statuses={catalog.statuses}
        priorities={catalog.priorities}
        defaultProjectId={defaultProjectId}
      />
    </div>
  )
}
