import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { safeNextPath } from "./paths.ts"

describe("safeNextPath", () => {
  it("keeps an internal path", () => {
    assert.equal(safeNextPath("/issues"), "/issues")
    assert.equal(safeNextPath("/issues?q=a%20b"), "/issues?q=a%20b")
  })

  it("falls back for missing or external targets", () => {
    assert.equal(safeNextPath(null), "/dashboard")
    assert.equal(safeNextPath(""), "/dashboard")
    assert.equal(safeNextPath("https://evil.example"), "/dashboard")
    assert.equal(safeNextPath("//evil.example"), "/dashboard")
    assert.equal(safeNextPath("/\\evil.example"), "/dashboard")
    assert.equal(safeNextPath("/%2f%2fevil.example"), "/dashboard")
    assert.equal(safeNextPath("/%252f%252fevil.example"), "/dashboard")
    assert.equal(safeNextPath("/issues\nSet-Cookie:x"), "/dashboard")
  })
})
