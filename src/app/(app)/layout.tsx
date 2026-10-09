import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Suspense, type ReactNode } from "react"

import { IssueDrawerProvider } from "@/components/issues/issue-drawer"
import { AppChrome } from "@/components/layout/app-chrome"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCurrentUser } from "@/lib/auth/session"
import { displayName } from "@/lib/auth/user"
import { listNotificationPreview } from "@/lib/services/notification.service"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  )
}

async function AuthenticatedShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const [cookieStore, notifications] = await Promise.all([cookies(), listNotificationPreview(user.id)])
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className="min-h-svh">
        <IssueDrawerProvider>
          <AppChrome
            user={{ id: user.id, email: user.email ?? "", fullName: displayName(user) }}
            notifications={notifications}
          />
          <div className="flex-1 px-3 py-4 md:px-5">
            <main id="content" tabIndex={-1} className="min-w-0 outline-none">
              {children}
            </main>
          </div>
        </IssueDrawerProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}

function ShellFallback() {
  return (
    <div className="flex min-h-svh bg-background">
      <div className="hidden w-64 border-r bg-sidebar md:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-2 border-b px-3">
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="grid gap-3 p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}
