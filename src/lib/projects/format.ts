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

export const projectKeyMaxLength = 80

export function issueKey(projectKey: string, issueNumber: number) {
  return `${projectKey}-${issueNumber}`
}

export function normalizeProjectKey(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, projectKeyMaxLength)
}

export function isProjectKey(value: string) {
  return value.length > 0 && value.length <= projectKeyMaxLength && /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(value)
}

export function suggestProjectKey(name: string) {
  const key = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, projectKeyMaxLength)
    .replace(/-+$/g, "")
  return isProjectKey(key) ? key : ""
}
