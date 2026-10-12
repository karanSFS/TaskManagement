import {
  Bell,
  CalendarRange,
  ChartColumn,
  CircleDot,
  FolderKanban,
  House,
  Kanban,
  LayoutDashboard,
  ListTodo,
  Mail,
  Settings,
  SquareKanban,
  Users,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  description: string
}

export const personalNav: NavItem[] = [
  { title: "Home", href: "/dashboard", icon: House, description: "Open work, deadlines, and recent activity." },
  { title: "My work", href: "/my-work", icon: ListTodo, description: "Issues assigned to you, reported by you, and due soon." },
  { title: "Inbox", href: "/notifications", icon: Bell, description: "Assignments, mentions, and comments." },
  { title: "Invitations", href: "/invitations", icon: Mail, description: "Projects you have been invited to." },
]

export const workspaceNav: NavItem[] = [
  { title: "All projects", href: "/projects", icon: FolderKanban, description: "Every project you belong to." },
  { title: "All issues", href: "/issues", icon: CircleDot, description: "Search and filter issues across projects." },
  { title: "Reports", href: "/reports", icon: ChartColumn, description: "Totals across your projects." },
]

export const utilityNav: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings, description: "Profile, theme, and density." },
]

export const mainNav: NavItem[] = [...personalNav, ...workspaceNav]

export type ProjectTab = { slug: string; title: string; icon: LucideIcon }

export const projectTabs: ProjectTab[] = [
  { slug: "", title: "Overview", icon: LayoutDashboard },
  { slug: "board", title: "Board", icon: Kanban },
  { slug: "backlog", title: "Backlog", icon: SquareKanban },
  { slug: "sprints", title: "Sprints", icon: CalendarRange },
  { slug: "issues", title: "Issues", icon: CircleDot },
  { slug: "reports", title: "Reports", icon: ChartColumn },
  { slug: "members", title: "Members", icon: Users },
  { slug: "settings", title: "Settings", icon: Settings },
]

export const lastProjectCookie = "fixtask_last_project"

export function projectHref(projectId: string, slug = "") {
  return slug ? `/projects/${projectId}/${slug}` : `/projects/${projectId}`
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  if (href === "/projects") return pathname === "/projects" || pathname === "/projects/new"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function activeProjectId(pathname: string) {
  const match = /^\/projects\/([0-9a-f-]{36})(?:\/|$)/i.exec(pathname)
  return match ? match[1] : null
}
