import { Suspense } from "react"

import { DetailSkeleton } from "@/components/shared/page-skeleton"
import { SprintsView } from "@/components/workspace/sprints-view"

export const metadata = { title: "Sprints" }

type Props = { params: Promise<{ projectId: string }> }

export default function ProjectSprintsPage({ params }: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Content params={params} />
    </Suspense>
  )
}

async function Content({ params }: Props) {
  const { projectId } = await params
  return <SprintsView projectId={projectId} />
}
