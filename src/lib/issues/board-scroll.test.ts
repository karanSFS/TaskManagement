import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { boardScrollEdges } from "./board-scroll.ts"

describe("boardScrollEdges", () => {
  it("shows a hint only when columns extend past the viewport", () => {
    assert.deepEqual(boardScrollEdges(0, 800, 800), { left: false, right: false })
    assert.deepEqual(boardScrollEdges(0, 400, 1200), { left: false, right: true })
    assert.deepEqual(boardScrollEdges(200, 400, 1200), { left: true, right: true })
    assert.deepEqual(boardScrollEdges(800, 400, 1200), { left: true, right: false })
  })
})

describe("app shell width", () => {
  it("lets the board scroll instead of clipping the page", () => {
    const layout = readFileSync(new URL("../../app/(app)/layout.tsx", import.meta.url), "utf8")
    const shell = layout.slice(layout.indexOf("<SidebarInset"), layout.indexOf("</SidebarInset>"))
    assert.equal(shell.includes("overflow-x-hidden"), false)
    assert.equal(shell.includes("min-w-0"), true)

    const board = readFileSync(new URL("../../components/issues/issue-board.tsx", import.meta.url), "utf8")
    assert.equal(board.includes("overflow-x-auto"), true)
    assert.equal(board.includes("Swipe sideways for more columns."), true)
  })
})
