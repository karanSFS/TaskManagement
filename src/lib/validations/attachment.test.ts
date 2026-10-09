import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isAllowedAttachmentType, maxAttachmentBytes } from "./attachment.ts"

describe("attachment rules", () => {
  it("allows the bucket types and rejects everything else", () => {
    assert.equal(isAllowedAttachmentType("image/png"), true)
    assert.equal(isAllowedAttachmentType("application/pdf"), true)
    assert.equal(isAllowedAttachmentType("application/x-msdownload"), false)
    assert.equal(isAllowedAttachmentType("image/png; charset=utf-8"), false)
  })

  it("caps files at 50 MB", () => {
    assert.equal(maxAttachmentBytes, 50 * 1024 * 1024)
  })
})
