import Link from "next/link"
import type { ReactNode } from "react"

import { IssueOpenButton } from "@/components/issues/issue-drawer"
import { LinkPending } from "@/components/shared/pending-ui"
import { cn } from "@/lib/utils"

export function IssueList({ children }: { children: ReactNode }) {
  return <ul className="divide-y overflow-hidden rounded-xl border bg-card">{children}</ul>
}

export function IssueListRow({
  id,
  issueKey,
  title,
  meta,
  edge,
}: {
  id: string
  issueKey: string
  title: string
  meta: ReactNode
  edge?: string
}) {
  return (
    <li className={cn("min-w-0 border-l-2 px-3 py-2.5 hover:bg-muted/40", edge ?? "border-l-transparent")}>
      <div className="flex min-w-0 items-center gap-2">
        <Link href={`/issues/${id}`} className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground hover:underline">
          <LinkPending />
          {issueKey}
        </Link>
        <IssueOpenButton issueId={id} className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline">
          {title}
        </IssueOpenButton>
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{meta}</div>
    </li>
  )
}
