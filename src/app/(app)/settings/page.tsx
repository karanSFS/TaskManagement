import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Settings",
}

export default function SettingsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Settings"
        description="Account preferences for this workspace. Project settings arrive with projects."
      />
      <section className="grid max-w-lg gap-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-sm font-medium">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the name shown in the account menu. A profiles table is added in Phase 2.
          </p>
        </div>
        <Button asChild className="w-fit" variant="outline">
          <Link href="/settings/profile">Edit profile</Link>
        </Button>
      </section>
      <section className="grid max-w-lg gap-2 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Use the theme button in the top bar to switch between light, dark, and system.
        </p>
      </section>
    </div>
  )
}
