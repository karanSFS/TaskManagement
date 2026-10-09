import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { issueKey, roleLabel, suggestProjectKey } from "./format.ts"

describe("project formatting", () => {
  it("builds an issue key", () => {
    assert.equal(issueKey("TEST", 12), "TEST-12")
  })

  it("suggests a key only when the name can produce one", () => {
    assert.equal(suggestProjectKey("Task Forge"), "TASKFO")
    assert.equal(suggestProjectKey("1abc"), "")
    assert.equal(suggestProjectKey("A"), "")
  })

  it("labels roles", () => {
    assert.equal(roleLabel("owner"), "Owner")
    assert.equal(roleLabel("admin"), "Admin")
    assert.equal(roleLabel("member"), "Member")
  })
})
