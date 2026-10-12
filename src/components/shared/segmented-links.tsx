import Link from "next/link"

import { cn } from "@/lib/utils"

export function SegmentedLinks({
  label,
  items,
}: {
  label: string
  items: { href: string; label: string; active: boolean }[]
}) {
  return (
    <nav aria-label={label} className="flex max-w-full overflow-x-auto rounded-lg border bg-muted/40 p-0.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          replace
          scroll={false}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-md px-2.5 py-1 text-sm whitespace-nowrap transition-colors",
            item.active ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
