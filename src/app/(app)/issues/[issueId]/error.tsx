"use client"

import { Button } from "@/components/ui/button"

export default function IssueError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid max-w-lg gap-3" role="alert">
      <h1 className="text-lg font-semibold">This issue could not be loaded</h1>
      <p className="text-sm text-muted-foreground">The issue did not load. Try again in a moment.</p>
      <Button type="button" variant="outline" className="w-fit" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
