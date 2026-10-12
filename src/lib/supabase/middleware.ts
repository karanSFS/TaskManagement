import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { isRecoveryAmr, nextFromLocation, signedInLanding } from "@/lib/auth/paths"
import type { Database } from "@/types/database.types"

import { getSupabaseEnv } from "./env"

const GUEST_ONLY_PREFIXES = ["/login", "/signup", "/forgot-password"]

function isGuestOnly(pathname: string) {
  return GUEST_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function isAuthCallback(pathname: string) {
  return pathname === "/auth" || pathname.startsWith("/auth/")
}

function isPublic(pathname: string) {
  return pathname.startsWith("/join/")
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { url, anonKey } = getSupabaseEnv()

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const invitationToken = /^\/invitations\/([0-9a-f-]{36})$/i.exec(pathname)?.[1]
  if (!user && invitationToken) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = `/join/${invitationToken}`
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  if (pathname === "/reset-password") {
    const redirectUrl = request.nextUrl.clone()
    if (!user) {
      redirectUrl.pathname = "/forgot-password"
      redirectUrl.search = ""
      return NextResponse.redirect(redirectUrl)
    }

    const { data } = await supabase.auth.getClaims()
    if (!isRecoveryAmr(data?.claims.amr)) {
      redirectUrl.pathname = "/dashboard"
      redirectUrl.search = ""
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  }

  if (!user && !isGuestOnly(pathname) && !isAuthCallback(pathname) && !isPublic(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.search = ""
    const next = nextFromLocation(pathname, request.nextUrl.search)
    if (next !== "/dashboard") {
      redirectUrl.searchParams.set("next", next)
    }
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isGuestOnly(pathname)) {
    const landing = signedInLanding(request.nextUrl.searchParams.get("next"))
    const destination = new URL(landing, request.url)
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = destination.pathname
    redirectUrl.search = destination.search
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
