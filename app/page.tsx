import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Navbar from '@/components/navbar';

export const dynamic = 'force-dynamic';

// ── Data ──────────────────────────────────────────────────────────────────────

async function getFeaturedDocuments() {
  return prisma.document.findMany({
    where: { status: 'Approved' },
    orderBy: [{ viewCount: 'desc' }, { downloadCount: 'desc' }],
    take: 6,
    select: {
      id: true,
      title: true,
      slug: true,
      totalPages: true,
      pointsRequired: true,
      viewCount: true,
      downloadCount: true,
      uploader: { select: { email: true } },
    },
  });
}

async function getStats() {
  const [totalDocs, totalUsers] = await Promise.all([
    prisma.document.count({ where: { status: 'Approved' } }),
    prisma.user.count(),
  ]);
  return { totalDocs, totalUsers };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [docs, stats] = await Promise.all([getFeaturedDocuments(), getStats()]);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-950 text-slate-100">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-14 text-center">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-1/3 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-600/10 blur-[120px]" />
            <div className="absolute left-1/4 top-2/3 h-[300px] w-[400px] rounded-full bg-indigo-600/8 blur-[80px]" />
          </div>

          {/* Badge */}
          <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-sky-800/40 bg-sky-950/50 px-4 py-1.5 text-xs font-medium text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Nền tảng học tập mở · Miễn phí · Không quảng cáo
          </div>

          {/* Headline */}
          <h1 className="relative max-w-4xl text-balance text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Valley —{' '}
            <span className="bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Chia sẻ tài liệu,
            </span>
            <br />
            Mở khóa tri thức
          </h1>

          {/* Sub-headline */}
          <p className="relative mt-6 max-w-2xl text-balance text-lg leading-relaxed text-slate-400">
            Không gian học tập và chia sẻ tài liệu công bằng. Tải lên tài liệu của bạn để nhận
            điểm tải xuống, hoặc nâng cấp Premium để truy cập không giới hạn.
          </p>

          {/* CTA buttons */}
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/signin"
              className="group flex items-center gap-2 rounded-xl bg-sky-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-500 active:scale-95"
            >
              Bắt đầu ngay
              <svg className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="#featured"
              className="rounded-xl border border-slate-700 px-7 py-3.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white active:scale-95"
            >
              Xem tài liệu nổi bật
            </a>
          </div>

          {/* Stats strip */}
          <div className="relative mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums text-white">
                {stats.totalDocs.toLocaleString('vi-VN')}
              </span>
              tài liệu đã duyệt
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums text-white">
                {stats.totalUsers.toLocaleString('vi-VN')}
              </span>
              thành viên
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">100%</span>
              miễn phí
            </div>
          </div>

          {/* Scroll cue */}
          <a href="#featured" className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-slate-600 transition hover:text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </a>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className="border-y border-slate-800/60 bg-slate-900/40 py-20">
          <div className="mx-auto max-w-5xl px-4">
            <p className="text-center text-xs uppercase tracking-[0.3em] text-sky-400">Cơ chế hoạt động</p>
            <h2 className="mt-3 text-center text-3xl font-bold">Học và đóng góp, cùng phát triển</h2>

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: '01',
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  ),
                  title: 'Tải lên tài liệu',
                  desc: 'Upload PDF bất kỳ. AI kiểm duyệt nhanh và bạn nhận ngay +10 điểm thưởng khi được duyệt.',
                },
                {
                  step: '02',
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
                    </svg>
                  ),
                  title: 'Dùng điểm tải về',
                  desc: 'Dùng điểm tích lũy để tải tài liệu của người khác. Người đóng góp cũng nhận thêm điểm.',
                },
                {
                  step: '03',
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  ),
                  title: 'Hoặc lên Premium',
                  desc: 'Tải không giới hạn, không cần điểm. Hỗ trợ nền tảng và người đóng góp tri thức.',
                },
              ].map((item) => (
                <div key={item.step} className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-sky-800/50">
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-950/60 text-sky-400 ring-1 ring-sky-800/40">
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-600">{item.step}</p>
                      <h3 className="mt-0.5 font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured documents ────────────────────────────────────────────── */}
        <section id="featured" className="py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Nội dung nổi bật</p>
                <h2 className="mt-2 text-3xl font-bold">Tài liệu được tải nhiều nhất</h2>
              </div>
              <Link href="/auth/signin" className="hidden text-sm text-slate-400 transition hover:text-white sm:block">
                Xem tất cả →
              </Link>
            </div>

            {docs.length === 0 ? (
              <div className="mt-10 flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-800 text-slate-600">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p>Chưa có tài liệu nào được duyệt. Hãy là người đầu tiên đóng góp!</p>
              </div>
            ) : (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.slug}`}
                    className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-800/50 hover:bg-slate-900"
                  >
                    {/* Title */}
                    <h3 className="line-clamp-2 flex-1 font-semibold text-slate-100 group-hover:text-white">
                      {doc.title}
                    </h3>

                    {/* Meta row */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5">
                        {doc.totalPages} trang
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {doc.viewCount.toLocaleString('vi-VN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        {doc.downloadCount.toLocaleString('vi-VN')}
                      </span>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-4">
                      <span className="text-xs text-slate-500 truncate">
                        {doc.uploader.email.split('@')[0]}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-950/60 px-2.5 py-0.5 text-xs font-medium text-sky-300 ring-1 ring-sky-800/40">
                        {doc.pointsRequired === 0 ? 'Miễn phí' : `${doc.pointsRequired} điểm`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── CTA banner ───────────────────────────────────────────────────── */}
        <section className="border-t border-slate-800/60 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Sẵn sàng đóng góp và học hỏi?
            </h2>
            <p className="mt-4 text-slate-400">
              Tham gia Valley, chia sẻ tài liệu của bạn và nhận điểm thưởng ngay hôm nay.
            </p>
            <Link
              href="/auth/signin"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-8 py-4 font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-500"
            >
              Tạo tài khoản miễn phí
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-800/60 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-600 sm:flex-row">
            <span className="font-semibold text-white">Valley<span className="text-sky-400">.</span></span>
            <span>© {new Date().getFullYear()} Valley. Miễn phí · Không quảng cáo · Bảo mật.</span>
            <div className="flex gap-4">
              <Link href="/pricing" className="transition hover:text-slate-400">Pricing</Link>
              <Link href="/auth/signin" className="transition hover:text-slate-400">Đăng nhập</Link>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
