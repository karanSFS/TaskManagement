"use client"

import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export function ActivityTabs({
  comments,
  history,
  commentCount,
}: {
  comments: ReactNode
  history: ReactNode
  commentCount: number
}) {
  const [tab, setTab] = useState<"comments" | "history">("comments")
  const tabs = [
    { id: "comments" as const, label: commentCount > 0 ? `Comments (${commentCount})` : "Comments" },
    { id: "history" as const, label: "History" },
  ]

  return (
    <section className="grid min-w-0 gap-3">
      <div role="tablist" aria-label="Activity" className="flex gap-4 border-b">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn(
              "-mb-px border-b-2 px-0.5 pb-2 text-sm transition-colors",
              tab === item.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === "comments" ? comments : history}</div>
    </section>
  )
}
