import type { ProjectRole } from "@/lib/validations/project"

export function formatDueDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatProjectDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export function roleLabel(role: string) {
  if (role === "owner") return "Owner"
  if (role === "admin") return "Admin"
  return "Member"
}

export function isProjectRole(role: string): role is ProjectRole {
  return role === "owner" || role === "admin" || role === "member"
}

export function issueKey(projectKey: string, issueNumber: number) {
  return `${projectKey}-${issueNumber}`
}

export function suggestProjectKey(name: string) {
  const compact = name.toUpperCase().replace(/[^A-Z0-9]/g, "")
  const key = compact.slice(0, 6)
  return /^[A-Z][A-Z0-9]{1,9}$/.test(key) ? key : ""
}
