import Link from "next/link"
import { Suspense } from "react"

import { SignupForm } from "@/components/auth/signup-form"
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
  title: "Create account",
}

export default function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Plan together. Solve faster. Ship better.</CardDescription>
      </CardHeader>
      <Suspense fallback={<p className="px-6 pb-6 text-sm text-muted-foreground">Loading the form…</p>}>
        <SignupFields searchParams={searchParams} />
      </Suspense>
    </Card>
  )
}

async function SignupFields({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams
  const nextPath = safeNextPath(params.next)
  const loginHref = nextPath === "/dashboard" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`
  return (
    <>
      <CardContent>
        <SignupForm nextPath={nextPath} />
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-info hover:underline">
          Sign in
        </Link>
      </CardFooter>
    </>
  )
}
