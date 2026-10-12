import { Suspense } from "react"

import { DetailSkeleton } from "@/components/shared/page-skeleton"
import { ReportsView, type ReportSearch } from "@/components/workspace/reports-view"
import { projectHref } from "@/lib/config/nav"

export const metadata = { title: "Reports" }

type Props = { params: Promise<{ projectId: string }>; searchParams: Promise<ReportSearch> }

export default function ProjectReportsPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Content({ params, searchParams }: Props) {
  const { projectId } = await params
  return <ReportsView searchParams={searchParams} basePath={projectHref(projectId, "reports")} scopeProjectId={projectId} />
}
