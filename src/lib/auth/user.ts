import type { User } from "@supabase/supabase-js"

export function displayName(user: User) {
  const fullName = user.user_metadata?.full_name
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim()
  }

  const emailName = user.email?.split("@")[0]
  return emailName && emailName.length > 0 ? emailName : "User"
}

export function userInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "")
  return letters.join("") || "TF"
}
