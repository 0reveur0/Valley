"use client";

import { useState } from 'react';

type DownloadButtonProps = {
  documentId: string;
  label?: string;
  pointsRequired?: number;
};

export default function DownloadButton({ documentId, label = 'Tải tài liệu', pointsRequired = 0 }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/documents/${documentId}/download-request`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setShowModal(true);
          setError(data.error || 'Bạn không đủ điểm để tải tài liệu này');
        } else {
          setError(data.error || 'Không thể tải tài liệu này.');
        }
        return;
      }

      if (data.downloadUrl) {
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = `${documentId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
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

      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Không đủ điểm</h3>
            <p className="mt-3 text-sm text-slate-300">
              Bạn không đủ điểm. Hãy tải lên tài liệu của bạn để nhận thêm điểm thưởng, hoặc nâng cấp tài khoản Premium để tải không giới hạn.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
              >
                Đóng
              </button>
              <button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white">
                Nâng cấp Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
