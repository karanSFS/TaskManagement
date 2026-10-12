import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isRecoveryAmr, nextFromLocation, safeNextPath, signedInLanding } from "./paths.ts"

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

describe("nextFromLocation", () => {
  it("keeps the query string on the path", () => {
    assert.equal(nextFromLocation("/projects/1/board", "?scope=sprint"), "/projects/1/board?scope=sprint")
    assert.equal(nextFromLocation("/", ""), "/dashboard")
  })
})

describe("signedInLanding", () => {
  it("honours an internal next path and skips auth pages", () => {
    assert.equal(signedInLanding("/projects/1/board?scope=sprint"), "/projects/1/board?scope=sprint")
    assert.equal(signedInLanding("/login"), "/dashboard")
    assert.equal(signedInLanding("/reset-password"), "/dashboard")
    assert.equal(signedInLanding(null), "/dashboard")
  })
})

describe("isRecoveryAmr", () => {
  it("accepts only a recovery method", () => {
    assert.equal(isRecoveryAmr([{ method: "recovery", timestamp: 1 }]), true)
    assert.equal(isRecoveryAmr(["recovery"]), true)
    assert.equal(isRecoveryAmr([{ method: "password", timestamp: 1 }]), false)
    assert.equal(isRecoveryAmr(undefined), false)
  })
})
