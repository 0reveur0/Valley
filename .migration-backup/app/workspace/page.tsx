import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Navbar from '@/components/navbar';
import DocumentStatusBoard, { type WorkspaceDocument } from './document-status-board';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage() {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // ── Fetch user + documents in parallel ────────────────────────────────────
  const [user, rawDocs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, membershipType: true, email: true, createdAt: true },
    }),
    prisma.document.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        totalPages: true,
        pointsRequired: true,
        viewCount: true,
        downloadCount: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) redirect('/auth/signin');

  // Serialise dates before passing to client components
  const documents: WorkspaceDocument[] = rawDocs.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));

  const pendingCount  = documents.filter((d) => d.status === 'Pending').length;
  const approvedCount = documents.filter((d) => d.status === 'Approved').length;
  const rejectedCount = documents.filter((d) => d.status === 'Rejected').length;
  const totalViews    = documents.reduce((s, d) => s + d.viewCount, 0);
  const totalDownloads = documents.reduce((s, d) => s + d.downloadCount, 0);

  const isPremium = user.membershipType === 'Premium';
  const memberSince = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(user.createdAt);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-950 px-4 pt-20 pb-16 text-slate-100 md:px-8">
        <div className="mx-auto max-w-7xl space-y-10">

          {/* ── Page header ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Workspace</p>
              <h1 className="mt-1 text-3xl font-bold">
                Xin chào,{' '}
                <span className="text-white">{user.email.split('@')[0]}</span>
              </h1>
              <p className="mt-1 text-sm text-slate-500">Thành viên từ {memberSince}</p>
            </div>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 self-start rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 sm:self-auto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Tải lên tài liệu mới
            </Link>
          </div>

          {/* ── Stats widgets ────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Credits card — prominently displayed */}
            <div className="relative col-span-1 overflow-hidden rounded-2xl border border-sky-800/40 bg-gradient-to-br from-sky-950/80 to-slate-900 p-5 sm:col-span-2 lg:col-span-1">
              <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
              <p className="text-xs font-medium uppercase tracking-wider text-sky-400">Điểm hiện có</p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-white">
                {user.credits.toLocaleString('vi-VN')}
              </p>
              <p className="mt-1 text-xs text-sky-400/70">credits</p>
              <Link
                href="/pricing"
                className="mt-4 inline-block text-xs text-sky-400 underline-offset-2 hover:underline"
              >
                Nạp thêm điểm →
              </Link>
            </div>

            {/* Membership */}
            <div className={`rounded-2xl border p-5 ${
              isPremium
                ? 'border-amber-700/40 bg-gradient-to-br from-amber-950/60 to-slate-900'
                : 'border-slate-800 bg-slate-900'
            }`}>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Tài khoản</p>
              <div className="mt-2 flex items-center gap-2">
                {isPremium ? (
                  <span className="text-2xl font-bold text-amber-400">✦ Premium</span>
                ) : (
                  <span className="text-2xl font-bold text-white">Free</span>
                )}
              </div>
              {!isPremium && (
                <Link href="/pricing" className="mt-4 inline-block text-xs text-sky-400 underline-offset-2 hover:underline">
                  Nâng cấp Premium →
                </Link>
              )}
              {isPremium && (
                <p className="mt-4 text-xs text-amber-400/70">Tải không giới hạn</p>
              )}
            </div>

            {/* Total views */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Lượt xem</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-white">
                {totalViews.toLocaleString('vi-VN')}
              </p>
              <p className="mt-1 text-xs text-slate-600">trên {approvedCount} tài liệu đã duyệt</p>
            </div>

            {/* Total downloads */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Lượt tải</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-white">
                {totalDownloads.toLocaleString('vi-VN')}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {pendingCount > 0 && `${pendingCount} chờ duyệt · `}
                {rejectedCount > 0 && `${rejectedCount} bị từ chối`}
                {pendingCount === 0 && rejectedCount === 0 && 'Tất cả đã xuất bản'}
              </p>
            </div>
          </div>

          {/* ── Document status board ─────────────────────────────────────────── */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Tài liệu của tôi
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({documents.length} tài liệu)
                </span>
              </h2>
            </div>

            {documents.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-800 text-slate-600">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div className="text-center">
                  <p className="font-medium text-slate-400">Bạn chưa tải lên tài liệu nào</p>
                  <p className="mt-1 text-sm">Hãy tải lên ngay để nhận +10 điểm thưởng!</p>
                </div>
                <Link
                  href="/upload"
                  className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
                >
                  Tải lên tài liệu đầu tiên
                </Link>
              </div>
            ) : (
              <DocumentStatusBoard documents={documents} />
            )}
          </section>

        </div>
      </main>
    </>
  );
}
