import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  phase?: string
}

export function EmptyState({ icon: Icon, title, description, phase }: EmptyStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-start justify-center gap-2 rounded-lg border border-dashed bg-card px-4 py-5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
        {phase ? <Badge variant="secondary">{phase}</Badge> : null}
      </div>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
