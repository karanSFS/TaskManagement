"use client"

import { useState, type ReactNode } from "react"

import { ProjectForm } from "@/components/projects/project-form"
import { RevealButton } from "@/components/shared/pending-ui"
import type { UpdateProjectValues } from "@/lib/validations/project"

export function CreateProjectButton({
  children = "New project",
  size,
  variant,
  className,
  takenKeys,
}: {
  children?: ReactNode
  size?: "sm" | "default"
  variant?: "default" | "outline"
  className?: string
  takenKeys?: string[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <RevealButton type="button" size={size} variant={variant} className={className} onReveal={() => setOpen(true)}>
        {children}
      </RevealButton>
      <ProjectForm
        mode="create"
        open={open}
        onOpenChange={setOpen}
        takenKeys={takenKeys}
        defaultValues={{ name: "", key: "", description: "", icon: "folder-kanban" }}
      />
    </>
  )
}

export function EditProjectButton({
  projectId,
  members,
  defaultValues,
  label = "Edit project",
}: {
  projectId: string
  members: { id: string; name: string }[]
  defaultValues: UpdateProjectValues
  label?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <RevealButton type="button" variant="outline" size="sm" onReveal={() => setOpen(true)}>
        {label}
      </RevealButton>
      <ProjectForm mode="edit" projectId={projectId} members={members} defaultValues={defaultValues} open={open} onOpenChange={setOpen} />
    </>
  )
}

