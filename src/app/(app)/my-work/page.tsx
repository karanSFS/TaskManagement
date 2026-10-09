import Link from "next/link"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { ListSkeleton } from "@/components/shared/page-skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { formatDueDate, issueKey } from "@/lib/projects/format"
import { listMyWork, type MyWorkList } from "@/lib/services/issue.service"

export const metadata = { title: "My Work" }

export default function MyWorkPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="My Work"
        description="Open issues assigned to you, reported by you, and due within 7 days."
      />
      <Suspense fallback={<ListSkeleton />}>
        <MyWorkLists />
      </Suspense>
    </div>
  )
}

async function MyWorkLists() {
  const user = await getCurrentUser()
  if (!user) return null

  const work = await listMyWork(user.id)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="grid gap-6">
      <WorkSection title="Assigned to you" empty="Nothing is assigned to you." list={work.assigned} today={today} />
      <WorkSection title="Reported by you" empty="You have not reported any open issues." list={work.reported} today={today} />
      <WorkSection title="Due soon" empty="Nothing assigned to you or reported by you is due in the next 7 days." list={work.dueSoon} today={today} showDue />
    </div>
  )
}

function WorkSection({
  title,
  empty,
  list,
  today,
  showDue = false,
}: {
  title: string
  empty: string
  list: MyWorkList
  today: string
  showDue?: boolean
}) {
  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-medium">{title}</h2>
      {list.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {list.items.map((issue) => {
            const overdue = showDue && issue.dueDate !== null && issue.dueDate < today
            return (
              <li key={issue.id}>
                <Link href={`/issues/${issue.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                  <span className="w-24 shrink-0 text-sm font-medium text-muted-foreground">
                    {issueKey(issue.projectKey, issue.number)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{issue.status}</span>
                  {showDue && issue.dueDate ? (
                    <span className={overdue ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                      {overdue ? "Overdue" : formatDueDate(issue.dueDate)}
                    </span>
                  ) : (
                    <span className="hidden text-xs text-muted-foreground md:inline">{issue.projectName}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {list.total > list.items.length ? (
        <p className="text-xs text-muted-foreground">
          Showing {list.items.length} of {list.total}
        </p>
      ) : null}
    </section>
  )
}
