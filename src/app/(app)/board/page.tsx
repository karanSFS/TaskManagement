import { Suspense } from "react"
import { Kanban } from "lucide-react"

import { CreateIssueButton } from "@/components/issues/create-issue-dialog"
import { IssueBoard } from "@/components/issues/issue-board"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { listBoard, listIssueProjects } from "@/lib/services/issue.service"
import { boardAssignees } from "@/lib/validations/issue"

export const metadata = { title: "Board" }

type BoardSearch = { projectId?: string; assignee?: string; q?: string }

const fieldClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export default function BoardPage({ searchParams }: { searchParams: Promise<BoardSearch> }) {
  return (
    <div className="grid gap-4">
      <PageHeader title="Board" description="Move an issue into another column to change its status." />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <BoardContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function BoardContent({ searchParams }: { searchParams: Promise<BoardSearch> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) return null

  const projects = await listIssueProjects(user.id)
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Kanban}
        title="No projects yet"
        description="Create a project before moving work across the board."
      />
    )
  }

  const project = projects.find((item) => item.id === params.projectId) ?? projects[0]
  const assignee = boardAssignees.find((value) => value === params.assignee) ?? "all"
  const query = params.q?.trim() ?? ""
  const board = await listBoard(user.id, project.id, assignee, query)
  if (!board) {
    return <p className="text-sm text-muted-foreground">That project could not be loaded.</p>
  }

  const signature = board.columns.map((column) => `${column.id}:${column.issues.map((issue) => issue.id).join(",")}`).join("|")

  return (
    <div className="grid gap-3">
      <form action="/board" className="flex flex-wrap items-center gap-2">
        <select name="projectId" defaultValue={board.projectId} className={fieldClass} aria-label="Project">
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="assignee" defaultValue={assignee} className={fieldClass} aria-label="Assignee">
          <option value="all">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <input name="q" defaultValue={query} placeholder="Search titles" aria-label="Search titles" className={`${fieldClass} w-full max-w-xs`} />
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
        {board.archived ? null : (
          <CreateIssueButton projectId={board.projectId} size="sm" className="ml-auto">
            New issue
          </CreateIssueButton>
        )}
      </form>
      {board.archived ? (
        <p className="text-sm text-muted-foreground">
          This project is archived. You can still move existing issues. Restore it to file new ones.
        </p>
      ) : null}
      {board.total > board.shown ? (
        <p className="text-xs text-muted-foreground">
          Showing the latest {board.shown} of {board.total} issues.
        </p>
      ) : null}
      <IssueBoard key={signature} columns={board.columns} projectKey={board.projectKey} />
    </div>
  )
}
