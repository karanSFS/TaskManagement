import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { loginSchema, signupSchema } from "./auth.ts"

describe("auth schemas", () => {
  it("rejects a bad email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret" })
    assert.equal(result.success, false)
  })

  it("requires a matching password of at least 8 characters", () => {
    const short = signupSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "ada@team.dev",
      password: "short",
      confirmPassword: "short",
    })
    const mismatch = signupSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "ada@team.dev",
      password: "long-enough",
      confirmPassword: "different",
    })
    const ok = signupSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "ada@team.dev",
      password: "long-enough",
      confirmPassword: "long-enough",
    })

    assert.equal(short.success, false)
    assert.equal(mismatch.success, false)
    assert.equal(ok.success, true)
  })
})
