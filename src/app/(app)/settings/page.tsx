import Link from "next/link"
import { Suspense } from "react"

import { ProfileForm } from "@/components/auth/profile-form"
import { PageHeader } from "@/components/layout/page-header"
import { AppearanceSettings } from "@/components/settings/appearance-settings"
import { FormSkeleton } from "@/components/shared/page-skeleton"
import { LoadError } from "@/components/shared/load-error"
import { getCurrentUser } from "@/lib/auth/session"
import { userInitials } from "@/lib/auth/user"
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
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <h2 className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">Also on this account</h2>
        <Link href="/notifications" className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm hover:bg-muted/40">
          <span>
            <span className="block font-medium">Notifications</span>
            <span className="text-xs text-muted-foreground">Assignments, mentions, and comments</span>
          </span>
          <span className="text-xs font-medium text-info">Open</span>
        </Link>
        <Link href="/projects" className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40">
          <span>
            <span className="block font-medium">Projects</span>
            <span className="text-xs text-muted-foreground">Name, key, members, and archive live on each project</span>
          </span>
          <span className="text-xs font-medium text-info">Open</span>
        </Link>
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
    <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {userInitials(profileName || metadataName || user.email || "FixTask")}
        </span>
        <div>
        <p className="text-xs font-medium text-muted-foreground">Account</p>
        <h2 className="text-sm font-medium">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This name is shown in the account menu and to people who share a project with you.
        </p>
        </div>
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
