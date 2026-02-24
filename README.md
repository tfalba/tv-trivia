# TV Trivia

TV Trivia is a full-stack trivia app where players pick a decade and favorite TV shows, generate AI-backed question banks, and play rounds on a shared game board.

## Purpose

The app is built for trivia-night gameplay with:
- Decade-based show selection (1970s to 2010s)
- AI-generated question banks by difficulty
- Multi-player rounds with score tracking
- Google sign-in via Supabase for protected actions (question generation)

## How It Works

1. Home page
- Pick a decade.
- Select exactly 5 shows.
- Optionally generate a question bank for that decade/show set.

2. Game page
- Players take turns selecting a show.
- Draw a question from the generated bank.
- Mark correct/wrong to award points.
- First player to the win threshold wins the round.

3. Settings page
- Configure theme.
- Manage player list.
- Reset and start a new rotated round.

## Architecture

This is a pnpm monorepo:
- `apps/web`: React + Vite + Tailwind frontend
- `apps/api`: Express API with Prisma + Postgres
- `packages/shared`: Shared TypeScript types used by web and api

Key backend responsibilities:
- Read/write question banks from Postgres (Prisma models)
- Generate shows/questions with OpenAI endpoints
- Validate Supabase bearer tokens on protected routes
- Optional S3-compatible object-store snapshot uploads

## Tech Stack

- Frontend: React 18, React Router, Vite, Tailwind CSS, TypeScript
- Backend: Express 5, TypeScript, Prisma, `pg`
- Auth: Supabase (Google OAuth)
- AI: OpenAI API
- Database: Postgres
- Monorepo tooling: pnpm workspaces

## Run From Repo (Local)

Prereqs:
- Node.js 22+
- pnpm 9+
- Postgres running locally (or a hosted Postgres URL)
- Supabase project (for Google sign-in)
- OpenAI API key (for AI generation features)

Install:

```bash
pnpm install
```

Configure API env:

```bash
cp apps/api/.env.example apps/api/.env
```

Required API env vars in `apps/api/.env`:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Optional API env vars:
- `OPENAI_MODEL` (default: `gpt-4.1-mini`)
- `OBJECT_STORE_ENDPOINT`
- `OBJECT_STORE_REGION`
- `OBJECT_STORE_BUCKET`
- `OBJECT_STORE_ACCESS_KEY_ID`
- `OBJECT_STORE_SECRET_ACCESS_KEY`

Configure Web env in `apps/web/.env`:

```env
VITE_API_URL=http://localhost:5174
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Generate Prisma client and apply migrations:

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
```

Run both apps in parallel:

```bash
pnpm dev
```

Default local URLs:
- Web: `http://localhost:5173`
- API: `http://localhost:5174`

## Useful Commands

- Build all packages:
```bash
pnpm build
```

- Typecheck all packages:
```bash
pnpm typecheck
```

- Build web only:
```bash
pnpm --filter web build
```

- Run API only:
```bash
pnpm --filter api dev
```

## Deploying on Render

Use two services from the same repo root.

1. API (Web Service)
- Build: `pnpm install --frozen-lockfile && pnpm --filter api prisma:generate`
- Start: `pnpm --filter api prisma:deploy && pnpm --filter api dev`
- Health check: `/api/health`
- Env: `DATABASE_URL`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

2. Web (Static Site)
- Build: `pnpm install --frozen-lockfile && pnpm --filter web build`
- Publish dir: `apps/web/dist`
- Env: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Important:
- Build from repo root with pnpm (do not use npm for this workspace setup).

## Notes

- Generated question bank JSON files in `apps/api/src/data` are legacy/local artifacts.
- Current app flow persists question banks in Postgres via Prisma.
