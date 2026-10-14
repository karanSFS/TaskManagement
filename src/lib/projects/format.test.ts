import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isProjectKey, issueKey, normalizeProjectKey, roleLabel, suggestProjectKey } from "./format.ts"

describe("project formatting", () => {
  it("builds an issue key", () => {
    assert.equal(issueKey("TEST", 12), "TEST-12")
  })

  it("suggests a key from the whole name", () => {
    assert.equal(suggestProjectKey("Task Forge"), "TASK-FORGE")
    assert.equal(suggestProjectKey("1abc"), "1ABC")
    assert.equal(suggestProjectKey("A"), "A")
    assert.equal(suggestProjectKey("sssssssssss"), "SSSSSSSSSSS")
    assert.equal(suggestProjectKey("---"), "")
  })

  it("keeps letters, numbers, and hyphens in a typed key", () => {
    assert.equal(normalizeProjectKey("birth-flow 2!"), "BIRTH-FLOW2")
    assert.equal(isProjectKey("2026-Q1"), true)
    assert.equal(isProjectKey("1"), true)
    assert.equal(isProjectKey("A_B"), false)
    assert.equal(isProjectKey("-START"), false)
    assert.equal(isProjectKey("END-"), false)
    assert.equal(isProjectKey("A--B"), false)
  })

  it("labels roles", () => {
    assert.equal(roleLabel("owner"), "Owner")
    assert.equal(roleLabel("admin"), "Admin")
    assert.equal(roleLabel("member"), "Member")
  })
})
