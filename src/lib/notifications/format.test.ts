import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatFileSize, formatNotificationTime, notificationHref, notificationLabel } from "./format.ts"

describe("notification formatting", () => {
  it("labels known kinds", () => {
    assert.equal(notificationLabel("mentioned"), "Mentioned you")
    assert.equal(notificationLabel("other"), "Notification")
  })

  it("links to the issue, then the project", () => {
    assert.equal(notificationHref({ issueId: "issue-1", projectId: "project-1" }), "/issues/issue-1")
    assert.equal(notificationHref({ issueId: null, projectId: "project-1" }), "/projects/project-1")
    assert.equal(notificationHref({ issueId: null, projectId: null }), "/notifications")
    assert.equal(notificationHref({ kind: "project_invited", issueId: null, projectId: "project-1" }), "/invitations")
  })

  it("uses a short relative time, then a date", () => {
    const now = Date.parse("2026-10-09T12:00:00.000Z")
    assert.equal(formatNotificationTime("2026-10-09T11:59:30.000Z", now), "Just now")
    assert.equal(formatNotificationTime("2026-10-09T10:00:00.000Z", now), "2h ago")
    assert.equal(formatNotificationTime("2026-10-01T12:00:00.000Z", now), "Oct 1, 2026")
  })

  it("formats file sizes", () => {
    assert.equal(formatFileSize(0), "0 B")
    assert.equal(formatFileSize(1024), "1 KB")
    assert.equal(formatFileSize(1024 * 1024), "1.0 MB")
  })
})
