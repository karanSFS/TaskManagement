"use client"

import { useState, type ReactNode } from "react"

import { ProjectForm } from "@/components/projects/project-form"
import { Button } from "@/components/ui/button"
import type { UpdateProjectValues } from "@/lib/validations/project"

export function CreateProjectButton({
  children = "New project",
  size,
  variant,
}: {
  children?: ReactNode
  size?: "sm" | "default"
  variant?: "default" | "outline"
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" size={size} variant={variant} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <ProjectForm
        mode="create"
        open={open}
        onOpenChange={setOpen}
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
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ProjectForm mode="edit" projectId={projectId} members={members} defaultValues={defaultValues} open={open} onOpenChange={setOpen} />
    </>
  )
}

