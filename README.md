# DeutschPath

A focused practice platform for **German A2** learners — staged **Grammar & Tenses**,
**Dictation (Diktat)** and **Email Writing (Schreiben)**, with automated,
server-validated progression and AI-assisted correction.

> **Status: Milestone 1 complete** — project foundation, Supabase setup,
> authentication (register / login / logout / password reset) and a protected,
> responsive learner dashboard. The interactive learning modules are built in
> later milestones (see [Roadmap](#roadmap)).

---

## Tech stack

| Area        | Choice                                                  |
| ----------- | ------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Server Actions)                 |
| Language    | TypeScript (strict)                                     |
| Styling     | Tailwind CSS v4 + hand-rolled accessible UI components  |
| Auth & DB   | Supabase (PostgreSQL, Auth, Storage)                    |
| Validation  | Zod                                                     |
| Tests       | Vitest                                                  |
| Hosting     | Vercel (or any Node 20+ host)                           |

AI evaluation (OpenAI) and Text-to-Speech (Telnyx, with a mock provider for dev)
are introduced in later milestones; their keys are already reserved server-side
in `.env.example`.

---

## Prerequisites

- **Node.js 20.9+** (Next.js 16 requires Node 20+)
- A **Supabase** project (free tier is fine) — https://supabase.com
- The Supabase CLI is recommended for running migrations: https://supabase.com/docs/guides/cli

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the Supabase values from your project dashboard
(**Project Settings → API**):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by content/admin tooling later)

Leave `OPENAI_API_KEY` and `TELNYX_API_KEY` blank for now. **Never commit
`.env.local`.**

### 3. Apply the database schema

The SQL lives in `supabase/migrations/`. Run it in order against your project.

**Option A — Supabase CLI (recommended):**

```bash
supabase link --project-ref <your-project-ref>
supabase db push        # applies files in supabase/migrations/
```

**Option B — SQL editor:** open the Supabase dashboard → SQL Editor and run,
in this order:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/seed.sql` (optional — seeds the A2 course + 3 module rows)

> **Read before applying:** `0001` creates the tables, enums and two triggers
> (auto-create a `profiles` row on sign-up, and `updated_at` maintenance).
> `0002` enables **Row Level Security** on every table and adds the learner
> policies. See [Database & security](#database--security) before running in a
> shared environment.

### 4. Supabase Auth settings

In **Authentication → URL Configuration**, add your site URL and redirect URLs:

- Site URL: `http://localhost:3000` (and your production URL later)
- Redirect URLs: `http://localhost:3000/auth/confirm`,
  `http://localhost:3000/reset-password`

Email confirmation is on by default; new accounts receive a confirmation email
before they can sign in. (You can disable it in dev under
**Authentication → Providers → Email** if you prefer.)

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

### 6. Import A2 content (optional, after migrations)

The resource-pack content lives in `content/source/`. Validate it with a
dry-run, then commit it to your database:

```bash
npm run import:content                 # dry-run: validate + report only
npm run import:content -- --commit      # upsert into Supabase
```

Commit mode reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
from the environment. The import is idempotent and **never publishes** — all
content lands as `needs_review` or `draft`. See
[Content pipeline](#content-pipeline) below.

---

## Scripts

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start the dev server                     |
| `npm run build`     | Production build                         |
| `npm run start`     | Run the production build                 |
| `npm run lint`      | ESLint (next/core-web-vitals + TS rules) |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm run test`      | Run Vitest unit tests                    |
| `npm run import:content` | Validate + import A2 content (dry-run; `-- --commit` to write) |
| `npm run format`    | Prettier                                 |

---

## Project structure

```
app/
  (auth)/              Login, register, forgot/reset password + auth server actions
  (learner)/           Protected area: layout guard + dashboard
  auth/
    confirm/route.ts   Email confirmation / recovery OTP handler
    signout/route.ts   POST sign-out
  page.tsx             Landing page
  layout.tsx           Root layout + metadata
  globals.css          Tailwind v4 + design tokens
components/
  ui/                  Accessible primitives (button, input, label, card, alert, field)
  auth/                Client auth forms (useActionState)
  shell/               App shell + module/progress cards
  brand/               Logo
lib/
  supabase/            Browser, server and proxy Supabase clients (@supabase/ssr)
  env.ts / env.server.ts   Zod-validated environment access (public vs server-only)
  constants.ts         Brand + module metadata
  text.ts / utils.ts   Shared helpers (word counter, className merge)
supabase/
  migrations/          0001_schema.sql, 0002_rls.sql
  seed.sql             Course + module structure
proxy.ts               Refreshes the session + guards protected routes (Next 16 proxy)
__tests__/             Vitest unit tests
```

Folder conventions follow the brief's suggested structure, adapted to current
Next.js 16 server/client component boundaries.

---

## Database & security

- **UUID** primary keys, `timestamptz` timestamps, foreign keys and indexes
  throughout (`supabase/migrations/0001_schema.sql`).
- **Row Level Security is enabled on every table** (`0002_rls.sql`):
  - Learners can read/update **only their own** profile, attempts, corrections,
    progress and mistake history.
  - Learners **cannot write their own `stage_progress`** — progression is
    reserved for server-side code inside a transaction (enforced in a later
    milestone). This prevents a learner from granting themselves completion.
  - **Answer keys stay server-only.** `questions`, `dictation_passages`,
    `email_tasks` and `revision_tests` have RLS enabled with **no** learner
    policy, so model answers and dictation transcripts are never exposed to the
    browser. Safe subsets are served through trusted server endpoints (built in
    later milestones) using the service role key.
- **Keys**: the anon key is the only Supabase key sent to the browser. The
  service role key, and later the OpenAI and Telnyx keys, are **server-only**.

---

## Content pipeline

A2 learning content is **data, not hardcoded** in components. Source files live
in `content/source/` (copied from the resource pack); the register of official
references and attribution rules is in
`content/source/RESOURCE_REGISTER.md`.

- **Schemas**: `lib/content/schemas.ts` — Zod schemas + TypeScript types for
  grammar exercises, dictation passages, email tasks, vocabulary and the stage
  maps. `lib/content/mapping.ts` — pure helpers (word-range parsing, register
  normalisation, status mapping) with unit tests.
- **Migration**: `0003_content_workflow.sql` adds the status workflow
  (`draft → needs_review → approved → published`), `source_note`, stable
  `external_id`s for idempotent upserts, and a `vocabulary` table.
- **Import**: `scripts/import-content.mts` validates every file, maps it to DB
  rows, and upserts. It is **idempotent** and **caps status at `needs_review`** —
  it cannot publish content, even if the source claims approval.

**Status after first import:** 30 stages per module; 21 grammar questions,
12 dictation passages, 30 email tasks, 89 vocabulary items — all `needs_review`.
**Gaps to author** (kept unpublished): grammar stages 5, 12, 18, 19, 22, 24, 25,
26, 29, 30; dictation stages 13–30. External references (Goethe, DW, etc.) are
linked, never copied.

> Moving content to `approved`/`published` is a deliberate step after a
> qualified German review — the import never does it for you.

## How authentication works

1. `proxy.ts` runs on every request, refreshes the Supabase session cookie
   and redirects unauthenticated users away from protected routes to `/login`.
2. Auth forms are Client Components using React's `useActionState`; they call
   **Server Actions** in `app/(auth)/actions.ts`, which use the server Supabase
   client.
3. The protected `(learner)` layout independently re-checks the session
   (defence in depth) before rendering.
4. A DB trigger creates a `profiles` row automatically on sign-up.

---

## Testing

```bash
npm run test       # Vitest
npm run typecheck  # TypeScript
npm run lint       # ESLint
```

Milestone 1 ships unit tests for the shared word counter and the class-name
helper. Integration and security tests (RLS enforcement, stage eligibility)
arrive with the stage engine in Milestone 2+.

---

## Roadmap

| Milestone | Scope                                                        | State      |
| --------- | ----------------------------------------------------------- | ---------- |
| **1**     | Foundation, auth, protected dashboard                       | ✅ Done    |
| **2**     | Content pipeline (schemas, workflow migration, import)      | ✅ Done    |
| 3         | Shared stage & progression engine (server-side unlocking)   | Next       |
| 4         | Grammar slice (lesson → attempt → AI eval → correction)     | Planned    |
| 5         | Dictation slice (TTS adapter, audio, text alignment)        | Planned    |
| 6         | Email slice (editor, autosave, rubric evaluation)           | Planned    |
| 7         | Content generation (fill gaps, batched + reviewed)          | Planned    |
| 8         | Dashboard analytics, mistake history, polish, deployment    | Planned    |

The architecture is intentionally extensible to A1/B1/B2 later, but only A2 is
built now.

---

## Notes & scope guardrails (from the product brief)

- A2 only; no teacher portal; no payments; no speaking module.
- Dictation supports listening practice but is **not** a substitute for an
  official exam listening section, and the product is **not** advertised as a
  complete Goethe A2 exam simulator.
- Official CEFR/Goethe requirements are kept distinct from product-designed
  scoring rules (all thresholds are configurable platform rules).
