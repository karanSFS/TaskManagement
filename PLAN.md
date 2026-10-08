# TaskForge plan

Ship work, not tickets.

This file is the source of truth for continuing TaskForge in another IDE, machine, or chat. Read it before writing code. When a phase is finished, update this file and `README.md` in the same change. Do not start the next phase until it is requested.

The visual system, name, and interface are TaskForge's own. The workflow can feel familiar. Do not copy another product's branding, layout, or copy.

## Status

Last updated: 2026-10-08.

| Phase | Name | Status |
| --- | --- | --- |
| 1 | Foundation | Done |
| 2 | Database | Done, applied to the hosted project |
| 3 | Projects | Done |
| — | Shared service layer | Done |
| 4 | Issues | Mostly done. My Work is done. Subtasks and issue links are not built. |
| 5 | Kanban | Done. `/board` has columns, drag and drop, and status changes. |
| 6 | Backlog and sprints | Done. Plan, start, and complete sprints. One active sprint per project. |
| 7 | Search and filters | Not started. Page jump exists. Issue search does not. |
| 8 | Notifications and storage | Not started. The `attachments` bucket and notification trigger exist. |
| 9 | Dashboard and reports | Home shows real project and assignment counts. Reports and charts are not built. |
| 10 | Production polish | Not started |

**Next step:** Phase 7, search and filters. Global search still only jumps to pages. Add issue key, title, and label search in Postgres. Do not start notifications in the same step.

A stability pass on 2026-10-08 fixed the finished phases before launch: email confirmation accepts both link styles, auth errors are no longer raw database text, archived projects cannot take new issues, only owners can change other owners, issue counts are computed in Postgres, issues can be created with an assignee and due date, issues can be deleted by the reporter or a manager, and Home shows real counts. Subtasks, issue links, search, notifications, and reports are still later phases.

The latest issues commit is local on `main` and may be ahead of `origin/main`. Vercel only shows what has been pushed. Do not commit or push unless asked.

## Product

TaskForge is a project and issue manager for personal and small-team use.

- Compact developer UI. Lists, not giant cards.
- Light and dark. Forge ember (orange-amber) is the accent. Steel teal is the focus and info color.
- Keyboard: `/` jumps between pages, `C` opens new issue, `⌘/Ctrl+B` collapses the sidebar. Ignore shortcuts while typing in a field.

## Stack

- Next.js 16.4 App Router, TypeScript, Tailwind, shadcn/ui, Lucide.
- Hosted Supabase: Postgres, Auth, Storage, Realtime.
- React Hook Form, Zod 4, TanStack Query.
- dnd-kit is for the board (Phase 5). Recharts is for reports (Phase 9). Do not add them early.
- Deploy target: Vercel. Live app: `https://task-management-chi-lyart.vercel.app/`
- GitHub: `https://github.com/karanSFS/TaskManagement.git`, branch `main`.

This Next.js version differs from older training data. Before changing framework APIs, read `node_modules/next/dist/docs/`. Middleware is `src/proxy.ts`. The root layout receives `{ children }`. Session reads and `searchParams` / `params` must sit behind Suspense. `redirect()` throws. Catch only `AppError` in actions so that redirect still works.

## Where it runs

The app uses the hosted project in `.env.local`. Do not point the app at local Supabase (`127.0.0.1:54321`).

| Item | Value |
| --- | --- |
| Project ref | `vjvgqwguljzfhoxbkqzc` |
| API URL | `https://vjvgqwguljzfhoxbkqzc.supabase.co` |
| Region | `ap-northeast-2` |
| Postgres | 17 |
| Site URL | `https://task-management-chi-lyart.vercel.app/` |
| Auth confirm | `https://task-management-chi-lyart.vercel.app/auth/confirm` |

`.env.local` is gitignored. It holds only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never commit it. Never add `SUPABASE_SERVICE_ROLE_KEY`, and never put a service-role key in a `NEXT_PUBLIC_` variable. The app does not use the service role.

Local Docker and `npm run db:*` exist for optional local experiments. `npm run db:reset` is local only. Never reset the hosted database. Schema changes go in `supabase/migrations/`, then:

```bash
npx supabase db push --dry-run
npx supabase db push
npx supabase gen types typescript --linked > src/types/database.types.ts
```

Do not edit production tables by hand in the Supabase dashboard. `npx supabase` needs to run outside the sandbox because it reads `~/.supabase`. Do not print access tokens or keys.

Signup and password reset use `/auth/confirm` with `token_hash`. Hosted email does not use local Mailpit. The signup success copy still mentions Mailpit and should be corrected when auth copy is next touched.

## Request flow

```text
UI
  → server action (or a route handler only when a real HTTP API is needed)
  → Zod
  → getCurrentUser() on the server
  → authorization
  → service in src/lib/services/
  → Supabase client (anon key + user cookie)
  → Postgres + row level security
```

- Do not trust a user id sent from the browser.
- Do not put complex Supabase queries in pages, components, or forms.
- Server actions are for mutations inside the app: create project, create issue, add comment, change status.
- Do not add a POST route for every operation.
- Current actions return `{ error?: string; success?: string }` so existing forms keep working. Services throw `AppError`.
- If an HTTP API is added later, respond with `{ success: true, data }` or `{ success: false, error: { code, message } }` and the correct status code.
- Select only the columns you need. Search in the database. Paginate issues, comments, notifications, history, and projects.
- Mutations that must be atomic belong in a Postgres function or trigger, not in several independent client queries. Issue numbers, history, notifications, and the owner membership row are already triggers.

## Errors and logs

Codes live on `AppError`: `VALIDATION_ERROR`, `UNAUTHORIZED`, `DATABASE_ERROR`, `PROJECT_NOT_FOUND`, `PROJECT_ACCESS_DENIED`, `ISSUE_NOT_FOUND`, `ISSUE_ACCESS_DENIED`, `INVALID_ISSUE_STATUS`, `INVALID_PROJECT`, `DUPLICATE_PROJECT_KEY`.

User-facing text must be specific. Never show raw Postgres errors. Log `operation`, `userId`, `resourceId`, `code`, and `timestamp`. Never log passwords, tokens, API keys, or the service-role key. Skip `debug` logs in production.

Buttons stay disabled while a mutation is in flight. Do not use optimistic updates unless a failed request can roll the UI back. Issue create is not optimistic.

## Security rules already in the database

- Users only see projects they belong to, and the issues, comments, labels, and history of those projects.
- Authorization is `project_members`, never `user_metadata`.
- Roles are `owner`, `admin`, and `member`. Only an owner can grant owner. The last owner cannot be removed.
- A lead must already be a member. `created_by` cannot change. `next_issue_number` can change only inside the numbering trigger.
- Issue insert requires `reporter_id = auth.uid()` and project membership. Any member can update an issue. Delete is the reporter or a manager.
- Comments can be changed only by their author.
- History is select-only. Writes happen in the trigger. Status, assignee, and priority are stored as text ids.
- Reference tables (`issue_types`, `issue_statuses`, `priorities`) are select-only for signed-in users.
- Anonymous has no grants on application tables.
- Inviting a member is `public.add_project_member(project, email, role)`. Email lookup goes through a private function because profiles do not expose strangers.
- Storage bucket `attachments` is private, 50 MB. When uploads are built, check type and size and do not trust the original filename.

## Important database behavior

Creating a project must insert without `.select()`, then read the row by key. `INSERT … RETURNING` runs the select policy before the owner-membership trigger, so the insert rolls back with a row-level security error.

Issue numbers are assigned by `private.assign_issue_number`, which overwrites whatever number the client sends. The insert still has to supply `issue_number` because generated types mark it required. Use `1`.

Issue insert can return the new id. The creator is already a project member, so the select policy allows it. If that ever fails the same way projects did, insert first and select second.

One active sprint per project. The profile row is created by a trigger on `auth.users`.

## What is already built

### Phase 1 — Foundation

Auth (sign in, sign up, forgot password, reset, confirm), protected routes, shell, sidebar, theme, settings, profile. `getCurrentUser` is cached in `src/lib/auth/session.ts`.

### Phase 2 — Database

Migrations:

- `supabase/migrations/20261008102923_taskforge_schema.sql`
- `supabase/migrations/20261008110403_project_members_and_leads.sql`

Tables: `profiles`, `projects`, `project_members`, `issues`, `issue_types`, `issue_statuses`, `priorities`, `labels`, `issue_labels`, `comments`, `attachments`, `issue_history`, `sprints`, `sprint_issues`, `notifications`, `issue_links`.

Project keys match `^[A-Z][A-Z0-9]{1,9}$`. Issue keys render as `KEY-12`. Types include task, bug, story, feature, improvement, epic, and subtask. Statuses: backlog, todo, in progress, in review, qa, done. Priorities: lowest through highest.

Types are generated in `src/types/database.types.ts` from the linked project. Regenerate them after every schema push. Do not hand-edit that file.

`is_project_member`, `project_role`, and `can_manage_project` are plpgsql. They cannot be `language sql` if they reference `project_members` before that table exists in the same migration.

### Phase 3 — Projects

Routes: `/projects`, `/projects/new`, `/projects/[projectId]`, `/members`, `/settings`.

List, create, edit, archive, members, and the project overview are real. The creator becomes owner and lead. Owner and admin manage members. The lead can edit the project. Invite is by email. A member can leave unless they are the last owner.

Service: `src/lib/services/project.service.ts`. Actions: `src/lib/actions/projects.ts`.

### Service layer

- `src/lib/errors/` — `AppError` and the specific error classes
- `src/lib/logger.ts`
- `src/lib/actions/result.ts`
- `src/lib/services/profile.service.ts`

Profile name is `profiles.display_name`. Saving the profile updates that row and `user_metadata.full_name`. The account menu uses `router.push`. A dropdown item wrapping a link does not navigate.

### Phase 4 — Issues, done so far

Routes: `/issues`, `/issues/new`, `/issues/[issueId]`.

Create, open, edit, assignee, priority, labels, comments, history, and due date work. Search matches the title on the server, 20 per page. The default status is To Do. The default priority is Medium. A new issue requires at least one project. The project overview links to new issue and to each issue. Create and the `C` key go to `/issues/new`.

`/my-work` lists open issues assigned to you, open issues you reported, and issues you are assigned to or reported that are due within 7 days, including overdue. Done issues are left out. Each list shows 20 rows. Set the due date on the issue page.

Service: `src/lib/services/issue.service.ts`. Actions: `src/lib/actions/issues.ts`. Validation: `src/lib/validations/issue.ts`.

Still inside Phase 4, and not built:

- Subtasks
- Issue linking

## Remaining phases

Build one phase at a time. Stop when the requested phase is done.

### Phase 4 remainder

Only if requested: subtasks and links between issues. The tables for links already exist. My Work is already built.

### Phase 5 — Kanban

Done. `/board` shows one project at a time. Columns follow the status list. Dragging a card into another column calls `changeIssueStatus`, which updates `issues.status_id` so the history trigger still runs. Filters are project, assignee (anyone, assigned to me, unassigned), and title. The board loads the latest 200 matching issues.

### Phase 6 — Backlog and sprints

Done. `/backlog` lists open issues with no sprint and can add them to a planned or active sprint. `/sprints` plans a sprint, starts it, and completes it. Completing a sprint returns unfinished issues to the backlog in one database function. Done issues stay on the completed sprint. A project can have only one active sprint. Progress is done issues divided by issues in that sprint.

### Phase 7 — Search and filters

Global search today only jumps to pages (`src/components/layout/global-search.tsx`). Add issue key, title, and label search, plus sorting and filters. Keep the query in Postgres.

### Phase 8 — Notifications and storage

`/notifications`. Assignments already insert a notification from a trigger. Add the inbox, mentions, Storage uploads for attachments, and realtime updates. Validate file type and size. Private bucket only.

### Phase 9 — Dashboard and reports

Home should show open work, assignments, and recent activity. Reports use Recharts: project metrics, sprint analytics, issue analytics.

### Phase 10 — Production polish

Performance, accessibility, responsive layout, error and loading states, empty states, security, and tests. The app error copy still says “local Supabase” and should be updated when this phase is touched.

## UI notes that already caused bugs

- Zod 4 uses `z.email()` and `z.uuid()`. A `.refine()` callback must return a boolean. A type-predicate refine breaks React Hook Form.
- Do not create a Lucide icon component during render. `ProjectIcon` uses a switch.
- Use a native `<select>` styled like the inputs. There is no shadcn Select in this pass.
- Pages that read the session follow the profile-page pattern: a sync page, an async child, and Suspense.

## Folder map

```text
src/app/(auth)                 sign in, sign up, password reset
src/app/(app)                  authenticated shell
src/app/auth                   confirm and sign-out
src/components/ui              shadcn/ui
src/components/layout          sidebar, top bar, search
src/components/projects        project forms and members
src/components/issues          issue form, editor, comments, labels
src/lib/services               project, issue, and profile services
src/lib/actions                auth, projects, issues
src/lib/errors                 AppError classes
src/lib/validations            Zod schemas
src/proxy.ts                   session refresh and route guard
supabase/migrations            versioned schema
src/types/database.types.ts    generated types
```

## How to continue somewhere else

1. Clone `https://github.com/karanSFS/TaskManagement.git`.
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and fill the hosted URL and anon key. Do not commit that file.
4. `npm run dev`
5. Read this file. Implement only the next requested phase.
6. Run `npm run typecheck` and `npm run lint` before calling the work done.
7. For UI changes, click through the flow in the browser.
8. Update `PLAN.md` and `README.md` before calling the phase done.
9. Commit only when asked. Never commit `.env.local`.
