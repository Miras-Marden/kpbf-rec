# KPBF REC

KPBF REC is a production-minded Kazakhstani boxing database: fighters, bouts, events, rankings, and news.

## Monorepo
- `apps/web`: Next.js (App Router) + Tailwind — **can run on Vercel with Supabase only** (see env below)
- `apps/api`: NestJS + Prisma + PostgreSQL — **optional** for local/full-stack; not required to build or run the web app alone
- `packages/types`: shared enums/types

## Records strategy
Fighter records are **computed from bouts** (typically from **published** bouts only). There is no separate `fighter_records` table; bouts are the source of truth.

## Repository output hygiene
Do not include build/dependency outputs in shared archives (e.g. `node_modules/`, `dist/`, `.next/`, `.turbo/`). Use `.gitignore` as the source of truth for what must be excluded.

## Prerequisites
- Node.js **20.x** (see `.nvmrc`; matches Vercel LTS)
- **pnpm 9.15.1** (Corepack: `corepack enable` then `corepack prepare pnpm@9.15.1 --activate` — must match root `package.json` / lockfile)
- Docker (optional; recommended for local Postgres)

## Deploy web on Vercel (monorepo)
1. Import the Git repository and set **Root Directory** to `apps/web` (so `apps/web/vercel.json` applies).
2. Use **Node.js 20** in Project Settings (or rely on `.nvmrc` / `engines`).
3. Ensure **Install Command** runs from the repo root (this repo sets it in `apps/web/vercel.json`): `cd ../.. && pnpm install --frozen-lockfile`.
4. **Build Command** (also in `vercel.json`): `cd ../.. && pnpm exec turbo run build --filter=@kpbf-rec/web` — builds `@kpbf-rec/types` then `@kpbf-rec/web` only (API is not built on Vercel).
5. Add **Environment Variables** in the Vercel project (Production / Preview as needed):

| Name | Required | Notes |
|------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase **anon** key only (never service role). |
| `NEXT_PUBLIC_API_URL` | No | Optional Nest API URL. If unset, the app runs in **Supabase-only** mode (auth works; listings/rankings/admin need API). |

No database or API-only secrets are required for the Next.js build; do not set `SUPABASE_SERVICE_ROLE_KEY` on the frontend.

## Environment files

**Frontend (Vercel or local web only)** — required variables are only:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Copy [`apps/web/.env.example`](apps/web/.env.example) → `apps/web/.env.local` (gitignored). Do not put service role keys or `DATABASE_URL` in the web app.

**Optional:** `NEXT_PUBLIC_API_URL` if you run the Nest API for live listings/rankings/admin.

**Root** [`.env.example`](.env.example) summarizes the web block and points to `apps/api` for backend.

**Backend (local API)** — copy [`apps/api/.env.example`](apps/api/.env.example) → `apps/api/.env` when you need Prisma, Redis, or JWT secrets. Not used by the Vercel web build.

## Local setup

**Web only (Supabase):** `pnpm install` → configure `apps/web/.env.local` → `pnpm -C apps/web dev`.

**Full stack (web + API + DB):** from repo root:

1. Install dependencies: `pnpm install`
2. Start infra: `docker compose up -d`
3. Prisma client: `pnpm -C apps/api prisma:generate`
4. Prisma migrate: `pnpm -C apps/api prisma:migrate`
5. Seed data (+ ranking bootstrap): `pnpm -C apps/api prisma:seed`
6. Run API: `pnpm -C apps/api dev`
7. Run Web: `pnpm -C apps/web dev` (set `NEXT_PUBLIC_API_URL` if you want API-backed data)

## Database (local)
This repo includes `docker-compose.yml` for Postgres (and Redis, optional).

Start services:
- `docker compose up -d`

If you don’t use Docker:
- Run Postgres on `localhost:5432`
- Set `DATABASE_URL` accordingly in `apps/api/.env`

## Prisma (apps/api)
From repo root:
- `pnpm -C apps/api prisma:generate`
- `pnpm -C apps/api prisma:migrate`
- `pnpm -C apps/api prisma:seed`

## Run (dev)
From repo root:
- API: `pnpm -C apps/api dev` (default `PORT=4000`)
- Web: `pnpm -C apps/web dev` (default `PORT=3000`)

## MVP ranking behavior
- Rankings are recalculated when a bout is published via admin API.
- If queue infra is unavailable, the API uses synchronous fallback recalculation.
- Configure with `RANKINGS_USE_QUEUE` (`false` by default in env examples).

## Core public routes (web)
- `/{locale}/fighters`
- `/{locale}/events`
- `/{locale}/fights`
- `/{locale}/rankings`
- `/{locale}/rankings/p4p`
- `/{locale}/rankings/history`
- `/{locale}/methodology`

