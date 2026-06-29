import Link from 'next/link';
import { auth } from '@/auth';
import NavbarClient from './navbar-client';

export default async function Navbar() {
  const session = await auth();
  const user = session?.user ?? null;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-white">
            Valley
            <span className="ml-1 text-sky-400">.</span>
          </span>
        </Link>

        {/* Centre nav links */}
        <nav className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
          <Link href="/#featured" className="transition hover:text-white">
            Tài liệu
          </Link>
          {user && (
            <>
              <Link href="/workspace" className="transition hover:text-white">
                Workspace
              </Link>
              <Link href="/upload" className="transition hover:text-white">
                Tải lên
              </Link>
              <Link href="/earn-credits" className="transition hover:text-violet-400">
                Kiếm điểm
              </Link>
            </>
          )}
          {user?.role === 'Admin' && (
            <Link href="/admin/dashboard" className="transition hover:text-amber-400">
              Admin
            </Link>
          )}
        </nav>

        {/* Right side — passes serialisable data to client component */}
        <NavbarClient
          user={
            user
              ? {
                  email: user.email ?? '',
                  credits: (user as any).credits ?? 0,
                  membershipType: (user as any).membershipType ?? 'Free',
                }
              : null
          }
        />
      </div>
    </header>
  );
}
