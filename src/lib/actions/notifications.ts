"use server"

import { revalidatePath } from "next/cache"

import { actionError } from "@/lib/actions/result"
import { type ActionState } from "@/lib/auth/paths"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors/app-error"
import { markAllNotificationsRead, markNotificationRead } from "@/lib/services/notification.service"

function failure(error: unknown, operation: string, userId?: string, resourceId?: string): ActionState {
  if (!(error instanceof AppError)) throw error
  return actionError(error, operation, userId, resourceId)
}

function refreshNotifications() {
  revalidatePath("/notifications")
  revalidatePath("/", "layout")
}

export async function markRead(notificationId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to update notifications." }

  try {
    await markNotificationRead(user.id, notificationId)
    refreshNotifications()
    return {}
  } catch (error) {
    return failure(error, "markNotificationRead", user.id, notificationId)
  }
}

export async function markAllRead(): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to update notifications." }

  try {
    await markAllNotificationsRead(user.id)
    refreshNotifications()
    return { success: "Notifications marked read." }
  } catch (error) {
    return failure(error, "markAllNotificationsRead", user.id)
  }
}
