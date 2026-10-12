import { Suspense } from "react"

import { BoardSkeleton } from "@/components/shared/page-skeleton"
import { BoardView, type BoardSearch } from "@/components/workspace/board-view"

export const metadata = { title: "Board" }

type Props = { params: Promise<{ projectId: string }>; searchParams: Promise<BoardSearch> }

export default function ProjectBoardPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Content({ params, searchParams }: Props) {
  const { projectId } = await params
  return <BoardView projectId={projectId} searchParams={searchParams} />
}
