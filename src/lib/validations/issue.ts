import { z } from "zod"

const assignee = z.union([z.uuid(), z.literal("")])

export const createIssueSchema = z.object({
  projectId: z.uuid("Choose a project"),
  title: z.string().trim().min(1, "Enter a title").max(200, "Title is too long"),
  description: z.string().trim().max(20000, "Description is too long"),
  issueTypeId: z.uuid("Choose a type"),
  statusId: z.uuid("Choose a status"),
  priorityId: z.uuid("Choose a priority"),
  assigneeId: assignee,
})

export const updateIssueSchema = createIssueSchema.omit({ projectId: true })

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment").max(8000, "Comment is too long"),
})

export const labelNameSchema = z.object({
  name: z.string().trim().min(1, "Enter a label").max(40, "Label is too long"),
})

export type CreateIssueValues = z.infer<typeof createIssueSchema>
export type UpdateIssueValues = z.infer<typeof updateIssueSchema>
