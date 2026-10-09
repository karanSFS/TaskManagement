import Link from "next/link"
import { Suspense } from "react"

import { LoginForm } from "@/components/auth/login-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { safeNextPath } from "@/lib/auth/paths"

export const metadata = {
  title: "Sign in",
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your FixTask account to get back to work.</CardDescription>
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
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  const nextPath = safeNextPath(params.next)
  const signupHref = nextPath === "/dashboard" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`
  return (
    <>
      <CardContent>
        <LoginForm nextPath={nextPath} confirmError={params.error === "confirm"} />
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        New here?{" "}
        <Link href={signupHref} className="font-medium text-info hover:underline">
          Create an account
        </Link>
      </CardFooter>
    </>
  )
}
