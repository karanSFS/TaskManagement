import { z } from "zod"

import { isProjectIcon } from "@/lib/projects/icons"

export const projectRoles = ["owner", "admin", "member"] as const

export type ProjectRole = (typeof projectRoles)[number]

const projectKey = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9]{1,9}$/, "Use 2–10 letters or numbers, starting with a letter")

const projectIcon = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || iconAllowed(value), "Choose an icon")

function iconAllowed(value: string) {
  return isProjectIcon(value)
}

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Enter a project name").max(80, "Name is too long"),
  key: projectKey,
  description: z.string().trim().max(4000, "Description is too long"),
  icon: projectIcon,
})

export const updateProjectSchema = createProjectSchema.extend({
  leadId: z.uuid("Choose a project lead"),
})

export const addMemberSchema = z.object({
  email: z.email("Enter a valid email"),
  role: z.enum(projectRoles),
})

export const memberRoleSchema = z.object({
  role: z.enum(projectRoles),
})

export type CreateProjectValues = z.infer<typeof createProjectSchema>
export type UpdateProjectValues = z.infer<typeof updateProjectSchema>
export type AddMemberValues = z.infer<typeof addMemberSchema>
