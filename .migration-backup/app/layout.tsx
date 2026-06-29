import './globals.css';
import type { Metadata } from 'next';
import AuthSessionProvider from '@/components/session-provider';

export const metadata: Metadata = {
  title: 'Valley — Chia sẻ tài liệu, Mở khóa tri thức',
  description:
    'Không gian học tập và chia sẻ tài liệu công bằng. Tải lên tài liệu của bạn để nhận điểm tải xuống, hoặc nâng cấp Premium để truy cập không giới hạn.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
