import assert from "node:assert/strict"
import { describe, it } from "node:test"

import type { SprintIssue } from "../services/sprint.service.ts"
import { filterBacklog } from "./backlog.ts"

function issue(overrides: Partial<SprintIssue> & Pick<SprintIssue, "id" | "number" | "title">): SprintIssue {
  return {
    status: "To Do",
    done: false,
    priority: "Medium",
    priorityRank: 3,
    assigneeName: null,
    updatedAt: "2026-10-01T00:00:00.000Z",
    sprintId: null,
    ...overrides,
  }
}

const issues = [
  issue({ id: "1", number: 2, title: "Notifications", priority: "Highest", priorityRank: 5, updatedAt: "2026-10-02T00:00:00.000Z", done: true, status: "Done" }),
  issue({ id: "2", number: 1, title: "Board layout", assigneeName: "Karan Kumar", updatedAt: "2026-10-03T00:00:00.000Z" }),
]

describe("backlog filters", () => {
  it("hides done issues unless that status is requested", () => {
    assert.equal(filterBacklog(issues, "BIRTHFLOW", { query: "", status: "open", sort: "updated", direction: "desc" }).length, 1)
    assert.equal(filterBacklog(issues, "BIRTHFLOW", { query: "", status: "done", sort: "updated", direction: "desc" })[0]?.title, "Notifications")
  })

  it("matches the issue key, title, and assignee", () => {
    const byKey = filterBacklog(issues, "BIRTHFLOW", { query: "birthflow-1", status: "all", sort: "key", direction: "asc" })
    assert.deepEqual(byKey.map((item) => item.number), [1])
    const byName = filterBacklog(issues, "BIRTHFLOW", { query: "karan", status: "all", sort: "title", direction: "asc" })
    assert.equal(byName[0]?.title, "Board layout")
  })

  it("sorts by priority rank", () => {
    const sorted = filterBacklog(issues, "BIRTHFLOW", { query: "", status: "all", sort: "priority", direction: "desc" })
    assert.deepEqual(sorted.map((item) => item.priority), ["Highest", "Medium"])
  })
})
