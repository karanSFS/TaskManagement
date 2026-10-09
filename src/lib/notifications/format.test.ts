import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatFileSize, notificationHref, notificationLabel } from "./format.ts"

describe("notification formatting", () => {
  it("labels known kinds", () => {
    assert.equal(notificationLabel("mentioned"), "Mentioned you")
    assert.equal(notificationLabel("other"), "Notification")
  })

  it("links to the issue, then the project", () => {
    assert.equal(notificationHref({ issueId: "issue-1", projectId: "project-1" }), "/issues/issue-1")
    assert.equal(notificationHref({ issueId: null, projectId: "project-1" }), "/projects/project-1")
    assert.equal(notificationHref({ issueId: null, projectId: null }), "/notifications")
  })

  it("formats file sizes", () => {
    assert.equal(formatFileSize(0), "0 B")
    assert.equal(formatFileSize(1024), "1 KB")
    assert.equal(formatFileSize(1024 * 1024), "1.0 MB")
  })
})
