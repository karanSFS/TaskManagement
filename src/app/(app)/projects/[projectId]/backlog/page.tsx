import { Suspense } from "react"

import { ListSkeleton } from "@/components/shared/page-skeleton"
import { BacklogView, type BacklogSearch } from "@/components/workspace/backlog-view"

export const metadata = { title: "Backlog" }

type Props = { params: Promise<{ projectId: string }>; searchParams: Promise<BacklogSearch> }

export default function ProjectBacklogPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Content({ params, searchParams }: Props) {
  const { projectId } = await params
  return <BacklogView projectId={projectId} searchParams={searchParams} />
}
