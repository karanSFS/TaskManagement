import { Suspense } from "react"
import { CircleDot, Clock3, Eye, Flag } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { displayName } from "@/lib/auth/user"

export const metadata = {
  title: "Home",
}

const widgets = [
  {
    title: "My open issues",
    description: "Issues you still need to move will list here.",
    phase: "Phase 4",
    icon: CircleDot,
  },
  {
    title: "Assigned to me",
    description: "Work waiting on you, once assignment exists.",
    phase: "Phase 4",
    icon: Flag,
  },
  {
    title: "Recently viewed",
    description: "Issues you opened recently will stay close by.",
    phase: "Phase 4",
    icon: Eye,
  },
  {
    title: "Due soon",
    description: "Deadlines show up after issues have due dates.",
    phase: "Phase 4",
    icon: Clock3,
  },
] as const

export default function DashboardPage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  )
}

async function HomeContent() {
  const user = await getCurrentUser()
  const name = user ? displayName(user) : "there"

  return (
    <div className="grid gap-4">
      <PageHeader
        title={`Hello, ${name}`}
        description="Ship work, not tickets. Issue lists, sprint progress, and charts arrive with the later phases."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {widgets.map((widget) => (
          <EmptyState key={widget.title} {...widget} />
        ))}
      </div>
      <section className="rounded-lg border bg-card px-4 py-3">
        <h2 className="text-sm font-medium">Keyboard</h2>
        <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
          <li>
            <span className="font-mono text-foreground">/</span> search pages
          </li>
          <li>
            <span className="font-mono text-foreground">C</span> create issue
          </li>
          <li>
            <span className="font-mono text-foreground">⌘B</span> collapse sidebar
          </li>
        </ul>
      </section>
    </div>
  )
}

function HomeFallback() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-28 w-full" />
    </div>
  )
}
