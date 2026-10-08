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
        <CardDescription>Use your TaskForge account to get back to work.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading sign in…</p>}>
          <LoginFields searchParams={searchParams} />
        </Suspense>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Create an account
        </Link>
      </CardFooter>
    </Card>
  )
}

async function LoginFields({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  return <LoginForm nextPath={safeNextPath(params.next)} confirmError={params.error === "confirm"} />
}
