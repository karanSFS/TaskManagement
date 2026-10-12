import { Suspense } from "react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { ListSkeleton } from "@/components/shared/page-skeleton"
import { IssuesView, type IssueSearch } from "@/components/workspace/issues-view"

export const metadata = { title: "All issues" }

export default function IssuesPage({ searchParams }: { searchParams: Promise<IssueSearch> }) {
  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        title="All issues"
        description="Search and filter issues across every project you belong to."
        actions={<CreateIssueButton>New issue</CreateIssueButton>}
      />
      <Suspense fallback={<ListSkeleton />}>
        <IssuesView searchParams={searchParams} basePath="/issues" />
      </Suspense>
    </div>
  )
}
