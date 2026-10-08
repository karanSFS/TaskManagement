"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { safeNextPath, type ActionState } from "@/lib/auth/paths"
import { createClient } from "@/lib/supabase/server"
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
  type ForgotPasswordValues,
  type LoginValues,
  type ProfileValues,
  type ResetPasswordValues,
  type SignupValues,
} from "@/lib/validations/auth"

async function siteOrigin() {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  if (origin) {
    return origin
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  const proto = headerStore.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function signIn(nextPath: string, values: LoginValues): Promise<ActionState> {
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Check your email and password." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return { error: error.message }
  }

  redirect(safeNextPath(nextPath))
}

export async function signUp(values: SignupValues): Promise<ActionState> {
  const parsed = signupSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Check the form and try again." }
  }

  const origin = await siteOrigin()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.session) {
    redirect("/dashboard")
  }

  return {
    success: "Check your inbox and confirm your email before signing in. Local mail is in Mailpit.",
  }
}

export async function requestPasswordReset(values: ForgotPasswordValues): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Enter a valid email." }
  }

  const origin = await siteOrigin()
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: "If an account exists for that email, a reset link is on its way.",
  }
}

export async function resetPassword(values: ResetPasswordValues): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Choose a password with at least 8 characters." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "This reset link is invalid or has expired. Request a new one." }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { error: error.message }
  }

  redirect("/dashboard")
}

export async function updateProfile(values: ProfileValues): Promise<ActionState> {
  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Enter a name between 2 and 80 characters." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.fullName },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: "Profile updated." }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
