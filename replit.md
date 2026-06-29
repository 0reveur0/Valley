# Valley

Vietnamese document-sharing platform where students and lecturers share academic PDFs, earn credits for uploads, and spend credits to download.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/valley run dev` — run the React frontend (port 24219)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — PDF storage (falls back to dummy URL in dev)
- Optional env: `GEMINI_API_KEY` — AI moderation (falls back to "Pending" status if unset)
- Optional env: `SESSION_SECRET` — session signing key (defaults to dev secret)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + shadcn/ui + wouter + @tanstack/react-query
- API: Express 5 + express-session + bcryptjs
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- File uploads: Cloudinary (multer + memory storage)
- AI moderation: Google Gemini 2.0 Flash
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/` — Drizzle ORM schema (users, documents, transactions)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/` — session, auth middleware, cloudinary, AI moderation
- `artifacts/valley/src/pages/` — React pages (home, login, register, explore, document, upload, workspace, admin)
- `artifacts/valley/src/hooks/use-auth.ts` — auth state hook
- `artifacts/valley/src/lib/api.ts` — fetch wrapper with BASE_URL and credentials

## Architecture decisions

- Custom session auth (express-session + bcryptjs) instead of NextAuth — Vite can't use Next.js server
- Drizzle ORM instead of Prisma — fits the pnpm workspace pattern better; schema in `lib/db`
- Gemini AI moderation runs at upload time: Approved (+10 credits), Rejected (stored, no reward), or Pending (admin queue)
- Credits system: register = +10, upload approved = +10, admin approve = +10, daily checkin = +2, download = -N
- All routes under `/api/` prefix; frontend uses `BASE_URL` from Vite env to prepend the base path

## Product

- **Home**: hero, live stats, featured docs, how-it-works explainer
- **Explore**: search/filter documents by keyword, category, sort order; paginated grid
- **Document detail**: view metadata, spend credits to download
- **Upload**: drag-and-drop PDF, AI moderation on submit (auto-approve/reject/pending)
- **Workspace**: personal stats, document list with status, daily check-in
- **Admin dashboard**: stats overview, pending document review queue (approve/reject)
- **Auth**: register with email/password (bcrypt), login, logout (cookie session)

## User preferences

_Populate as needed._

## Gotchas

- Run `pnpm --filter @workspace/db run push` after any schema change before starting the API server
- Run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Express 5 `req.params` returns `string | string[]` — always cast with `String(req.params.id)`
- Session cookie is `httpOnly`; frontend must use `credentials: "include"` on every fetch
- Cloudinary upload uses `upload_stream` — file must be in memory (multer memoryStorage)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
