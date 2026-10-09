"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Logo } from "@/components/brand/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { isNavActive, mainNav, utilityNav } from "@/lib/config/nav"
import { LinkPending } from "@/components/shared/pending-ui"

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-1 px-3 py-3">
        <Link href="/dashboard" className="flex items-center" aria-label="FixTask home">
          <Logo />
        </Link>
        <p className="truncate px-0.5 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          Plan together. Solve faster.
        </p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavList pathname={pathname} items={mainNav} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavList pathname={pathname} items={utilityNav} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NavList({
  pathname,
  items,
}: {
  pathname: string
  items: typeof mainNav
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={isNavActive(pathname, item.href)}
            tooltip={item.description}
            className="data-active:shadow-[inset_3px_0_0_0_var(--primary)]"
          >
            <Link href={item.href} className="flex items-center gap-2">
              <item.icon />
              <span>{item.title}</span>
              <LinkPending />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
