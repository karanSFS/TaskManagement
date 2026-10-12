import Link from "next/link"
import { Suspense } from "react"
import { z } from "zod"

import { SignupForm } from "@/components/auth/signup-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authHref, safeNextPath } from "@/lib/auth/paths"

export const metadata = {
  title: "Create account",
}

export default function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Confirm your email, then accept an invitation or create a project.</CardDescription>
      </CardHeader>
      <Suspense fallback={<p className="px-6 pb-6 text-sm text-muted-foreground">Loading the form…</p>}>
        <SignupFields searchParams={searchParams} />
      </Suspense>
    </Card>
  )
}

async function SignupFields({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const params = await searchParams
  const nextPath = safeNextPath(params.next)
  const email = z.email().safeParse(params.email).success ? params.email : undefined
  const loginHref = authHref("/login", nextPath, email)
  return (
    <>
      <CardContent className="grid gap-4">
        {email ? (
          <p className="text-sm text-muted-foreground">
            Create the account for {email}. The invitation stays waiting until you accept it.
          </p>
        ) : null}
        <SignupForm nextPath={nextPath} defaultEmail={email} />
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href={loginHref} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </>
  )
}
