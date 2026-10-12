"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { deleteAttachment, openAttachment, saveAttachment } from "@/lib/actions/attachments"
import { formatFileSize } from "@/lib/notifications/format"
import { formatProjectDate } from "@/lib/projects/format"
import { createClient } from "@/lib/supabase/client"
import { attachmentMimeTypes, isAllowedAttachmentType, maxAttachmentBytes } from "@/lib/validations/attachment"
import type { IssueAttachment } from "@/lib/services/attachment.service"

export function AttachmentSection({
  issueId,
  projectId,
  attachments,
  readOnly = false,
}: {
  issueId: string
  projectId: string
  attachments: IssueAttachment[]
  readOnly?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [removeId, setRemoveId] = useState<string | null>(null)

  function onFile(file: File | undefined) {
    if (!file) return
    if (!isAllowedAttachmentType(file.type)) {
      toast.error("That file type is not allowed.")
      return
    }
    if (file.size <= 0 || file.size > maxAttachmentBytes) {
      toast.error("Files must be 50 MB or smaller.")
      return
    }

    const storagePath = `${projectId}/${issueId}/${crypto.randomUUID()}`
    startTransition(async () => {
      const supabase = createClient()
      const uploaded = await supabase.storage.from("attachments").upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploaded.error) {
        toast.error("Could not upload that file. Try again.")
        return
      }

      try {
        const result = await saveAttachment({ issueId, storagePath, fileName: file.name })
        if (result?.error) {
          await supabase.storage.from("attachments").remove([storagePath])
          toast.error(result.error)
          return
        }
        toast.success(result?.success ?? "File attached.")
      } catch {
        await supabase.storage.from("attachments").remove([storagePath])
        toast.error("Could not save that file. Try again.")
      } finally {
        if (inputRef.current) inputRef.current.value = ""
      }
    })
  }

  return (
    <section className="grid min-w-0 gap-2">
      <h2 className="text-sm font-semibold">Attachments</h2>
      {attachments.length === 0 ? <p className="text-sm text-muted-foreground">No files yet.</p> : null}
      {attachments.length > 0 ? (
        <ul className="grid gap-1">
          {attachments.map((file) => (
            <li key={file.id} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left hover:underline"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await openAttachment(file.id)
                    if (result.error || !result.url) {
                      toast.error(result.error ?? "Could not open that file.")
                      return
                    }
                    window.open(result.url, "_blank", "noopener,noreferrer")
                  })
                }}
              >
                {file.fileName}
              </button>
              <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</span>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{formatProjectDate(file.createdAt)}</span>
              {file.canDelete && !readOnly ? (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setRemoveId(file.id)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {readOnly ? null : (
      <label className="text-xs text-muted-foreground">
        <input
          ref={inputRef}
          type="file"
          accept={attachmentMimeTypes.join(",")}
          className="block w-full max-w-full text-sm text-foreground file:mr-2 file:rounded-md file:border file:bg-background file:px-2 file:py-1"
          disabled={pending}
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        Images, PDF, text, and Office files up to 50 MB.
      </label>
      )}
      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={(next) => {
          if (!next) setRemoveId(null)
        }}
        title="Remove this file?"
        description="The file is deleted from the issue. This cannot be undone."
        confirmLabel="Remove file"
        pending={pending}
        destructive
        onConfirm={() => {
          if (!removeId) return
          const attachmentId = removeId
          startTransition(async () => {
            const result = await deleteAttachment(issueId, attachmentId)
            if (result?.error) {
              toast.error(result.error)
              return
            }
            toast.success(result?.success ?? "File removed.")
            setRemoveId(null)
          })
        }}
      />
    </section>
  )
}
