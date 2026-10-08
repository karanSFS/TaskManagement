import { AppError } from "@/lib/errors/app-error"
import { type ActionState } from "@/lib/auth/paths"
import { logServerEvent } from "@/lib/logger"

export function actionError(
  error: unknown,
  operation: string,
  userId?: string,
  resourceId?: string,
): ActionState {
  if (error instanceof AppError) {
    logServerEvent({
      level: error.status >= 500 ? "error" : "warn",
      operation,
      code: error.code,
      userId,
      resourceId,
    })
    return { error: error.message }
  }

  logServerEvent({
    level: "error",
    operation,
    code: "INTERNAL",
    userId,
    resourceId,
  })

  return { error: "Something went wrong. Try again." }
}
