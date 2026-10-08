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
        description="Your account name and how TaskForge looks on this device."
      />
      <section className="grid max-w-lg gap-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-sm font-medium">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the name shown in the account menu and on projects you share.
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
