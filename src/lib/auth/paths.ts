function isInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\u0000-\u001F\u007F]/.test(value)
}

function decodeOnce(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

const blockedLandings = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/auth"])

export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback
  const trimmed = value.trim()
  if (!isInternalPath(trimmed)) return fallback

  const once = decodeOnce(trimmed)
  const twice = once === null ? null : decodeOnce(once)
  if (once === null || twice === null || !isInternalPath(once) || !isInternalPath(twice)) return fallback

  return trimmed
}

export function nextFromLocation(pathname: string, search: string) {
  if (pathname === "/") return "/dashboard"
  const query = search.startsWith("?") || search.length === 0 ? search : `?${search}`
  return safeNextPath(`${pathname}${query}`)
}

export function signedInLanding(next: string | null | undefined) {
  const target = safeNextPath(next)
  const pathname = target.split("?")[0] ?? "/dashboard"
  if (blockedLandings.has(pathname) || pathname.startsWith("/auth/")) return "/dashboard"
  return target
}

export function isRecoveryAmr(amr: unknown) {
  if (!Array.isArray(amr)) return false
  return amr.some((entry) => {
    if (entry === "recovery") return true
    return typeof entry === "object" && entry !== null && "method" in entry && entry.method === "recovery"
  })
}

export function authHref(path: "/login" | "/signup", nextPath: string, email?: string) {
  const params = new URLSearchParams()
  if (nextPath !== "/dashboard") params.set("next", nextPath)
  if (email) params.set("email", email)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export type ActionState = {
  error?: string
  success?: string
  href?: string
}
