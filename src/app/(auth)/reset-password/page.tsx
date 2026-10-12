import Link from "next/link"

import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata = {
  title: "Reset password",
}

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>This page works after you open the reset link from your email.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Link expired?{" "}
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Request a new one
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
