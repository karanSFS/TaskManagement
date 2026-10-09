"use client"

import { Button } from "@/components/ui/button"

export function SegmentError({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry: () => void
}) {
  return (
    <div className="grid max-w-lg gap-3" role="alert">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button type="button" variant="outline" className="w-fit" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
