import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { sprintOptions } from "./sprint-field.ts"

describe("sprintOptions", () => {
  it("offers the backlog and open sprints, and keeps a completed sprint visible", () => {
    const open = [
      { id: "active", name: "Now", status: "active" },
      { id: "next", name: "Next", status: "planned" },
    ]
    assert.deepEqual(sprintOptions(null, open).map((option) => option.name), ["Backlog", "Now (active)", "Next"])
    const completed = sprintOptions({ id: "old", name: "Last", status: "completed" }, open)
    assert.equal(completed.find((option) => option.id === "old")?.disabled, true)
    assert.equal(completed[0]?.name, "Backlog")
  })
})
