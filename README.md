# TaskForge

Ship work, not tickets.

TaskForge is a project and issue manager for personal and small-team use. The workflow is familiar if you have used Jira. The interface, name, and visual system are TaskForge's own.

Phase 1 is the foundation: Next.js, Supabase local development, authentication, and the application shell. Projects, issues, the board, and sprints are not built yet.

## Prerequisites

- Node.js 22+
- npm
- Docker Desktop, OrbStack, or Colima (required for local Supabase)
- Git

## Local setup

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

Review the dry run before pushing. Phase 1 has no application tables yet, so there is nothing to push.

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
- `C` opens create issue (the form arrives in Phase 4)
- `⌘/Ctrl+B` collapses the sidebar

## Project layout

```text
src/app/(auth)          sign in, sign up, password reset
src/app/(app)           authenticated shell and section routes
src/app/auth            confirm and sign-out routes
src/components/ui       shadcn/ui
src/lib/supabase        browser, server, and proxy clients
supabase/migrations     versioned schema (empty in Phase 1)
supabase/seed.sql       local seed
supabase/functions      edge functions (empty in Phase 1)
```

## Deployment outline

GitHub deploys the Next.js app on Vercel. Vercel talks to a remote Supabase project for Postgres, Auth, Storage, and Realtime. Production environment variables stay in Vercel. Local development uses the Supabase CLI and does not use production data.

## Next phase

Phase 2 adds the database schema, relationships, indexes, row level security, seed data, and generated TypeScript types. Do not start that work until it is requested.
