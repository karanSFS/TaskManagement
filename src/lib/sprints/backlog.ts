import type { SprintIssue } from "@/lib/services/sprint.service"

export type BacklogStatus = "open" | "done" | "all"
export type BacklogSort = "updated" | "title" | "key" | "priority"

export function filterBacklog(
  issues: SprintIssue[],
  projectKey: string,
  options: { query: string; status: BacklogStatus; sort: BacklogSort; direction: "asc" | "desc" },
) {
  const needle = options.query.trim().toLowerCase()
  const filtered = issues.filter((issue) => {
    if (options.status === "open" && issue.done) return false
    if (options.status === "done" && !issue.done) return false
    if (!needle) return true
    const key = `${projectKey}-${issue.number}`.toLowerCase()
    return (
      issue.title.toLowerCase().includes(needle) ||
      key.includes(needle) ||
      issue.status.toLowerCase().includes(needle) ||
      (issue.assigneeName ?? "").toLowerCase().includes(needle)
    )
  })

  const factor = options.direction === "asc" ? 1 : -1
  return filtered.sort((left, right) => {
    if (options.sort === "title") return left.title.localeCompare(right.title) * factor
    if (options.sort === "key") return (left.number - right.number) * factor
    if (options.sort === "priority") return (left.priorityRank - right.priorityRank) * factor
    return left.updatedAt.localeCompare(right.updatedAt) * factor
  })
}
