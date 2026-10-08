"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function AuthError({
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
    <div className="rounded-xl border bg-card p-4 text-sm">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 text-muted-foreground">The auth page could not be loaded.</p>
      <Button className="mt-3" size="sm" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
