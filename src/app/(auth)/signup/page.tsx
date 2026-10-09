import Link from "next/link"

import { SignupForm } from "@/components/auth/signup-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata = {
  title: "Create account",
}

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Plan together. Solve faster. Ship better.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-info hover:underline">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  )
}
