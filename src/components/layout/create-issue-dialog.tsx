"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type CreateIssueDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateIssueDialog({ open, onOpenChange }: CreateIssueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create issue</DialogTitle>
          <DialogDescription>
            Projects, issue keys, and the create form arrive in Phase 4. This shortcut is already reserved so
            creation stays one keystroke away.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
