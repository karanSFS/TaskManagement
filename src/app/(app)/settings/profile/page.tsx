import { Suspense } from "react"

import { ProfileForm } from "@/components/auth/profile-form"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { getProfileName } from "@/lib/services/profile.service"

export const metadata = {
  title: "Profile",
}

export default function ProfilePage() {
  return (
    <div className="grid gap-4">
      <PageHeader title="Profile" description="This name is shown to people who share a project with you." />
      <Suspense fallback={<Skeleton className="h-40 max-w-md" />}>
        <ProfileContent />
      </Suspense>
    </div>
  )
}

async function ProfileContent() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : ""
  const profileName = await getProfileName(user.id)

  return <ProfileForm email={user.email ?? ""} fullName={profileName || metadataName} />
}
