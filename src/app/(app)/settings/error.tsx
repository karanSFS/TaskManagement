"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function SettingsError({
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
    <div className="rounded-lg border bg-card px-4 py-5" role="alert">
      <p className="text-sm font-medium">Settings could not be loaded</p>
      <p className="mt-1 text-sm text-muted-foreground">Your account is still signed in. Try again.</p>
      <Button className="mt-3" size="sm" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
