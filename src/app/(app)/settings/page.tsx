import { Suspense } from "react"

import { ProfileForm } from "@/components/auth/profile-form"
import { PageHeader } from "@/components/layout/page-header"
import { AppearanceSettings } from "@/components/settings/appearance-settings"
import { FormSkeleton } from "@/components/shared/page-skeleton"
import { LoadError } from "@/components/shared/load-error"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors/app-error"
import { getProfileName } from "@/lib/services/profile.service"

export const metadata = {
  title: "Settings",
}

export default function SettingsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Settings"
        description="Your name for teammates, and how TaskForge looks on this device."
      />
      <Suspense fallback={<FormSkeleton />}>
        <ProfileSection />
      </Suspense>
      <AppearanceSettings />
    </div>
  )
}

async function ProfileSection() {
  const user = await getCurrentUser()
  if (!user) return null

  let profileName = ""
  try {
    profileName = await getProfileName(user.id)
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Could not load your profile."
    return <LoadError message={message} />
  }

  const metadataName = metadataFullName(user.user_metadata)
  return (
    <section className="grid max-w-lg gap-3 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-sm font-medium">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This name is shown in the account menu and to people who share a project with you.
        </p>
      </div>
      <ProfileForm email={user.email ?? ""} fullName={profileName || metadataName} />
    </section>
  )
}

function metadataFullName(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("full_name" in metadata)) return ""
  const name = metadata.full_name
  return typeof name === "string" ? name : ""
}
