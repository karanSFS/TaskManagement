import { z } from "zod"

const assignee = z.union([z.uuid(), z.literal("")])

const dueDate = z.string().refine((value) => value === "" || isIsoDate(value), "Enter a valid date")

export const createIssueSchema = z.object({
  projectId: z.uuid("Choose a project"),
  title: z.string().trim().min(1, "Enter a title").max(200, "Title is too long"),
  description: z.string().trim().max(20000, "Description is too long"),
  issueTypeId: z.uuid("Choose a type"),
  statusId: z.uuid("Choose a status"),
  priorityId: z.uuid("Choose a priority"),
  assigneeId: assignee,
  dueDate,
})

export const updateIssueSchema = createIssueSchema.omit({ projectId: true })

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment").max(8000, "Comment is too long"),
})

export const labelNameSchema = z.object({
  name: z.string().trim().min(1, "Enter a label").max(40, "Label is too long"),
})

export const boardAssignees = ["all", "me", "unassigned"] as const

export const changeStatusSchema = z.object({
  issueId: z.uuid("Choose an issue"),
  statusId: z.uuid("Choose a status"),
})

export const issueSorts = ["updated", "created", "title", "priority", "key"] as const
export const myWorkViews = ["assigned", "reported", "due", "overdue"] as const
export const myWorkSorts = ["updated", "due", "priority", "title"] as const
export const linkTypes = ["blocks", "relates", "duplicates"] as const

export const subtaskSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(200, "Title is too long"),
})

export const issueLinkSchema = z.object({
  targetIssueId: z.uuid("Choose an issue"),
  linkType: z.enum(linkTypes),
})

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export type CreateIssueValues = z.infer<typeof createIssueSchema>
export type UpdateIssueValues = z.infer<typeof updateIssueSchema>
