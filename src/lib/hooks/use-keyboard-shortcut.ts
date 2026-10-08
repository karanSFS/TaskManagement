"use client"

import { useEffect } from "react"

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
}

export function useKeyboardShortcut(key: string, onMatch: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (isTypingTarget(event.target)) {
        return
      }
      if (event.key.toLowerCase() !== key.toLowerCase()) {
        return
      }

      event.preventDefault()
      onMatch()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [key, onMatch])
}
