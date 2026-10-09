"use client"

import { SegmentError } from "@/components/shared/segment-error"

export default function NotificationsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <SegmentError
      title="Notifications could not be loaded"
      description="The inbox did not load. Your account is still signed in."
      onRetry={reset}
    />
  )
}