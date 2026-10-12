import { Suspense } from "react"

import { ListSkeleton } from "@/components/shared/page-skeleton"
import { IssuesView, type IssueSearch } from "@/components/workspace/issues-view"
import { projectHref } from "@/lib/config/nav"

export const metadata = { title: "Issues" }

type Props = { params: Promise<{ projectId: string }>; searchParams: Promise<IssueSearch> }

export default function ProjectIssuesPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Content({ params, searchParams }: Props) {
  const { projectId } = await params
  return <IssuesView searchParams={searchParams} basePath={projectHref(projectId, "issues")} scopeProjectId={projectId} />
}
