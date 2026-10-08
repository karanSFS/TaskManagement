import {
  Boxes,
  Bug,
  Flame,
  FolderKanban,
  Layers,
  Rocket,
  Ship,
  Wrench,
  type LucideIcon,
} from "lucide-react"

export const projectIcons = {
  "folder-kanban": FolderKanban,
  boxes: Boxes,
  flame: Flame,
  rocket: Rocket,
  bug: Bug,
  layers: Layers,
  wrench: Wrench,
  ship: Ship,
} satisfies Record<string, LucideIcon>

export const projectIconNames = Object.keys(projectIcons) as [keyof typeof projectIcons, ...(keyof typeof projectIcons)[]]

export type ProjectIconName = keyof typeof projectIcons

export function isProjectIcon(value: string): value is ProjectIconName {
  return Object.prototype.hasOwnProperty.call(projectIcons, value)
}

export function projectIcon(name: string | null | undefined): LucideIcon {
  if (name && isProjectIcon(name)) {
    return projectIcons[name]
  }

  return FolderKanban
}
