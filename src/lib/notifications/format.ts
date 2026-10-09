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
