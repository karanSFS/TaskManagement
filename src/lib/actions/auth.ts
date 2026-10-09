"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { actionError } from "@/lib/actions/result"
import { safeNextPath, type ActionState } from "@/lib/auth/paths"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors/app-error"
import { updateProfileName } from "@/lib/services/profile.service"
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

function authMessage(error: { code?: string; message: string }, fallback: string) {
  const code = error.code ?? ""
  const message = error.message.toLowerCase()

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "That email and password do not match."
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Confirm your email first. Check your inbox for the link."
  }
  if (code === "user_already_exists" || message.includes("already registered")) {
    return "An account already uses that email. Sign in instead."
  }
  if (code === "weak_password" || message.includes("password should")) {
    return "Choose a stronger password with at least 8 characters."
  }
  if (code === "same_password" || message.includes("different from the old")) {
    return "Choose a password you have not used for this account."
  }
  if (code.includes("rate_limit") || message.includes("rate limit") || message.includes("security purposes")) {
    return "Too many attempts. Wait a minute and try again."
  }
  return fallback
}

export async function signIn(nextPath: string, values: LoginValues): Promise<ActionState> {
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Check your email and password." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return { error: authMessage(error, "Could not sign in. Try again.") }
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
    return { error: authMessage(error, "Could not create the account. Try again.") }
  }

  if (data.session) {
    redirect("/dashboard")
  }

  // An existing confirmed email comes back as a user with no identities.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "An account already uses that email. Sign in instead." }
  }

  return {
    success: "Check your inbox and open the confirmation link, then sign in.",
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
    return { error: authMessage(error, "Could not send the reset link. Try again.") }
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
    return { error: authMessage(error, "Could not update the password. Try again.") }
  }

  redirect("/dashboard")
}

export async function updateProfile(values: ProfileValues): Promise<ActionState> {
  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Enter a name between 2 and 80 characters." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Sign in to update your profile." }
  }

  try {
    await updateProfileName(user.id, parsed.data.fullName)
  } catch (error) {
    if (!(error instanceof AppError)) {
      throw error
    }

    return actionError(error, "updateProfile", user.id)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.fullName },
  })

  if (error) {
    return { error: "Could not save your profile." }
  }

  revalidatePath("/", "layout")
  revalidatePath("/settings")
  revalidatePath("/settings/profile")
  return { success: "Profile updated." }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
