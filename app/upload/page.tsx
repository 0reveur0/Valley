import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Navbar from '@/components/navbar';
import UploadDocument from '@/components/upload-document';

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 pt-14 text-slate-100">
        <div className="w-full max-w-2xl space-y-6 py-16">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Valley</p>
            <h1 className="mt-2 text-3xl font-bold">Tải lên tài liệu</h1>
            <p className="mt-2 text-sm text-slate-400">
              Nhận <span className="font-semibold text-sky-400">+10 điểm thưởng</span> ngay khi tài liệu được AI kiểm duyệt thành công.
            </p>
          </div>
          <UploadDocument />
        </div>
      </main>
    </>
  );
}
