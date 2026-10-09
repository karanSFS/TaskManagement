"use client"

import { SegmentError } from "@/components/shared/segment-error"

export default function BoardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <SegmentError
      title="Board could not be loaded"
      description="The board did not load. Your account is still signed in."
      onRetry={reset}
    />
  )
}
