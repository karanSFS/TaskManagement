import Link from "next/link"
import { Suspense } from "react"

import { ProfileForm } from "@/components/auth/profile-form"
import { PageHeader } from "@/components/layout/page-header"
import { AppearanceSettings } from "@/components/settings/appearance-settings"
import { FormSkeleton } from "@/components/shared/page-skeleton"
import { LoadError } from "@/components/shared/load-error"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors/app-error"
import { getProfileName } from "@/lib/services/profile.service"

export const metadata = {
  title: "Settings",
}

export default function SettingsPage() {
  return (
    <div className="grid max-w-2xl gap-4">
      <PageHeader
        title="Settings"
        description="Account settings for your name, notifications, and this device. Members, keys, and archive live on each project."
      />
      <Suspense fallback={<FormSkeleton />}>
        <ProfileSection />
      </Suspense>
      <AppearanceSettings />
      <section className="grid gap-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-sm font-medium">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assignments, mentions, comments, and project changes are saved on your account. This is separate from a project&apos;s own settings.
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/notifications">Open notifications</Link>
        </Button>
      </section>
      <section className="grid gap-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-sm font-medium">Project settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a project to change its name, key, members, or archive state. Those pages are not part of this account.
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/projects">View projects</Link>
        </Button>
      </section>
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
    <section className="grid gap-3 rounded-lg border bg-card p-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Account</p>
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
