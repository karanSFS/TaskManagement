import Form from "next/form"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Search } from "lucide-react"

import { IssueBoard } from "@/components/issues/issue-board"
import { filterFieldClass } from "@/components/shared/field-styles"
import { SegmentedLinks } from "@/components/shared/segmented-links"
import { getCurrentUser } from "@/lib/auth/session"
import { projectHref } from "@/lib/config/nav"
import { boardMax, boardPageSize, listBoard } from "@/lib/services/issue.service"
import { cn } from "@/lib/utils"
import { boardAssignees } from "@/lib/validations/issue"

export type BoardSearch = { assignee?: string; q?: string; scope?: string; more?: string }

export async function BoardView({ projectId, searchParams }: { projectId: string; searchParams: Promise<BoardSearch> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const assignee = boardAssignees.find((value) => value === params.assignee) ?? "all"
  const query = params.q?.trim() ?? ""
  const requested = Number(params.more)
  const limit = Number.isInteger(requested) ? Math.min(boardMax, Math.max(boardPageSize, requested)) : boardPageSize
  const board = await listBoard(user.id, projectId, assignee, query, params.scope === "sprint" ? "sprint" : "all", limit)
  if (!board) notFound()

  const base = projectHref(projectId, "board")
  const href = (next: { assignee?: string; scope?: string; q?: string; more?: string }) => {
    const search = new URLSearchParams()
    const merged = { assignee, scope: board.scope, q: query, more: limit > boardPageSize ? String(limit) : "", ...next }
    if (merged.assignee !== "all") search.set("assignee", merged.assignee)
    if (merged.scope === "sprint") search.set("scope", "sprint")
    if (merged.q) search.set("q", merged.q)
    if (merged.more && merged.more !== String(boardPageSize)) search.set("more", merged.more)
    const value = search.toString()
    return value ? `${base}?${value}` : base
  }
  const signature = board.columns
    .map((column) => `${column.id}:${column.issues.map((issue) => `${issue.id}:${issue.sprintId ?? ""}`).join(",")}`)
    .join("|")
  const filtered = assignee !== "all" || Boolean(query)

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {board.activeSprint ? (
          <SegmentedLinks
            label="Board scope"
            items={[
              { href: href({ scope: "all" }), label: "All issues", active: board.scope === "all" },
              { href: href({ scope: "sprint" }), label: board.activeSprint.name, active: board.scope === "sprint" },
            ]}
          />
        ) : null}
        <SegmentedLinks
          label="Assignee"
          items={[
            { href: href({ assignee: "all" }), label: "Anyone", active: assignee === "all" },
            { href: href({ assignee: "me" }), label: "Mine", active: assignee === "me" },
            { href: href({ assignee: "unassigned" }), label: "Unassigned", active: assignee === "unassigned" },
          ]}
        />
        <Form action={base} replace scroll={false} className="relative min-w-0 flex-1 sm:max-w-64">
          {assignee !== "all" ? <input type="hidden" name="assignee" value={assignee} /> : null}
          {board.scope === "sprint" ? <input type="hidden" name="scope" value="sprint" /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={query} aria-label="Search the board" placeholder="Search titles" className={cn(filterFieldClass, "h-8 pl-8")} />
        </Form>
        {filtered ? (
          <Link href={href({ assignee: "all", q: "" })} replace scroll={false} className="text-xs font-medium text-primary hover:underline">
            Clear filters
          </Link>
        ) : null}
        {!board.archived ? (
          <p className="ml-auto hidden text-xs text-muted-foreground lg:block">Drag cards to change status · Enter opens a card</p>
        ) : null}
      </div>
      {board.total > board.shown ? (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Showing the {board.shown} most recently updated of {board.total} issues.</span>
          {board.shown < boardMax ? (
            <Link href={href({ more: String(Math.min(boardMax, board.shown + boardPageSize)) })} className="font-medium text-primary hover:underline">
              Show more
            </Link>
          ) : (
            <span>Search to find older ones.</span>
          )}
        </p>
      ) : null}
      <IssueBoard
        key={signature}
        columns={board.columns}
        projectKey={board.projectKey}
        projectId={board.projectId}
        readOnly={board.archived}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  )
}
