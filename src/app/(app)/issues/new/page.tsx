import Link from "next/link"
import { Suspense } from "react"

import { CreateIssueForm } from "@/components/issues/create-issue-form"
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

  const [projects, catalog] = await Promise.all([listWritableProjects(user.id), getIssueCatalog()])
  if (projects.length === 0) {
    return (
      <div className="grid gap-3">
        <PageHeader title="New issue" description="Create a project before filing the first issue." />
        <Button asChild className="w-fit">
          <Link href="/projects/new">New project</Link>
        </Button>
      </div>
    )
  }

  const defaultProjectId = projects.some((project) => project.id === params.projectId) ? params.projectId! : projects[0].id

  return (
    <div className="grid gap-4">
      <PageHeader title="New issue" description="The project key and the next number are assigned when you save." />
      <CreateIssueForm
        projects={projects}
        types={catalog.types}
        statuses={catalog.statuses}
        priorities={catalog.priorities}
        defaultProjectId={defaultProjectId}
      />
    </div>
  )
}
