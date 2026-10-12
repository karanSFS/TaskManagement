import Link from "next/link"
import { Suspense } from "react"
import { z } from "zod"

import { LoginForm } from "@/components/auth/login-form"
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
  title: "Sign in",
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your FixTask account to get back to your projects.</CardDescription>
      </CardHeader>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading sign in…</p>}>
        <LoginFields searchParams={searchParams} />
      </Suspense>
    </Card>
  )
}

async function LoginFields({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>
}) {
  const params = await searchParams
  const nextPath = safeNextPath(params.next)
  const email = z.email().safeParse(params.email).success ? params.email : undefined
  const signupHref = authHref("/signup", nextPath, email)
  return (
    <>
      <CardContent className="grid gap-4">
        {email ? <p className="text-sm text-muted-foreground">Sign in with {email} to open your invitation.</p> : null}
        <LoginForm nextPath={nextPath} confirmError={params.error === "confirm"} defaultEmail={email} />
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          New here?{" "}
          <Link href={signupHref} className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardFooter>
    </>
  )
}
