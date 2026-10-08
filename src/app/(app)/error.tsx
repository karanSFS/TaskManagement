"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="rounded-lg border bg-card px-4 py-5">
      <p className="text-sm font-medium">This page failed to load</p>
      <p className="mt-1 text-sm text-muted-foreground">Try again. If it keeps failing, sign out and back in, or check your connection.</p>
      <Button className="mt-3" size="sm" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
