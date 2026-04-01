# KPBF REC

KPBF REC is a production-minded Kazakhstani boxing database: fighters, bouts, events, rankings, and news.

## Monorepo
- `apps/web`: Next.js (App Router) + Tailwind (mobile-first UI)
- `apps/api`: NestJS + Prisma + PostgreSQL (JWT auth + RBAC)
- `packages/types`: shared enums/types

## Records strategy
Fighter records are **computed from bouts** (typically from **published** bouts only). There is no separate `fighter_records` table; bouts are the source of truth.

## Repository output hygiene
Do not include build/dependency outputs in shared archives (e.g. `node_modules/`, `dist/`, `.next/`, `.turbo/`). Use `.gitignore` as the source of truth for what must be excluded.

## Prerequisites
- Node.js >= 20
- pnpm (via Corepack)
- Docker (optional; recommended for local Postgres)

## Environment files
- Root: copy `.env.example` → `.env` (**do not commit**)
- API: copy `apps/api/.env.example` → `apps/api/.env` (**do not commit**)
- Web: copy `apps/web/.env.example` → `apps/web/.env.local` (optional)

## Local MVP setup commands
From repo root, run these commands in order:
1. Install dependencies: `pnpm install`
2. Start infra: `docker compose up -d`
3. Prisma client: `pnpm -C apps/api prisma:generate`
4. Prisma migrate: `pnpm -C apps/api prisma:migrate`
5. Seed data (+ ranking bootstrap): `pnpm -C apps/api prisma:seed`
6. Run API: `pnpm -C apps/api dev`
7. Run Web: `pnpm -C apps/web dev`

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

