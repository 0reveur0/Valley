"use client";

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

type NavUser = {
  email: string;
  credits: number;
  membershipType: 'Free' | 'Premium';
};

export default function NavbarClient({ user }: { user: NavUser | null }) {
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/auth/signin"
          className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm text-slate-200 transition hover:border-slate-500"
        >
          Đăng nhập
        </Link>
        <Link
          href="/auth/signin"
          className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-sky-500"
        >
          Bắt đầu
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-3">
      {/* Credits chip */}
      <span className="hidden items-center gap-1.5 rounded-full bg-sky-950/70 px-3 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-800/50 sm:flex">
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 15h-1v-4h1v4zm0-6h-1V7h1v4z" />
        </svg>
        {user.credits} điểm
      </span>

      {/* Avatar dropdown */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white ring-1 ring-slate-700 transition hover:ring-sky-500"
      >
        {user.email[0].toUpperCase()}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-40 w-56 rounded-xl border border-slate-800 bg-slate-900 py-2 shadow-2xl">
            <div className="border-b border-slate-800 px-4 py-3">
              <p className="truncate text-xs font-medium text-white">{user.email}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {user.membershipType === 'Premium' ? (
                  <span className="text-amber-400">✦ Premium</span>
                ) : (
                  'Tài khoản Free'
                )}
              </p>
            </div>
            <Link
              href="/workspace"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Workspace của tôi
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Nâng cấp Premium
            </Link>
            <div className="mt-1 border-t border-slate-800 pt-1">
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }); }}
                className="block w-full px-4 py-2 text-left text-sm text-rose-400 transition hover:bg-slate-800"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
