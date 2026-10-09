export function notificationLabel(kind: string) {
  switch (kind) {
    case "assigned":
      return "Assigned you"
    case "mentioned":
      return "Mentioned you"
    case "commented":
      return "Commented"
    case "issue_updated":
      return "Updated an issue"
    case "project_member_added":
      return "Added you to a project"
    case "sprint_changed":
      return "Changed the sprint"
    default:
      return "Notification"
  }
}

export function formatNotificationTime(value: string, now = Date.now()) {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return ""
  const minutes = Math.floor((now - time) / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

export const notificationKinds = [
  "assigned",
  "mentioned",
  "commented",
  "issue_updated",
  "project_member_added",
  "sprint_changed",
] as const

export function isNotificationKind(value: string): value is (typeof notificationKinds)[number] {
  return notificationKinds.some((kind) => kind === value)
}

export function notificationHref(item: { issueId: string | null; projectId: string | null }) {
  if (item.issueId) return `/issues/${item.issueId}`
  if (item.projectId) return `/projects/${item.projectId}`
  return "/notifications"
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
