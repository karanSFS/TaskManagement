"use client"

import { Suspense, use, useState, type ReactNode } from "react"
import { Loader2, Plus } from "lucide-react"

import { CreateIssueForm } from "@/components/issues/create-issue-form"
import { CreateProjectButton } from "@/components/projects/create-project-dialog"
import { FormSheet } from "@/components/shared/form-dialog"
import { usePromisePending } from "@/components/shared/pending-ui"
import { Button } from "@/components/ui/button"
import { loadCreateIssueForm } from "@/lib/actions/issues"

type IssueFormData = Awaited<ReturnType<typeof loadCreateIssueForm>>

export function CreateIssueButton({
  projectId,
  children,
  size,
  variant,
  className,
}: {
  projectId?: string
  children?: ReactNode
  size?: "sm" | "default"
  variant?: "default" | "outline" | "ghost"
  className?: string
}) {
  return (
    <CreateIssueDialog
      projectId={projectId}
      trigger={(busy) => (
        <Button type="button" size={size} variant={variant} className={className} disabled={busy} aria-busy={busy || undefined}>
          {busy ? <Loader2 className="animate-spin" /> : children ? null : <Plus />}
          {children ?? "Create issue"}
        </Button>
      )}
    />
  )
}

export function CreateIssueDialog({
  projectId,
  open,
  onOpenChange,
  trigger,
}: {
  projectId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode | ((busy: boolean) => ReactNode)
}) {
  return (
    <IssueDialogHost projectId={projectId} open={open} onOpenChange={onOpenChange} trigger={trigger} />
  )
}

function IssueDialogHost({
  projectId,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: {
  projectId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode | ((busy: boolean) => ReactNode)
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const [requestState, setRequestState] = useState<{ open: boolean; projectId?: string; promise: Promise<IssueFormData> | null }>({
    open: false,
    promise: null,
  })
  if (open !== requestState.open || projectId !== requestState.projectId) {
    setRequestState({
      open,
      projectId,
      promise: open ? loadCreateIssueForm(projectId) : null,
    })
  }
  const request = requestState.promise
  const busy = usePromisePending(open ? request : null)

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <>
      {trigger ? (
        <span className="contents" onClick={() => setOpen(true)}>
          {typeof trigger === "function" ? trigger(busy) : trigger}
        </span>
      ) : null}
      {open && request ? (
        <Suspense
          fallback={
            <FormSheet open title="New issue" description="Loading projects and fields." onOpenChange={setOpen}>
              <p className="text-sm text-muted-foreground" role="status">
                Loading form…
              </p>
            </FormSheet>
          }
        >
          <LoadedIssueForm request={request} onOpenChange={setOpen} />
        </Suspense>
      ) : null}
    </>
  )
}

function LoadedIssueForm({
  request,
  onOpenChange,
}: {
  request: Promise<IssueFormData>
  onOpenChange: (open: boolean) => void
}) {
  const data = use(request)
  if ("error" in data && data.error) {
    return (
      <FormSheet open title="New issue" description="The form could not be loaded." onOpenChange={onOpenChange}>
        <p className="text-sm text-destructive" role="alert">
          {data.error}
        </p>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </FormSheet>
    )
  }
  if (!("projects" in data) || data.projects.length === 0) {
    const archived = "archivedCount" in data ? data.archivedCount : 0
    return (
      <FormSheet open title="New issue" description="A project is required before an issue can be filed." onOpenChange={onOpenChange}>
        <p className="text-sm text-muted-foreground">
          {archived > 0 ? "Your projects are archived. Restore one, or create a new project." : "Create a project before filing the first issue."}
        </p>
        <div className="flex gap-2">
          <CreateProjectButton size="sm">New project</CreateProjectButton>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </FormSheet>
    )
  }

  return (
    <CreateIssueForm
      open
      onOpenChange={onOpenChange}
      projects={data.projects}
      types={data.types}
      statuses={data.statuses}
      priorities={data.priorities}
      defaultProjectId={data.defaultProjectId}
    />
  )
}
