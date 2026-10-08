import { Boxes, Bug, Flame, FolderKanban, Layers, Rocket, Ship, Wrench } from "lucide-react"

import { cn } from "cn"

export function ProjectIcon({ name, className }: { name: string | null; className?: string }) {
  const classes = cn("size-4", className)

  switch (name) {
    case "boxes":
      return <Boxes className={classes} />
    case "bug":
      return <Bug className={classes} />
    case "flame":
      return <Flame className={classes} />
    case "layers":
      return <Layers className={classes} />
    case "rocket":
      return <Rocket className={classes} />
    case "ship":
      return <Ship className={classes} />
    case "wrench":
      return <Wrench className={classes} />
    default:
      return <FolderKanban className={classes} />
  }
}
