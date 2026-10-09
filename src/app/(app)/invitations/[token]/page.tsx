import Link from "next/link"
import { Suspense } from "react"
import { z } from "zod"

import { InvitationCard } from "@/components/invitations/invitation-actions"
import { PageHeader } from "@/components/layout/page-header"
import { DetailSkeleton } from "@/components/shared/page-skeleton"
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
    <div className="grid max-w-xl gap-4">
      <PageHeader title="Invitation" description="Accept to join the project, or reject it." />
      {invitation ? (
        <InvitationCard invitation={invitation} />
      ) : (
        <p className="text-sm text-muted-foreground">This invitation link is not valid.</p>
      )}
      <Link href="/invitations" className="text-sm font-medium text-info hover:underline">
        All invitations
      </Link>
    </div>
  )
}
