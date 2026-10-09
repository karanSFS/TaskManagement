"use client"

import { SegmentError } from "@/components/shared/segment-error"

export default function ReportsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <SegmentError
      title="Reports could not be loaded"
      description="The report did not load, so these numbers are not shown as zero."
      onRetry={reset}
    />
  )
}
