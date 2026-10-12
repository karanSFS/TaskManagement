import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { z } from "zod"

import { InvitationSummary } from "@/components/invitations/invitation-summary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/session"
import { getInvitationLanding } from "@/lib/services/invitation.service"

export const metadata = { title: "Join project" }

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading invitation…</CardContent></Card>}>
      <JoinContent params={params} />
    </Suspense>
  )
}

async function JoinContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const valid = z.uuid().safeParse(token).success
  if (valid && (await getCurrentUser())) redirect(`/invitations/${token}`)
  const invitation = valid ? await getInvitationLanding(token) : null

  if (!invitation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This link doesn&apos;t work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The invitation may have been mistyped or removed. Ask the person who invited you to send a new one.
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">Go to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const nextPath = `/invitations/${token}`
  const query = new URLSearchParams({ next: nextPath, email: invitation.email }).toString()
  const signIn = `/login?${query}`
  const signUp = `/signup?${query}`
  const open = invitation.status === "pending"

  return (
    <Card>
      <CardContent className="pt-6">
        <InvitationSummary invitation={invitation} />
      </CardContent>
      {open ? (
        <CardFooter className="grid gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href={invitation.hasAccount ? signIn : signUp}>
              {invitation.hasAccount ? "Sign in to accept" : "Create account to accept"}
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {invitation.hasAccount ? "No account yet? " : "Already have an account? "}
            <Link href={invitation.hasAccount ? signUp : signIn} className="font-medium text-primary hover:underline">
              {invitation.hasAccount ? "Create one" : "Sign in"}
            </Link>
          </p>
          {invitation.hasAccount ? null : (
            <p className="text-center text-xs text-muted-foreground">
              After you confirm your email, the invitation waits for you on your Home page.
            </p>
          )}
        </CardFooter>
      ) : (
        <CardFooter>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">Go to sign in</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
