# TaskForge

Ship work, not tickets.

TaskForge is a project and issue manager for personal and small-team use. The interface, name, and visual system are TaskForge's own.

The living plan is [PLAN.md](PLAN.md). Read it before starting a phase. When a phase is finished, update both `PLAN.md` and this README.

## Current progress

Phases 1–7 are done: foundation, the hosted database, projects, issues (including subtasks and links), My Work, the board, the backlog, sprints, and search.

**Next phase:** Phase 8, notifications and storage. Do not start it until it is requested.

The app in `.env.local` talks to the hosted Supabase project, not the local Docker stack. Do not replace those values with `127.0.0.1` unless you mean to develop against a local database. Never reset the hosted database. Schema changes belong in `supabase/migrations/` and go to the hosted project with `npx supabase db push --dry-run` first.

## Prerequisites

- Node.js 22+
- npm
- Docker Desktop, OrbStack, or Colima (required for local Supabase)
- Git

## Optional local Supabase

Local Supabase is optional. The checked-in app is configured for the hosted project. Use this only when you want a separate local database.

```bash
npm install
cp .env.local.example .env.local
npm run db:start
npm run db:status
```

Copy the API URL and the anon key from `db:status` into `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from db:status>
```

Then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will land on sign in.

Local signup confirmation is enabled. Open the email inbox printed by `npm run db:status` (Mailpit, usually [http://127.0.0.1:54324](http://127.0.0.1:54324)) and follow the confirm link.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:start` | Start local Supabase |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:status` | Print local URLs and keys |
| `npm run db:reset` | Reset the **local** database and rerun migrations and seed |
| `npm run db:migration -- <name>` | Create a new migration |
| `npm run db:types` | Regenerate `src/types/database.types.ts` from local Supabase |
| `npm run db:types:linked` | Regenerate types from the linked remote project |

## Supabase CLI

Schema changes go through migrations in `supabase/migrations/`. Do not edit the remote database by hand in the dashboard.

```bash
npm run db:migration -- <name>
npm run db:reset
npm run db:types
```

`db:reset` is local only. Never run it against production.

Link a remote project when you are ready to deploy schema changes:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Review the dry run before pushing. The hosted project is already linked. Do not reset it.

## Environment

`.env.local` is gitignored. `.env.local.example` is the template.

| Variable | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server Supabase clients |

Do not add `SUPABASE_SERVICE_ROLE_KEY` to client code or to a `NEXT_PUBLIC_` variable. This app does not use the service role key.

On Vercel, set the same two public variables to the remote Supabase project URL and anon key.

## Architecture

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui.
- `src/proxy.ts` refreshes the Supabase session and redirects unauthenticated requests to `/login`. This is the Next.js 16 name for middleware.
- `src/app/(app)/layout.tsx` checks the user again with `getUser()` on the server. Client checks are not the access control.
- Auth forms use React Hook Form and Zod. Mutations are server actions.
- Email confirmation and password recovery both land on `/auth/confirm`, which verifies the `token_hash`.
- Cache Components are enabled. Session reads sit behind Suspense so the shell can prerender.
- The sidebar collapse state is stored in the `sidebar_state` cookie.

Keyboard shortcuts, ignored while typing in a field:

- `/` opens page search
- `C` opens create issue (`/issues/new`)
- `⌘/Ctrl+B` collapses the sidebar

## Project layout

```text
src/app/(auth)          sign in, sign up, password reset
src/app/(app)           authenticated shell, projects, issues, my work
src/app/auth            confirm and sign-out routes
src/components/ui       shadcn/ui
src/lib/services        project, issue, and profile services
src/lib/supabase        browser, server, and proxy clients
supabase/migrations     versioned schema
supabase/seed.sql       local seed
supabase/functions      edge functions
PLAN.md                 phase status and rules for continuing the project
```

## Deployment outline

GitHub deploys the Next.js app on Vercel. Vercel talks to a remote Supabase project for Postgres, Auth, Storage, and Realtime. Production environment variables stay in Vercel. Local development uses the Supabase CLI and does not use production data.

## Continuing the project

Open [PLAN.md](PLAN.md). It records the finished phases, the database rules, and the next step. Do not start a later phase until it is requested. Finish a phase by updating `PLAN.md` and this README in the same change.
