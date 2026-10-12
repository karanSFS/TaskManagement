"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

import { cn } from "cn"

import { LinkPending } from "@/components/shared/pending-ui"
import { lastProjectCookie, projectHref, projectTabs } from "@/lib/config/nav"

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname()

  useEffect(() => {
    document.cookie = `${lastProjectCookie}=${projectId}; path=/; max-age=31536000; samesite=lax`
  }, [projectId])

  return (
    <nav aria-label="Project" className="-mx-4 overflow-x-auto border-b px-4 md:-mx-6 md:px-6 [scrollbar-width:none]">
      <div className="flex w-max gap-1">
        {projectTabs.map((tab) => {
          const href = projectHref(projectId, tab.slug)
          const active = tab.slug === "" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={tab.slug}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors [&_svg]:size-4",
                active
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <tab.icon />
              {tab.title}
              <LinkPending />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
