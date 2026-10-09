import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { invitationMessage, invitationStatusLabel, invitationWasSaved } from "./format.ts"

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
    assert.match(message.html, /Review invitation/)
    assert.match(message.html, /#4f46e5/)
    assert.match(message.html, /href="https:\/\/fixtask.example\/invitations\/11111111-1111-4111-8111-111111111111"/)
  })

  it("escapes project names in the email", () => {
    const message = invitationMessage({
      email: "ada@example.com",
      projectName: "A & B <script>",
      projectKey: "AB",
      role: "admin",
      inviterName: "Karan",
      expiresAt: "2026-10-16T00:00:00.000Z",
      token: "11111111-1111-4111-8111-111111111111",
    }, "https://fixtask.example")

    assert.match(message.html, /A &amp; B &lt;script&gt;/)
    assert.equal(message.html.includes("<script>"), false)
  })

  it("labels stored invitation statuses", () => {
    assert.equal(invitationStatusLabel("pending"), "Pending")
    assert.equal(invitationStatusLabel("expired"), "Expired")
    assert.equal(invitationStatusLabel("revoked"), "Cancelled")
  })

  it("treats a saved invitation with a failed email as an error case", () => {
    assert.equal(invitationWasSaved("The invitation was saved, but the email could not be sent. Use Resend on the members page."), true)
    assert.equal(invitationWasSaved("Invitation sent."), false)
  })
})