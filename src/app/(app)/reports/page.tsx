import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { DetailSkeleton } from "@/components/shared/page-skeleton"
import { ReportsView, type ReportSearch } from "@/components/workspace/reports-view"

export const metadata = { title: "Reports" }

export default function ReportsPage({ searchParams }: { searchParams: Promise<ReportSearch> }) {
  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader title="Reports" description="Issue and sprint totals across your projects." />
      <Suspense fallback={<DetailSkeleton />}>
        <ReportsView searchParams={searchParams} basePath="/reports" />
      </Suspense>
    </div>
  )
}
