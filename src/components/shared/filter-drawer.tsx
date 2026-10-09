"use client"

import { useState, type FormEventHandler, type ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export const filterFieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

export function FilterDrawer({
  action,
  title = "Filters",
  description = "Narrow the list, then apply.",
  activeCount = 0,
  onSubmit,
  children,
}: {
  action: string
  title?: string
  description?: string
  activeCount?: number
  onSubmit?: FormEventHandler<HTMLFormElement>
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <SlidersHorizontal />
        Filters
        {activeCount > 0 ? (
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary tabular-nums">{activeCount}</span>
        ) : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          {open ? (
            <form
              action={action}
              onSubmit={onSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="grid flex-1 content-start gap-4 overflow-y-auto p-4">{children}</div>
              <SheetFooter className="flex-row justify-end border-t">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Apply</Button>
              </SheetFooter>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
