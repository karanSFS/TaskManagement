"use client"

import { SegmentError } from "@/components/shared/segment-error"

export default function SprintsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <SegmentError
      title="Sprints could not be loaded"
      description="Sprints did not load. Your account is still signed in."
      onRetry={reset}
    />
  )
}
