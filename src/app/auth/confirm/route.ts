import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { safeNextPath } from "@/lib/auth/paths"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as EmailOtpType | null
  const code = url.searchParams.get("code")
  const next = safeNextPath(url.searchParams.get("next"))
  const supabase = await createClient()

  // Custom templates send token_hash. The default hosted templates send a PKCE code.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : next, url.origin))
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin))
    }
  }

  const loginUrl = new URL("/login", url.origin)
  loginUrl.searchParams.set("error", "confirm")
  return NextResponse.redirect(loginUrl)
}
