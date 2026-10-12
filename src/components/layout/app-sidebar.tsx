"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Archive, Plus } from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { ProjectIcon } from "@/components/projects/project-icon"
import { LinkPending } from "@/components/shared/pending-ui"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  activeProjectId,
  isNavActive,
  personalNav,
  projectHref,
  projectTabs,
  utilityNav,
  workspaceNav,
  type NavItem,
} from "@/lib/config/nav"
import type { NavProject } from "@/lib/services/project.service"

const sidebarTabs = projectTabs.filter((tab) => ["board", "backlog", "sprints", "issues"].includes(tab.slug))

export function AppSidebar({ projects }: { projects: NavProject[] }) {
  const pathname = usePathname()
  const currentId = activeProjectId(pathname)
  const active = projects.filter((project) => !project.archived)
  const archivedCount = projects.length - active.length
  const current = projects.find((project) => project.id === currentId)
  const listed = current?.archived ? [...active, current] : active

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <Link href="/dashboard" className="flex items-center" aria-label="FixTask home">
          <Logo />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavList pathname={pathname} items={personalNav} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupAction asChild title="New project">
            <Link href="/projects/new">
              <Plus />
              <span className="sr-only">New project</span>
            </Link>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {listed.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Create your first project">
                    <Link href="/projects/new" className="text-muted-foreground">
                      <Plus />
                      <span>Create a project</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
              {listed.map((project) => {
                const open = project.id === currentId
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild isActive={open && pathname === projectHref(project.id)} tooltip={project.name}>
                      <Link href={projectHref(project.id)}>
                        <ProjectIcon name={project.icon} />
                        <span className="truncate">{project.name}</span>
                        {project.archived ? <Archive className="ml-auto size-3.5 text-muted-foreground" /> : <LinkPending />}
                      </Link>
                    </SidebarMenuButton>
                    {open ? (
                      <SidebarMenuSub>
                        {sidebarTabs.map((tab) => {
                          const href = projectHref(project.id, tab.slug)
                          return (
                            <SidebarMenuSubItem key={tab.slug}>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith(href)}>
                                <Link href={href}>
                                  <tab.icon />
                                  <span>{tab.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
              {archivedCount > 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Archived projects" className="text-muted-foreground">
                    <Link href="/projects?status=archived">
                      <Archive />
                      <span>Archived ({archivedCount})</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavList pathname={pathname} items={workspaceNav} />
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

function NavList({ pathname, items }: { pathname: string; items: NavItem[] }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={isNavActive(pathname, item.href)} tooltip={item.title}>
            <Link href={item.href}>
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
