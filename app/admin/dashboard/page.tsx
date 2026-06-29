import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import PendingDocumentsTable, { type PendingDocument } from './pending-documents-table';

export const dynamic = 'force-dynamic'; // always fetch fresh data

export default async function AdminDashboardPage() {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Re-read role from DB — never trust the JWT alone for admin checks
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== 'Admin') {
    redirect('/');
  }

  // ── Data fetching ───────────────────────────────────────────────────────────
  const pendingDocs = await prisma.document.findMany({
    where: { status: 'Pending' },
    orderBy: { createdAt: 'asc' }, // oldest first → fair review queue
    select: {
      id: true,
      title: true,
      totalPages: true,
      pointsRequired: true,
      previewPattern: true,
      createdAt: true,
      uploader: {
        select: { email: true },
      },
    },
  });

  // Serialise Date → string so the Server Component can pass it to the
  // Client Component without "objects with toJSON are not serialisable" errors
  const serialised: PendingDocument[] = pendingDocs.map((doc) => ({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
  }));

  // ── Aggregate stats ─────────────────────────────────────────────────────────
  const [totalDocuments, totalUsers, approvedCount] = await Promise.all([
    prisma.document.count(),
    prisma.user.count(),
    prisma.document.count({ where: { status: 'Approved' } }),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-10">

        {/* ── Page header ── */}
        <div className="flex flex-col gap-1 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Valley Admin</p>
            <h1 className="mt-1 text-3xl font-semibold">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              Xem xét và phê duyệt các tài liệu đang chờ kiểm duyệt.
            </p>
          </div>
          <p className="text-sm text-slate-500">
            Đăng nhập với tư cách&nbsp;
            <span className="font-medium text-slate-300">{session.user.email}</span>
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Tổng tài liệu"
            value={totalDocuments}
            icon={<DocumentIcon />}
            color="sky"
          />
          <StatCard
            label="Đang chờ duyệt"
            value={serialised.length}
            icon={<ClockIcon />}
            color="amber"
            highlight={serialised.length > 0}
          />
          <StatCard
            label="Đã duyệt"
            value={approvedCount}
            icon={<CheckCircleIcon />}
            color="emerald"
          />
        </div>

        {/* ── Pending documents table ── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Tài liệu chờ duyệt
              {serialised.length > 0 && (
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                  {serialised.length}
                </span>
              )}
            </h2>
          </div>

          <PendingDocumentsTable initial={serialised} />
        </section>

      </div>
    </main>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

type Color = 'sky' | 'amber' | 'emerald';

const colorMap: Record<Color, { badge: string; icon: string }> = {
  sky:     { badge: 'bg-sky-950/60 ring-sky-800/40',     icon: 'text-sky-400' },
  amber:   { badge: 'bg-amber-950/60 ring-amber-800/40', icon: 'text-amber-400' },
  emerald: { badge: 'bg-emerald-950/60 ring-emerald-800/40', icon: 'text-emerald-400' },
};

function StatCard({
  label,
  value,
  icon,
  color,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: Color;
  highlight?: boolean;
}) {
  const c = colorMap[color];
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-5 ${
        highlight
          ? 'border-amber-700/40 bg-amber-950/20'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${c.badge}`}>
        <span className={c.icon}>{icon}</span>
      </span>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value.toLocaleString('vi-VN')}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}

// ── Tiny SVG icons ────────────────────────────────────────────────────────────

function DocumentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
