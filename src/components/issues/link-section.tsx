"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { addIssueLink, removeIssueLink } from "@/lib/actions/issues"
import { issueKey } from "@/lib/projects/format"
import { linkTypes } from "@/lib/validations/issue"

const fieldClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

const labels: Record<(typeof linkTypes)[number], { out: string; in: string }> = {
  blocks: { out: "blocks", in: "is blocked by" },
  relates: { out: "relates to", in: "relates to" },
  duplicates: { out: "duplicates", in: "is duplicated by" },
}

export function LinkSection({
  issueId,
  links,
  choices,
}: {
  issueId: string
  links: { id: string; type: string; direction: "out" | "in"; issueId: string; number: number; title: string; projectKey: string }[]
  choices: { id: string; number: number; title: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const [targetIssueId, setTargetIssueId] = useState(choices[0]?.id ?? "")
  const [linkType, setLinkType] = useState<(typeof linkTypes)[number]>("relates")

  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-medium">Links</h2>
      {links.length === 0 ? <p className="text-sm text-muted-foreground">No linked issues.</p> : null}
      {links.length > 0 ? (
        <ul className="grid gap-1">
          {links.map((link) => {
            const phrase = labels[link.type as (typeof linkTypes)[number]]
            const text = phrase ? phrase[link.direction] : link.type
            return (
              <li key={link.id} className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground">{text}</span>
                <Link href={`/issues/${link.issueId}`} className="min-w-0 flex-1 truncate hover:underline">
                  {issueKey(link.projectKey, link.number)} {link.title}
                </Link>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await removeIssueLink(issueId, link.id)
                      if (result?.error) toast.error(result.error)
                    })
                  }}
                >
                  Remove
                </Button>
              </li>
            )
          })}
        </ul>
      ) : null}
      {choices.length > 0 ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            startTransition(async () => {
              const result = await addIssueLink(issueId, { targetIssueId, linkType })
              if (result?.error) toast.error(result.error)
            })
          }}
        >
          <select className={fieldClass} value={linkType} onChange={(event) => setLinkType(event.target.value as (typeof linkTypes)[number])} aria-label="Link type">
            {linkTypes.map((type) => (
              <option key={type} value={type}>
                {labels[type].out}
              </option>
            ))}
          </select>
          <select className={fieldClass} value={targetIssueId} onChange={(event) => setTargetIssueId(event.target.value)} aria-label="Issue">
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.number} · {choice.title}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline" disabled={pending || !targetIssueId} className="w-fit">
            Link
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">Create another issue in this project to link it.</p>
      )}
    </section>
  )
}
