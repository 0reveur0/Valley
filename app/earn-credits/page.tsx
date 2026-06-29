"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */

const EARN_METHODS = [
  {
    icon: '📄',
    title: 'Tải lên tài liệu được duyệt',
    description:
      'Mỗi tài liệu được AI kiểm duyệt và Admin phê duyệt sẽ mang lại cho bạn 10 credits.',
    reward: '+10 credits',
    color: 'sky',
    cta: { label: 'Tải lên ngay', href: '/upload' },
  },
  {
    icon: '📅',
    title: 'Điểm danh hàng ngày',
    description: 'Mở ứng dụng mỗi ngày và bấm nhận điểm. Đơn giản như vậy thôi!',
    reward: '+2 credits / ngày',
    color: 'violet',
    cta: null,
  },
  {
    icon: '🔗',
    title: 'Chia sẻ tài liệu cho bạn bè',
    description:
      'Sao chép link tài liệu và chia sẻ lên mạng xã hội để giới thiệu Valley đến cộng đồng.',
    reward: '+5 credits',
    color: 'emerald',
    cta: null,
    badge: 'Sắp ra mắt',
  },
  {
    icon: '⭐',
    title: 'Hoàn thành hồ sơ cá nhân',
    description:
      'Cập nhật ảnh đại diện, bio và thông tin học vấn để nhận thưởng một lần.',
    reward: '+5 credits',
    color: 'amber',
    cta: null,
    badge: 'Sắp ra mắt',
  },
];

const colorMap: Record<string, string> = {
  sky: 'from-sky-900/40 to-sky-950/20 border-sky-800/40 text-sky-300',
  violet: 'from-violet-900/40 to-violet-950/20 border-violet-800/40 text-violet-300',
  emerald: 'from-emerald-900/40 to-emerald-950/20 border-emerald-800/40 text-emerald-300',
  amber: 'from-amber-900/40 to-amber-950/20 border-amber-800/40 text-amber-300',
};

const badgeColorMap: Record<string, string> = {
  sky: 'bg-sky-500/20 text-sky-300',
  violet: 'bg-violet-500/20 text-violet-300',
  emerald: 'bg-emerald-500/20 text-emerald-300',
  amber: 'bg-amber-500/20 text-amber-300',
};

/* ------------------------------------------------------------------ */
/*  Confetti burst (lightweight CSS-keyframe particles)                */
/* ------------------------------------------------------------------ */
function ConfettiBurst() {
  const colors = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f472b6', '#ffffff'];
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      aria-hidden
    >
      {Array.from({ length: 18 }).map((_, i) => {
        const color = colors[i % colors.length];
        const size = 6 + (i % 4) * 2;
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${5 + ((i * 5.5) % 90)}%`,
              top: '40%',
              width: size,
              height: size,
              borderRadius: i % 3 === 0 ? '50%' : '2px',
              backgroundColor: color,
              animation: `confetti-fall 0.9s ease-out ${(i * 0.07).toFixed(2)}s forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(-80px) rotate(360deg) scale(0.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function EarnCreditsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  const [credits, setCredits] = useState<number | null>(null);
  /** null = status not yet fetched; true/false = hydrated from GET */
  const [checkedInToday, setCheckedInToday] = useState<boolean | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin');
  }, [status, router]);

  // Seed credits from session
  useEffect(() => {
    if (session?.user) {
      setCredits((session.user as any).credits ?? 0);
    }
  }, [session]);

  // Fetch today's check-in status so the button starts in the correct state
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/user/daily-checkin')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.checkedInToday === 'boolean') setCheckedInToday(d.checkedInToday);
      })
      .catch(() => {
        // On error keep null — button will be enabled (fail-open for UX, server is still idempotent)
      });
  }, [status]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCheckin = async () => {
    if (checkedInToday || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/user/daily-checkin', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400) setCheckedInToday(true); // already checked in today
        showToast('error', data.error ?? 'Đã xảy ra lỗi.');
      } else {
        setCredits(data.newCredits);
        setCheckedInToday(true);
        setShowConfetti(true);
        showToast('success', `🎉 +${data.pointsEarned} credits! Tổng: ${data.newCredits} điểm.`);
        await updateSession(); // refresh navbar credits chip
        setTimeout(() => setShowConfetti(false), 1200);
      }
    } catch {
      showToast('error', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setClaiming(false);
    }
  };

  const pageLoading = status === 'loading' || status === 'unauthenticated';

  if (pageLoading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        </div>
      </>
    );
  }

  // Button is disabled when already checked in OR while status is still loading from GET
  const buttonDisabled = checkedInToday === true || claiming;
  const buttonLabel = (() => {
    if (claiming) return null; // spinner shown instead
    if (checkedInToday === true) return '✓ Đã nhận điểm hôm nay';
    if (checkedInToday === null) return 'Đang kiểm tra…';
    return 'Bấm để nhận 2 credits';
  })();

  return (
    <>
      <Navbar />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl px-5 py-4 text-sm font-medium shadow-2xl ring-1 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 ring-emerald-700'
              : 'bg-rose-900/90 text-rose-100 ring-rose-700'
          }`}
        >
          {toast.type === 'success' ? '✅' : '❌'}
          <span>{toast.msg}</span>
        </div>
      )}

      <main className="min-h-screen bg-slate-950 pt-14 text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-16 md:px-8">

          {/* ── Page header ── */}
          <div className="mb-12 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Valley</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Kiếm Điểm Thưởng</h1>
            <p className="mt-3 text-slate-400">
              Tích lũy credits để tải tài liệu — không cần thanh toán bằng tiền thật.
            </p>
          </div>

          {/* ── Credits hero ── */}
          <div className="mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-900/50 to-slate-900/80 p-8 ring-1 ring-sky-800/30">
            <p className="text-sm font-medium uppercase tracking-widest text-sky-400">
              Số điểm hiện tại
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-6xl font-extrabold tabular-nums text-white">
                {credits ?? '—'}
              </span>
              <span className="mb-2 text-lg text-sky-300">credits</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Cập nhật theo thời gian thực sau mỗi hành động kiếm điểm.
            </p>
          </div>

          {/* ── Daily check-in card ── */}
          <div className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/40 to-violet-950/20 p-8 ring-1 ring-violet-800/40">
            {showConfetti && <ConfettiBurst />}

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  <h2 className="text-xl font-bold">Điểm Danh Hàng Ngày</h2>
                </div>
                <p className="mt-2 max-w-sm text-sm text-slate-400">
                  Mở Valley mỗi ngày và bấm nhận thưởng. Mỗi lần điểm danh bạn nhận ngay{' '}
                  <span className="font-semibold text-violet-300">+2 credits</span> — miễn phí,
                  không điều kiện.
                </p>
                {checkedInToday === true && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Quay lại vào ngày mai để nhận tiếp!
                  </p>
                )}
              </div>

              <button
                onClick={handleCheckin}
                disabled={buttonDisabled || checkedInToday === null}
                className={`relative shrink-0 rounded-xl px-7 py-3.5 text-sm font-semibold transition-all ${
                  buttonDisabled || checkedInToday === null
                    ? 'cursor-not-allowed bg-slate-800 text-slate-500 ring-1 ring-slate-700'
                    : 'bg-violet-600 text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500 active:scale-95'
                }`}
              >
                {claiming ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang xử lý…
                  </span>
                ) : (
                  buttonLabel
                )}
              </button>
            </div>
          </div>

          {/* ── Other earn methods ── */}
          <h2 className="mb-5 text-lg font-semibold text-slate-200">Cách kiếm điểm khác</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {EARN_METHODS.map((m) => (
              <div
                key={m.title}
                className={`relative flex flex-col gap-4 rounded-2xl bg-gradient-to-br p-6 ring-1 ${colorMap[m.color]}`}
              >
                {m.badge && (
                  <span
                    className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${badgeColorMap[m.color]}`}
                  >
                    {m.badge}
                  </span>
                )}

                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">{m.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white">{m.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{m.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold tracking-wide">
                    {m.reward}
                  </span>
                  {m.cta && (
                    <Link
                      href={m.cta.href}
                      className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500"
                    >
                      {m.cta.label}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Footer hint ── */}
          <p className="mt-12 text-center text-xs text-slate-600">
            Credits không có giá trị quy đổi tiền mặt · Valley ©{' '}
            {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </>
  );
}
