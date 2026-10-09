import {
  Bell,
  Mail,
  ChartColumn,
  CircleDot,
  CalendarRange,
  FolderKanban,
  House,
  Kanban,
  ListTodo,
  Settings,
  SquareKanban,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  description: string
  phase: string
}

export const mainNav: NavItem[] = [
  {
    title: "Home",
    href: "/dashboard",
    icon: House,
    description: "Your working view of open work and recent activity.",
    phase: "Phase 9",
  },
  {
    title: "My Work",
    href: "/my-work",
    icon: ListTodo,
    description: "Issues assigned to you, created by you, and due soon.",
    phase: "Phase 4",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    description: "Create workspaces, keys, members, and project settings.",
    phase: "Phase 3",
  },
  {
    title: "Issues",
    href: "/issues",
    icon: CircleDot,
    description: "Search, filter, and open issues across your projects.",
    phase: "Phase 4",
  },
  {
    title: "Backlog",
    href: "/backlog",
    icon: SquareKanban,
    description: "Order epics, stories, and unscheduled work.",
    phase: "Phase 6",
  },
  {
    title: "Board",
    href: "/board",
    icon: Kanban,
    description: "Move issues across the delivery columns.",
    phase: "Phase 5",
  },
  {
    title: "Sprints",
    href: "/sprints",
    icon: CalendarRange,
    description: "Plan, start, and complete sprints.",
    phase: "Phase 6",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: ChartColumn,
    description: "Sprint and issue analytics.",
    phase: "Phase 9",
  },
]

export const utilityNav: NavItem[] = [
  {
    title: "Invitations",
    href: "/invitations",
    icon: Mail,
    description: "Accept or reject project invitations sent to you.",
    phase: "Phase 3",
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
    description: "Assignments, mentions, and changes to your work.",
    phase: "Phase 8",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Profile and workspace preferences.",
    phase: "Phase 1",
  },
]

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
