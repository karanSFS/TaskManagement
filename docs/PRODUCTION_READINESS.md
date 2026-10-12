# FixTask — Production readiness report and fix plan

Audit date: 2026-10-12. Scope: every route under `src/app`, all components, services, actions, the 11 migrations, config, and tooling.

## 1. Verdict

**Not ready for production.** Typecheck, lint, and the 20 unit tests pass, so the code compiles. The problems are in behaviour, data security, and UI:

- **5 database security holes** let any project member rewrite data they should not own.
- **Several flows break or go stale** (issue drawer, attachments, invites for new users, dashboard numbers that disagree with My Work).
- **Layout overflows** on the issue page, project header, backlog, and top bar on phones.
- **Core Jira-style features are missing**: ordering, estimates, sprint-scoped board, sprint delete, comment edit, bulk actions, project switcher.
- **No safety net**: no CI, no end-to-end tests, no error monitoring, invite email not configured in the env template.

Severity used below: **P0** = blocks launch, **P1** = must fix before real users, **P2** = needed for a complete product, **P3** = polish.

---

## 2. Gap report

### 2.1 Data security (database / RLS)

| Sev | Gap | Where |
| --- | --- | --- |
| P0 | Any member can update **any column** of any issue, including `reporter_id` (which also controls delete rights). Only `project_id` / `issue_number` are frozen. | `supabase/migrations/20261008102923_taskforge_schema.sql:849-852`, trigger `:502-518` |
| P0 | Comment author can change a comment's `issue_id` to an issue in another project. Update policy only checks `author_id`. | same file `:914-917` |
| P0 | Legacy `public.add_project_member` is still granted to `authenticated`, so the invitation/accept flow can be bypassed by calling it directly. | `20261008110403_project_members_and_leads.sql:125-148` |
| P0 | Notification recipients can update every column (`kind`, `body`, links), not only `read_at`. | schema `:1005-1008`, grant `:1058` |
| P1 | Any member can update/delete sprints and set `status` directly, bypassing `start_sprint` / `complete_sprint` (breaks "one active sprint"). | schema `:829-836` |
| P1 | Any member can overwrite any storage object in the project folder. | schema `:1103-1112` |
| P1 | Deleting an issue or project deletes `attachments` rows but leaves the files in Storage forever. | schema `:222`, `:291-301`; no cleanup trigger |
| P1 | `project_invitations` SELECT returns the `token` column to managers via PostgREST. | `20261009105039_project_invitations.sql:27`, `:54-59` |
| P1 | Invites can be created on archived projects. | same file `:117-196` |
| P1 | Assignee is not enforced as a project member in the DB (app check only). Issue links across projects allowed in the DB (app check only). | `issue.service.ts:199-211`, `:1082-1084` |
| P2 | Any member can delete any label. Owners/admins cannot moderate comments. Issue-link select checks only the source issue. | schema `:861-864`, `:919-921`, `:965-973` |
| P2 | Search uses `ILIKE '%…%'` with no trigram index, so it will slow down as issues grow. No `(project_id, assignee_id)` index. | `20261008124024_issue_search.sql:66-74`, schema `:241` |
| P2 | Multi-step writes not atomic: add label (read → insert label → link), register/remove attachment (storage + row), create project (insert then select). | `issue.service.ts:991-1019`, `attachment.service.ts:91-137`, `project.service.ts:302-324` |

### 2.2 Broken or inconsistent flows

| Sev | Gap | Where |
| --- | --- | --- |
| P0 | **Invite for someone without an account**: the link `/invitations/{token}` sits behind login, so a guest is bounced to `/login`; the email says "create an account from the invitation page", which they never see. After signup + email confirm, the invite path is lost. | `src/lib/invitations/format.ts:12,24,96`, `src/app/(app)/invitations/[token]/page.tsx`, `src/lib/supabase/middleware.ts:47-54`, `src/lib/actions/auth.ts:99-110` |
| P0 | **Invite email not configured**: `BREVO_SMTP_KEY`, `BREVO_SMTP_LOGIN`, `INVITE_FROM_EMAIL` are described in `.env.local.example` but the variable lines are missing, and nothing validates them at boot. Invites silently save without sending. | `.env.local.example:10-14`, `src/lib/mail/invitation.ts:10-15` |
| P1 | **Issue drawer goes stale**: the drawer loads data once (`loadIssueDrawer`) and never reloads after edits made inside it. | `src/components/issues/issue-drawer.tsx:22-33` |
| P1 | **Attachments**: no success feedback or refresh after upload; if the DB register step fails early the uploaded file is not removed; remove has no confirmation. | `src/components/issues/attachment-section.tsx:37-52`, `:82-96` |
| P1 | **Login drops query strings**: `next` keeps only the pathname, so `/board?projectId=…` returns to `/board` with the wrong project. A logged-in user opening `/login?next=…` is always sent to `/dashboard`. | `src/lib/supabase/middleware.ts:47-61` |
| P1 | **Reset password**: not guest-only; any signed-in session can change the password without the current one. | `middleware.ts:8-14`, `src/lib/actions/auth.ts:134-154` |
| P1 | **Dashboard numbers disagree with My Work**: "Overdue" on Home counts all visible issues, My Work counts only yours; "Due soon" uses two different date rules. | `dashboard/page.tsx:42-43,92,110-111`, `issue.service.ts:376-380,428-429,473-489` |
| P1 | **Board drag**: dropping while another move is saving does nothing silently; same-column drop does nothing (no reorder). | `src/components/issues/issue-board.tsx:59-66` |
| P1 | **Global search**: errors show as "no results"; older slow responses can overwrite newer ones; no loading state. | `src/lib/actions/issues.ts:247-263`, `src/components/layout/global-search.tsx:39-63` |
| P1 | **Silent truncation**: board shows max 200 issues; backlog and sprints 200 each; reports throw above 1000 issues. | `issue.service.ts:773-800`, `sprint.service.ts:8,108-138`, `report.service.ts:27,171-181` |
| P1 | Unexpected (non-`AppError`) errors are rethrown from every action, so the user gets an error boundary instead of a message. Needs a mapped fallback that still lets `redirect()` through. | `src/lib/actions/issues.ts:38-40` and the same helper in `projects.ts`, `sprints.ts`, `attachments.ts`, `notifications.ts` |
| P2 | Issue edits don't revalidate `/backlog`, `/sprints`, `/reports`; project actions don't revalidate `/backlog`, `/sprints`, `/reports`, `/invitations`. | `actions/issues.ts:28-36`, `actions/projects.ts:43-52` |
| P2 | Invite list does not refresh after a successful invite; archive/restore button does not refresh. | `member-manager.tsx:75-90`, `archive-project-button.tsx:22-31` |
| P2 | Issue history shows "Moved to a sprint" without the sprint name. `issue_updated` notification kind exists but is never sent. | `issue.service.ts:687-698`, schema `:340-347` |
| P2 | Transfer ownership is two non-atomic steps (promote, then leave). Resend invite does not rotate the token. Wrong-email invite page has no "switch account" button. Inviter notifications link to `/invitations` instead of the project. | `member-manager.tsx:288-340`, `project_invitations.sql:180-188`, `invitation-actions.tsx:58-70`, `notifications/format.ts:61-69` |
| P2 | Comments and history capped at 50 / 40 with no "load more". | `issue.service.ts:558-565` |

### 2.3 Missing product features

| Sev | Feature | Notes |
| --- | --- | --- |
| P1 | **Project context / switcher** | Board, Backlog, Sprints are global pages that silently default to the first project; the project is only selectable inside a filter drawer. Project pages only have Overview, Members, Settings. |
| P1 | **Sprint-scoped board** | Board mixes every sprint and the backlog in one set of columns. No sprint, label, or type filter. |
| P1 | **Ordering (rank)** | No rank column. Cannot reorder within a board column or the backlog. |
| P1 | **Sprint delete**, move issue directly between sprints, sprint shown/editable on the issue page | Only "move to backlog" exists on sprint cards. |
| P1 | **Comment edit**, `@mention` autocomplete | Delete only; mentions are a static list of names. |
| P1 | **Inline edit** of title and description on the issue page | Only through the edit sheet. |
| P2 | Story points / estimates, burndown, velocity | Dashboard copy even says "Nothing here is estimated". |
| P2 | Bulk actions on Issues list (status, assignee, sprint) | No row selection. |
| P2 | Markdown in description and comments | Plain text only. |
| P2 | Watchers, notification preferences, email notifications | In-app only; Settings promises notification settings that don't exist. |
| P2 | Project label management (rename, recolour, delete) | Labels can only be added from an issue. |
| P2 | Clone issue, move issue to another project, epic progress | `epic` type exists but has no behaviour. |
| P2 | First-run onboarding (create project → invite → first issue) | Only empty states today. |
| P3 | Avatar upload (`avatar_url` column exists), email change, account deletion, 2FA | |
| P3 | Per-project workflows / custom statuses | Statuses are global. |

### 2.4 UI / UX and layout

**Out-of-bounds bugs (the ones you are seeing):**

| Sev | Bug | Where | Fix |
| --- | --- | --- | --- |
| P0 | Issue description and comments use `whitespace-pre-wrap` with no word break; long URLs or unbroken text push the page past the screen. | `issues/[issueId]/page.tsx:97-99`, `comment-section.tsx:62` | `break-words` / `[overflow-wrap:anywhere]` + `min-w-0` on the section |
| P0 | Issue title `<h1>` and the drawer title don't wrap. | `issues/[issueId]/page.tsx:63`, `issue-drawer.tsx:104-106` | `break-words` |
| P0 | Project header: `truncate` on `<h1>` without a `min-w-0` parent, so long names overflow or get clipped. | `projects/[projectId]/layout.tsx:49-55` | wrap in `min-w-0 flex-1` |
| P0 | Backlog row native `<select>` sizes to its longest option and widens the row on phones. | `sprint-lists.tsx:30-31,133-149` | `w-full max-w-48 min-w-0` |
| P1 | Top bar on phones packs menu, search, Create, bell, theme, avatar into ~360px. | `layout/app-chrome.tsx:40-64` | hide `Kbd` < sm, move theme into user menu, icon-only Create |
| P1 | Issues and My Work tables are `min-w-[720px]`, so phones get a hidden sideways scroll. | `issues/page.tsx:166`, `my-work/page.tsx:156` | card rows below `md` |
| P1 | Notification dropdown is fixed `w-80` and can go off screen. | `notification-bell.tsx:67` | `w-[min(20rem,calc(100vw-1.5rem))]` |
| P1 | Content wrapper lacks `min-w-0`; the shell hides overflow with `overflow-x-hidden`, which clips content instead of fixing it. | `(app)/layout.tsx:35-43` | add `min-w-0` everywhere in the chain, remove the global hide |
| P2 | Unbounded text in: dashboard work rows and activity, sprint issue line assignee, subtask parent link, issue meta `dd`, notification titles, filter chips, label pills, invitation text. | `dashboard/page.tsx:192-196,239-250`, `sprint-lists.tsx:270-283`, `subtask-section.tsx:51-57`, `issues/[issueId]/page.tsx:140-147`, `notification-inbox.tsx:81-84`, `issues/page.tsx:225-231`, `label-editor.tsx:56-66`, `invitation-actions.tsx:47-56` | `truncate` or `break-words` + `min-w-0` |
| P2 | Board columns fixed `w-72` with no scroll hint; drag overlay has no width. Issue side panel appears only at `xl`, so tablets get one long column. | `issue-board.tsx:114-128,154`, `issues/[issueId]/page.tsx:93` | `w-[min(18rem,85vw)]`, scroll fade, `lg:` side panel |

**Design and consistency problems:**

- Generic indigo shadcn look; 13.5px body text everywhere makes it dense and cramped rather than clear.
- Three different empty-state components (`EmptyState`, `EmptyBlock`, `EmptyWork`), three different list styles (table, divided rows, cards), and priority shown three different ways.
- Native `<select>` with the same class string copy-pasted in about six files.
- Filters differ per page: chips only on Issues, active-count badge counts different things on each page, project chosen inside the drawer.
- Issues open sometimes in a drawer and sometimes as a full page, without a clear rule.
- Loading skeletons don't match the final layouts (Dashboard, Issues table, issue detail), so content jumps on load.
- Confirmations are inconsistent: Complete sprint confirms, Start sprint doesn't; deleting a link confirms, removing an attachment doesn't.
- User menu has "Profile" and "Settings" both going to `/settings`; theme toggle exists in both the top bar and Settings.
- Two concepts called "Backlog" (a status and a page).

### 2.5 Production operations

| Sev | Gap |
| --- | --- |
| P0 | No CI. Nothing runs typecheck, lint, tests, or a build on push. |
| P1 | No end-to-end tests. Unit tests cover only formatting and validation helpers; no services, actions, or RLS are tested. |
| P1 | No error monitoring (Sentry or similar). |
| P1 | No Content-Security-Policy or HSTS header. |
| P1 | No rate limit on invite send/resend (SMTP abuse). `siteOrigin()` trusts `Host` / `x-forwarded-*` headers for links in emails; use a configured `NEXT_PUBLIC_SITE_URL` instead. |
| P1 | Env validation only covers the Supabase URL and key. |
| P2 | Supabase Auth: no password rules, auth SMTP not configured (default Supabase mailer has strict hourly limits), `site_url` in `config.toml` is localhost. |
| P2 | `seed.sql` is empty, so there is no demo data for testing. |

---

## 3. Implementation plan

Each phase ends with typecheck, lint, tests, a production build, and a click-through on desktop and a 375px phone viewport. Estimates are for one developer.

### Phase A — Security and data integrity (P0/P1) · ~3 days

One new migration, pushed with `--dry-run` first.

1. Issue update trigger: freeze `reporter_id` and `created_by`-style columns; validate `assignee_id` is a project member; validate `parent_issue_id` is in the same project and not a cycle.
2. Comment update `WITH CHECK`: `issue_id` cannot change. Allow owners/admins to delete comments.
3. Revoke `public.add_project_member` (and the private helper) from `authenticated`.
4. Notifications: replace the update grant with a column grant on `read_at` only.
5. Sprints: block direct `status` changes outside the RPCs; restrict delete to managers and non-active sprints.
6. Storage: restrict object update/delete to the uploader or a manager; add a trigger that deletes Storage objects when an `attachments` row is deleted (cascade from issue/project).
7. Invitations: hide `token` through a view or column grants; block invites on archived projects; rotate the token on resend.
8. Issue links: enforce same-project in the DB. Labels: only managers delete.
9. Move add-label and attachment register/remove into RPCs.
10. Add `pg_trgm` GIN indexes for search and an `(project_id, assignee_id)` index.
11. Regenerate types. Add SQL tests (pgTAP or a small script) for each policy above.

**Done when:** each hole above has a test that fails before the migration and passes after.

### Phase B — Fix broken flows (P0/P1) · ~4 days

1. **Invitations end to end:** make `/invitations/[token]` reachable when signed out (show project, inviter, and "Sign in" / "Create account" buttons that keep the token); carry `next` through signup, the confirm email (`emailRedirectTo`), and login; add a "switch account" button on the wrong-email screen.
2. **Email config:** add the three Brevo variables to `.env.local.example`; validate all server env with Zod at startup; show a clear warning on the Members page when email is not configured.
3. **Redirects:** keep path and query in `next`; honour `next` when an already signed-in user hits `/login`; make `/reset-password` require a recovery session.
4. **One refresh rule:** every mutation from a client component calls `router.refresh()` (or the drawer re-fetches) on success and shows a toast. Covers the drawer, attachments, labels, links, subtasks, members, archive.
5. **Action errors:** one `runAction()` helper that maps any unexpected error to a generic message, logs it, and still rethrows `redirect` / `notFound`.
6. **Revalidation map:** one `revalidateIssue()` / `revalidateProject()` helper listing every affected route, used by all actions.
7. **Dashboard and My Work:** share one query for overdue and due-soon so the numbers match their links.
8. **Search:** abort stale requests, show loading and error states.
9. **Limits:** replace silent caps with pagination or "Load more" on board columns, backlog, sprints, comments, history, invitations; aggregate reports in SQL instead of throwing above 1000.
10. Attachments: delete the uploaded file if register fails; add a confirmation on remove.

**Done when:** a Playwright run covers sign up → create project → invite a new email → accept → create issue → comment → attach → board move → sprint start/complete, with no stale screen.

### Phase C — Layout fixes (P0/P1) · ~2 days

Can run in parallel with Phase B; these are CSS-only.

1. Apply every fix in the out-of-bounds table (2.4).
2. Remove `overflow-x-hidden` from the shell once the `min-w-0` chain is correct, so real overflow is visible in testing.
3. Top bar: compact layout below `sm`.
4. Issues and My Work: card rows below `md`.
5. Board: responsive column width, scroll fade, fixed overlay width.
6. Issue detail: side panel from `lg`.
7. Add a Playwright visual check at 375px, 768px, and 1280px for Issues, issue detail, Board, Backlog, Sprints, Projects, Members, and Dashboard that fails if `document.documentElement.scrollWidth > innerWidth`.

**Done when:** no page scrolls sideways at 375px except the board's own column scroller.

### Phase D — Redesign (design system first, then screens) · ~6–8 days

1. **Direction sign-off** (half a day): pick colour, density, and typography (see the open decision below). Produce one reference screen (issue detail) before touching the rest.
2. **Tokens:** new colour palette, a type scale (14px base on desktop, 15–16px on mobile), and spacing and radius scales in `globals.css`.
3. **Shared primitives** that replace the duplicates:
   - `PageShell` (header, toolbar, body)
   - `FilterBar` (inline filters plus chips, the same on every list page)
   - `IssueRow` (one row style used by Issues, My Work, Backlog, Sprints, Dashboard)
   - `DataList` (table on desktop, cards on mobile)
   - one `EmptyState`
   - skeletons that match each layout
   - shadcn `Select` / `Combobox` instead of native `<select>`
   - one `PriorityIcon` and one `StatusPill`
4. **Navigation:** project switcher in the sidebar; project-scoped routes `/projects/[id]/board`, `/backlog`, `/sprints`, `/issues`, `/reports`, with the global pages kept as cross-project views. Rename the backlog status to "Not started" (or similar) so it doesn't clash with the Backlog page.
5. **Screens**, in this order: issue detail and drawer → board → backlog and sprints → issues list → dashboard → projects and members → notifications → settings → auth pages.
6. **Interaction rules:** one rule for drawer versus full page (list → drawer, link/share → page); consistent confirmations for every destructive action; keyboard shortcuts listed in a `?` help dialog.

**Done when:** every screen uses the shared primitives, has no copy-pasted field classes, and passes the Phase C width checks in light and dark mode.

### Phase E — Missing core features (P1) · ~6 days

1. Board scoped to the active sprint by default (sprint / backlog / all), with label and type filters.
2. Rank column (fractional index) and drag reordering in board columns and the backlog.
3. Sprint delete; move issue directly between sprints; sprint field on the issue page.
4. Inline title and description edit; comment edit with "edited" marker; `@mention` autocomplete.
5. Markdown rendering (sanitised) for description and comments.
6. Bulk select on the Issues list: status, assignee, sprint, delete.
7. Sprint names in history; send `issue_updated` to assignee and reporter.

### Phase F — Product completeness (P2) · ~5 days

1. Story points, sprint capacity, burndown and velocity charts.
2. Watchers and notification preferences (in-app and email per event); email digest via a Supabase Edge Function or cron.
3. Project label management page.
4. Clone issue, move issue to another project, epic progress roll-up.
5. First-run onboarding checklist.
6. Avatar upload, email change, account deletion.

### Phase G — Launch hardening · ~3 days

1. GitHub Actions: install, typecheck, lint, unit tests, build, Playwright against a Supabase preview branch, and a check that generated types match the migrations.
2. Sentry (client, server, edge) with PII scrubbing; structured logs without emails.
3. CSP (nonce-based) and HSTS in `next.config.ts`.
4. Rate limit on invite send/resend and auth actions; use `NEXT_PUBLIC_SITE_URL` for every email link.
5. Supabase production config: custom SMTP for auth emails, password rules, correct site URL and redirect allowlist, backups enabled.
6. Demo seed data for staging.
7. Release checklist: staging deploy, full Playwright run, manual smoke test on iOS Safari and Android Chrome, database backup, then production.

### Order and timeline

| Week | Work |
| --- | --- |
| 1 | Phase A, Phase C, start Phase B |
| 2 | Finish Phase B, design sign-off, Phase D tokens and primitives |
| 3 | Phase D screens |
| 4 | Phase E, Phase G (CI, monitoring, headers) |
| 5 | Phase F, staging soak, launch |

**Minimum to launch** (if you need to ship sooner): Phases A, B, C, G, plus the navigation and project switcher part of D and the sprint-scoped board from E. That's about 2.5 weeks.

---

## 4. Decisions

Agreed 2026-10-12:

- **Start with:** Phase A (security) and Phase C (layout) first.
- **Colour:** new identity, slate neutrals with a teal accent.
- **Density:** comfortable by default, with a compact option in Settings.

## 5. Progress

**Phase A, first pass (applied to the hosted database on 2026-10-12, types regenerated):** `supabase/migrations/20261012050000_security_hardening.sql` fixes:

- The reporter can no longer be changed.
- Assignees must be project members.
- Parent cycles are blocked.
- Comments can't move to another issue; owners and admins can delete comments.
- `add_project_member` is revoked.
- Notifications are update-only on `read_at`.
- Sprint status changes only through start/complete, and completed sprints are read-only. Only managers can delete sprints, and only planned ones.
- Issue links stay in one project.
- Only managers can delete labels.
- Storage overwrite is limited to the uploader or a manager.
- Archived projects can't take invitations.
- Trigram search indexes and an assignee index are added.

`supabase/tests/security_hardening.test.sql` has 16 checks, and all of them pass on a throwaway Postgres.

Still open in Phase A:

- Storage cleanup when issues or projects are deleted. Supabase blocks SQL deletes on `storage.objects`, so this needs a cleanup queue plus an Edge Function.
- Hiding the invitation token.
- Rotating the token on resend.
- Atomic label and attachment RPCs.

**Phase C, first pass (done):**

- Wrapping or truncation on the issue title, description, comments, meta fields, and drawer title.
- `min-w-0` on the project header and content wrapper.
- Backlog sprint select width.
- Sprint name, goal, and assignee overflow.
- Compact top bar on phones, with the theme toggle moved to Settings only below `sm`.
- Notification dropdown width.
- Dashboard work row and activity text.
- Filter chips, label pills, invitation card, and subtask parent link.
- Board column and drag overlay width.
- Issue side panel now shows from `lg` instead of `xl`.

Still open in Phase C:

- Card layout for the Issues and My Work tables on phones.
- Board scroll hint.
- Removing the shell's `overflow-x-hidden`.
- Automated width checks.
