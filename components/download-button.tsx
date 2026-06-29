"use client";

import { useState } from 'react';
import Link from 'next/link';

type DownloadButtonProps = {
  documentId: string;
  documentTitle?: string;
  label?: string;
  pointsRequired?: number;
};

export default function DownloadButton({
  documentId,
  documentTitle,
  label = 'Tải tài liệu',
  pointsRequired = 0,
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    setShowModal(false);

    try {
      const response = await fetch(`/api/documents/${documentId}/download-request`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setShowModal(true);
        } else if (response.status === 401) {
          setError('Bạn cần đăng nhập để tải tài liệu.');
        } else {
          setError(data.error || 'Không thể tải tài liệu này.');
        }
        return;
      }

      if (data.downloadUrl) {
        // Fetch the file as a blob so the browser triggers a real download
        // even when the URL is cross-origin (e.g. Cloudinary).
        // Using a plain <a download="…"> won't work for cross-origin URLs.
        const fileResponse = await fetch(data.downloadUrl);
        if (!fileResponse.ok) {
          throw new Error('Không thể lấy file từ máy chủ.');
        }

        const blob = await fileResponse.blob();
        const objectUrl = URL.createObjectURL(blob);

        const filename = documentTitle
          ? `${documentTitle}.pdf`
          : data.document?.title
            ? `${data.document.title}.pdf`
            : `${documentId}.pdf`;

        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Release the object URL after the browser has started the download
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full rounded-xl bg-sky-600 px-4 py-3 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'Đang xử lý...' : label}
      </button>

      {error && !showModal && (
        <p className="mt-2 text-sm text-rose-400">{error}</p>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 id="modal-title" className="text-lg font-semibold text-white">
              Không đủ điểm
            </h3>
            <p className="mt-3 text-sm text-slate-300">
              Bạn không đủ điểm. Hãy tải lên tài liệu của bạn để nhận thêm điểm thưởng,
              hoặc nâng cấp tài khoản Premium để tải không giới hạn.
            </p>
            {pointsRequired > 0 && (
              <p className="mt-2 text-sm text-slate-400">
                Tài liệu này yêu cầu{' '}
                <span className="font-semibold text-sky-400">{pointsRequired} điểm</span>.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
              >
                Đóng
              </button>
              <Link
                href="/pricing"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
                onClick={() => setShowModal(false)}
              >
                Nâng cấp Premium
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
