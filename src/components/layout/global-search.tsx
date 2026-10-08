"use client"

import { useRouter } from "next/navigation"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { mainNav, utilityNav } from "@/lib/config/nav"

type GlobalSearchProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const pages = [...mainNav, ...utilityNav]

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search TaskForge"
      description="Jump to a page. Issue search arrives in Phase 7."
    >
      <CommandInput placeholder="Jump to a page…" />
      <CommandList>
        <CommandEmpty>No matching pages.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((item) => (
            <CommandItem key={item.href} value={`${item.title} ${item.description}`} onSelect={() => go(item.href)}>
              <item.icon />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Coming later">
          <CommandItem disabled value="issue search">
            <span>Issue keys, titles, and labels — Phase 7</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
