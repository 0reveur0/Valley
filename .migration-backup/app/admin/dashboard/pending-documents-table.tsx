"use client";

import { useState, useTransition } from 'react';
import Image from 'next/image';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PendingDocument = {
  id: string;
  title: string;
  totalPages: number;
  pointsRequired: number;
  previewPattern: string | null;
  createdAt: string; // ISO string (serialised from the server component)
  uploader: {
    email: string;
  };
};

// ── Helper ────────────────────────────────────────────────────────────────────

function buildPreviewUrl(pattern: string, page: number): string {
  return pattern.replace('{{page}}', String(page));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

type PreviewModalProps = {
  document: PendingDocument;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  actionLoading: 'approve' | 'reject' | null;
};

function PreviewModal({ document, onClose, onApprove, onReject, actionLoading }: PreviewModalProps) {
  const previewPages = Math.min(document.totalPages, 3);
  const hasPreview = !!document.previewPattern && document.totalPages > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/85 px-4 py-10"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-sky-400">Xem trước tài liệu</p>
            <h2 id="preview-title" className="mt-1 truncate text-lg font-semibold text-white">
              {document.title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {document.uploader.email} &bull; {document.totalPages} trang &bull;{' '}
              {document.pointsRequired} điểm
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Đóng"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview pages */}
        <div className="space-y-3 p-6">
          {hasPreview ? (
            Array.from({ length: previewPages }, (_, i) => i + 1).map((page) => (
              <div
                key={page}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
              >
                <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-1.5">
                  <span className="text-xs text-slate-500">Trang {page}</span>
                </div>
                <div className="relative min-h-[340px] w-full">
                  <Image
                    src={buildPreviewUrl(document.previewPattern!, page)}
                    alt={`Trang ${page} của ${document.title}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 672px"
                    unoptimized
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 text-slate-500">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <p className="text-sm">Không có ảnh xem trước</p>
            </div>
          )}
        </div>

        {/* Action footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 p-6">
          <button
            onClick={onClose}
            disabled={!!actionLoading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            onClick={() => onReject(document.id)}
            disabled={!!actionLoading}
            className="flex min-w-[110px] items-center justify-center gap-2 rounded-lg border border-rose-700/60 bg-rose-950/60 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === 'reject' ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <XIcon />
                Từ chối
              </>
            )}
          </button>
          <button
            onClick={() => onApprove(document.id)}
            disabled={!!actionLoading}
            className="flex min-w-[110px] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === 'approve' ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <CheckIcon />
                Duyệt (+10 điểm)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row action buttons ────────────────────────────────────────────────────────

type RowActionsProps = {
  docId: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  rowLoading: 'approve' | 'reject' | null;
};

function RowActions({ docId, onApprove, onReject, rowLoading }: RowActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onReject(docId)}
        disabled={!!rowLoading}
        title="Từ chối"
        className="flex items-center gap-1.5 rounded-lg border border-rose-700/50 bg-rose-950/50 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {rowLoading === 'reject' ? <Spinner className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
        Từ chối
      </button>
      <button
        onClick={() => onApprove(docId)}
        disabled={!!rowLoading}
        title="Duyệt"
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {rowLoading === 'approve' ? <Spinner className="h-3.5 w-3.5" /> : <CheckIcon className="h-3.5 w-3.5" />}
        Duyệt
      </button>
    </div>
  );
}

// ── Main table component ──────────────────────────────────────────────────────

type ToastState = { id: string; message: string; type: 'success' | 'error' };

export default function PendingDocumentsTable({ initial }: { initial: PendingDocument[] }) {
  const [docs, setDocs] = useState<PendingDocument[]>(initial);
  const [preview, setPreview] = useState<PendingDocument | null>(null);
  // Map of docId → loading action for per-row spinners
  const [loadingMap, setLoadingMap] = useState<Record<string, 'approve' | 'reject'>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [, startTransition] = useTransition();

  function showToast(message: string, type: ToastState['type']) {
    const id = Math.random().toString(36).slice(2);
    setToast({ id, message, type });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4000);
  }

  async function handleAction(docId: string, action: 'APPROVE' | 'REJECT') {
    const loadingKey = action === 'APPROVE' ? 'approve' : 'reject';
    setLoadingMap((m) => ({ ...m, [docId]: loadingKey }));

    try {
      const res = await fetch(`/api/admin/documents/${docId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error ?? 'Đã có lỗi xảy ra.', 'error');
        return;
      }

      // Optimistically remove the reviewed document from the list
      startTransition(() => {
        setDocs((prev) => prev.filter((d) => d.id !== docId));
        if (preview?.id === docId) setPreview(null);
      });

      showToast(data.message, 'success');
    } catch {
      showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setLoadingMap((m) => {
        const next = { ...m };
        delete next[docId];
        return next;
      });
    }
  }

  const onApprove = (id: string) => handleAction(id, 'APPROVE');
  const onReject  = (id: string) => handleAction(id, 'REJECT');

  return (
    <>
      {/* ── Toast notification ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-2xl transition-all ${
            toast.type === 'success'
              ? 'border-emerald-700/50 bg-emerald-950 text-emerald-300'
              : 'border-rose-700/50 bg-rose-950 text-rose-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Preview modal ── */}
      {preview && (
        <PreviewModal
          document={preview}
          onClose={() => setPreview(null)}
          onApprove={onApprove}
          onReject={onReject}
          actionLoading={loadingMap[preview.id]
            ? (loadingMap[preview.id] as 'approve' | 'reject')
            : null}
        />
      )}

      {docs.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-800 text-slate-500">
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-base font-medium">Không có tài liệu chờ duyệt</p>
          <p className="text-sm">Tất cả tài liệu đã được xử lý.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3.5 font-medium">Tiêu đề</th>
                  <th className="px-5 py-3.5 font-medium">Người upload</th>
                  <th className="px-5 py-3.5 font-medium">Ngày upload</th>
                  <th className="px-5 py-3.5 font-medium">Số trang</th>
                  <th className="px-5 py-3.5 font-medium">Yêu cầu (điểm)</th>
                  <th className="px-5 py-3.5 font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="group transition-colors hover:bg-slate-900/60"
                  >
                    {/* Title — clickable to open preview */}
                    <td className="max-w-[260px] px-5 py-4">
                      <button
                        onClick={() => setPreview(doc)}
                        className="line-clamp-2 text-left font-medium text-sky-400 underline-offset-2 hover:underline"
                        title="Xem trước tài liệu"
                      >
                        {doc.title}
                      </button>
                    </td>

                    {/* Uploader email */}
                    <td className="px-5 py-4 text-slate-300">{doc.uploader.email}</td>

                    {/* Upload date */}
                    <td className="px-5 py-4 text-slate-400">{formatDate(doc.createdAt)}</td>

                    {/* Page count */}
                    <td className="px-5 py-4 text-slate-300">{doc.totalPages}</td>

                    {/* Points required */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-sky-950/60 px-2.5 py-0.5 text-xs font-medium text-sky-300 ring-1 ring-sky-800/50">
                        {doc.pointsRequired} điểm
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <RowActions
                        docId={doc.id}
                        onApprove={onApprove}
                        onReject={onReject}
                        rowLoading={loadingMap[doc.id] ?? null}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="border-t border-slate-800 bg-slate-900/60 px-5 py-3 text-xs text-slate-500">
            {docs.length} tài liệu đang chờ duyệt
          </div>
        </div>
      )}
    </>
  );
}

// ── Micro icon components ─────────────────────────────────────────────────────

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
