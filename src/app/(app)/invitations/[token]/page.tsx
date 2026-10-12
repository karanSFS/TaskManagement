import { MailX } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import { z } from "zod"

import { InvitationCard } from "@/components/invitations/invitation-actions"
import { EmptyState } from "@/components/shared/empty-state"
import { DetailSkeleton } from "@/components/shared/page-skeleton"
import { Button } from "@/components/ui/button"
import { getInvitationPreview } from "@/lib/services/invitation.service"

export const metadata = { title: "Invitation" }

export default function InvitationTokenPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <InvitationTokenContent params={params} />
    </Suspense>
  )
}

async function InvitationTokenContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = z.uuid().safeParse(token).success ? await getInvitationPreview(token) : null

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 pt-2 md:pt-8">
      {invitation ? (
        <InvitationCard invitation={invitation} switchTo={`/invitations/${token}`} />
      ) : (
        <EmptyState
          icon={MailX}
          title="This link doesn't work"
          description="The invitation may have been mistyped or removed. Ask the person who invited you to send a new one."
        />
      )}
      <Button asChild variant="ghost" className="justify-self-center">
        <Link href="/invitations">See all invitations</Link>
      </Button>
    </div>
  )
}
