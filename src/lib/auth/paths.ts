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

export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback
  const trimmed = value.trim()
  if (!isInternalPath(trimmed)) return fallback

  const once = decodeOnce(trimmed)
  const twice = once === null ? null : decodeOnce(once)
  if (once === null || twice === null || !isInternalPath(once) || !isInternalPath(twice)) return fallback

  return trimmed
}

export type ActionState = {
  error?: string
  success?: string
  href?: string
}
