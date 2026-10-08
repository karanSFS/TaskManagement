import type { LucideIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { mainNav, utilityNav, type NavItem } from "@/lib/config/nav"

export function SectionPage({ href }: { href: string }) {
  const item = [...mainNav, ...utilityNav].find((entry) => entry.href === href)
  if (!item) {
    return null
  }

  return (
    <div className="grid gap-4">
      <PageHeader title={item.title} description={item.description} />
      <EmptyState
        icon={item.icon as LucideIcon}
        title={`${item.title} is not built yet`}
        description={`${item.description} This section is scheduled for ${item.phase}.`}
        phase={item.phase}
      />
    </div>
  )
}

export function sectionMetadata(item: NavItem) {
  return { title: item.title }
}
