"use client"

import { useState, type ReactNode } from "react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "cn"

type FrameProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  dirty?: boolean
  pending?: boolean
  className?: string
  children: ReactNode
}

export function FormDialog(props: FrameProps) {
  return (
    <FormFrame {...props}>
      {(request) => (
        <Dialog open={props.open} onOpenChange={request}>
          <DialogContent className={cn("max-h-[85vh] overflow-y-auto sm:max-w-lg", props.className)}>
            <DialogHeader>
              <DialogTitle>{props.title}</DialogTitle>
              <DialogDescription>{props.description}</DialogDescription>
            </DialogHeader>
            {props.children}
          </DialogContent>
        </Dialog>
      )}
    </FormFrame>
  )
}

export function FormSheet(props: FrameProps) {
  return (
    <FormFrame {...props}>
      {(request) => (
        <Sheet open={props.open} onOpenChange={request}>
          <SheetContent className={cn("w-full overflow-y-auto data-[side=right]:sm:max-w-xl", props.className)}>
            <SheetHeader>
              <SheetTitle>{props.title}</SheetTitle>
              <SheetDescription>{props.description}</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-4">{props.children}</div>
          </SheetContent>
        </Sheet>
      )}
    </FormFrame>
  )
}

function FormFrame({
  dirty = false,
  pending = false,
  onOpenChange,
  children,
}: {
  dirty?: boolean
  pending?: boolean
  onOpenChange: (open: boolean) => void
  children: (request: (open: boolean) => void) => ReactNode
}) {
  const [discardOpen, setDiscardOpen] = useState(false)

  function request(next: boolean) {
    if (next) {
      onOpenChange(true)
      return
    }
    if (pending) return
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  return (
    <>
      {children(request)}
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard unsaved changes?"
        description="This form will close and your edits will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setDiscardOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
