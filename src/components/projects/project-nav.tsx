"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "cn"

const tabs = [
  { href: "", label: "Overview" },
  { href: "/members", label: "Members" },
  { href: "/settings", label: "Settings" },
]

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`
        const active = tab.href === "" ? pathname === base : pathname.startsWith(href)
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "border-b-2 px-2.5 py-1.5 text-sm",
              active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
