"use client"

import { SegmentError } from "@/components/shared/segment-error"

export default function InvitationsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <SegmentError
      title="Invitations could not be loaded"
      description="Your invitations did not load. Your account is still signed in."
      onRetry={reset}
    />
  )
}
