import { Suspense } from "react"

import { ListSkeleton } from "@/components/shared/page-skeleton"
import { ProjectRedirect } from "@/components/workspace/project-redirect"

export const metadata = { title: "Backlog" }

export default function BacklogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ProjectRedirect slug="backlog" searchParams={searchParams} />
    </Suspense>
  )
}
