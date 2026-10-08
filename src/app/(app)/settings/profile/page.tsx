import { Suspense } from "react"

import { ProfileForm } from "@/components/auth/profile-form"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"

export const metadata = {
  title: "Profile",
}

export default function ProfilePage() {
  return (
    <div className="grid gap-4">
      <PageHeader title="Profile" description="This name is stored on your auth account until profiles exist." />
      <Suspense fallback={<Skeleton className="h-40 max-w-md" />}>
        <ProfileContent />
      </Suspense>
    </div>
  )
}

async function ProfileContent() {
  const user = await getCurrentUser()
  const fullName = typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name : ""

  return <ProfileForm email={user?.email ?? ""} fullName={fullName} />
}
