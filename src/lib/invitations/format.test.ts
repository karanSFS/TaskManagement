import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { invitationMessage, invitationStatusLabel } from "./format.ts"

describe("invitation copy", () => {
  it("names the project, role, inviter, and token link", () => {
    const message = invitationMessage({
      email: "ada@example.com",
      projectName: "Birthflow",
      projectKey: "BIRTH",
      role: "member",
      inviterName: "Karan",
      expiresAt: "2026-10-16T00:00:00.000Z",
      token: "11111111-1111-4111-8111-111111111111",
    }, "https://fixtask.example")

    assert.match(message.subject, /Birthflow/)
    assert.match(message.text, /Karan/)
    assert.match(message.text, /Member/)
    assert.match(message.text, /https:\/\/fixtask.example\/invitations\/11111111-1111-4111-8111-111111111111/)
  })

  it("labels stored invitation statuses", () => {
    assert.equal(invitationStatusLabel("pending"), "Pending")
    assert.equal(invitationStatusLabel("expired"), "Expired")
    assert.equal(invitationStatusLabel("revoked"), "Cancelled")
  })
})