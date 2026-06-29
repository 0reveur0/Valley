# Valley

Valley is a document-sharing platform inspired by Scribd and Studocu.

## Stack
- Frontend: Next.js App Router + Tailwind CSS + TypeScript
- Backend: Next.js API Routes + TypeScript
- Database: PostgreSQL + Prisma ORM
- Media storage: Cloudinary

## Setup
1. Install dependencies:
   npm install
2. Start PostgreSQL locally:
   docker compose up -d
3. Copy environment variables:
   cp .env.example .env
4. Generate Prisma client and create migrations:
   npx prisma migrate dev --name init
5. Seed demo data:
   npm run db:seed
6. Start the app:
   npm run dev

## Main routes
- Home page: /
- Health API: /api/health
- Documents API: /api/documents
