import { z } from "zod"

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const optionalDate = z.string().refine((value) => value === "" || isIsoDate(value), "Enter a valid date")

export const createSprintSchema = z
  .object({
    projectId: z.uuid("Choose a project"),
    name: z.string().trim().min(1, "Enter a sprint name").max(80, "Name is too long"),
    goal: z.string().trim().max(2000, "Goal is too long"),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine((value) => value.startDate === "" || value.endDate === "" || value.endDate >= value.startDate, {
    message: "The end date must be on or after the start date",
    path: ["endDate"],
  })

export const updateSprintSchema = z
  .object({
    sprintId: z.uuid("Choose a sprint"),
    name: z.string().trim().min(1, "Enter a sprint name").max(80, "Name is too long"),
    goal: z.string().trim().max(2000, "Goal is too long"),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine((value) => value.startDate === "" || value.endDate === "" || value.endDate >= value.startDate, {
    message: "The end date must be on or after the start date",
    path: ["endDate"],
  })

export const moveIssueSchema = z.object({
  issueId: z.uuid("Choose an issue"),
  sprintId: z.union([z.uuid(), z.literal("")]),
})

export type CreateSprintValues = z.infer<typeof createSprintSchema>
export type UpdateSprintValues = z.infer<typeof updateSprintSchema>
