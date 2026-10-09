"use client"

import { SegmentError } from "@/components/shared/segment-error"

export default function BacklogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <SegmentError
      title="Backlog could not be loaded"
      description="The backlog did not load. Your account is still signed in."
      onRetry={reset}
    />
  )
}
