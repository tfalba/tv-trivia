# Supabase + Prisma + Object Store Migration

This API is now scaffolded for:
- Supabase Auth token validation
- Prisma/Postgres data model
- S3-compatible object store env configuration

## 1) Install packages (when npm DNS/network is available)

From repo root:

```bash
pnpm --filter api add @prisma/client prisma jose @aws-sdk/client-s3
```

## 2) Configure environment

Copy and edit:

```bash
cp apps/api/.env.example apps/api/.env
```

Required for full Option #1:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DATABASE_URL`

Optional object store:
- `OBJECT_STORE_ENDPOINT`
- `OBJECT_STORE_REGION`
- `OBJECT_STORE_BUCKET`
- `OBJECT_STORE_ACCESS_KEY_ID`
- `OBJECT_STORE_SECRET_ACCESS_KEY`

## 3) Run Prisma setup

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate --name init
```

For production:

```bash
pnpm --filter api prisma:deploy
```

## 4) Auth behavior

- `GET /api/auth/me` checks bearer token and returns current user.
- `POST /api/questions/seed` is wired through auth middleware.
- Migration mode: if Supabase env vars are missing, writes still work.
- Once Supabase env vars are set, bearer token validation is enforced.

## 5) Next implementation step

Replace file-backed question bank persistence in `apps/api/src/index.ts` with:
- Prisma `QuestionBank` + `Question` writes
- Optional JSON snapshot upload to object storage
