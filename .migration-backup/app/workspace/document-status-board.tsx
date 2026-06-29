"use client";

import { useState } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkspaceDocument = {
  id: string;
  title: string;
  totalPages: number;
  pointsRequired: number;
  viewCount: number;
  downloadCount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason: string | null;
  createdAt: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)  return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${days} ngày trước`;
}

// ── Rejection detail modal ────────────────────────────────────────────────────

function RejectionModal({
  doc,
  onClose,
}: {
  doc: WorkspaceDocument;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-rose-900/50 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-950/60 px-2.5 py-0.5 text-xs font-medium text-rose-400 ring-1 ring-rose-800/40">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Bị từ chối
            </span>
            <h3 className="mt-2 text-base font-semibold text-white">{doc.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-rose-900/30 bg-rose-950/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-rose-400">Lý do từ chối</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {doc.rejectionReason || 'Nội dung không phù hợp với tiêu chuẩn cộng đồng của Valley.'}
          </p>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Hãy chỉnh sửa nội dung theo phản hồi trên và thử tải lên lại.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
          >
            Đóng
          </button>
          <Link
            href="/upload"
            onClick={onClose}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
          >
            Tải lên lại
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Document card ─────────────────────────────────────────────────────────────

function DocCard({
  doc,
  onRejectedClick,
}: {
  doc: WorkspaceDocument;
  onRejectedClick?: (doc: WorkspaceDocument) => void;
}) {
  const isRejected = doc.status === 'Rejected';
  const isApproved = doc.status === 'Approved';

  return (
    <div
      onClick={() => isRejected && onRejectedClick?.(doc)}
      className={`group rounded-xl border bg-slate-950/60 p-4 transition ${
        isRejected
          ? 'cursor-pointer border-rose-900/40 hover:border-rose-700/60 hover:bg-rose-950/10'
          : 'border-slate-800/60 hover:border-slate-700'
      }`}
    >
      <p className="line-clamp-2 text-sm font-medium text-slate-100 group-hover:text-white">
        {doc.title}
      </p>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{doc.totalPages} trang</span>
        <span>{doc.pointsRequired} điểm</span>
        <span>{timeAgo(doc.createdAt)}</span>
      </div>

      {isApproved && (
        <div className="mt-3 flex gap-3 border-t border-slate-800/60 pt-3 text-xs text-slate-400">
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
      )}

      {isRejected && (
        <p className="mt-2 text-xs text-rose-400/70 group-hover:text-rose-400">
          Nhấn để xem lý do từ chối →
        </p>
      )}
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

type ColumnConfig = {
  status: 'Pending' | 'Approved' | 'Rejected';
  label: string;
  accent: string;
  dot: string;
  headerBg: string;
};

const COLUMNS: ColumnConfig[] = [
  {
    status: 'Pending',
    label: 'Chờ duyệt',
    accent: 'text-amber-400',
    dot: 'bg-amber-400',
    headerBg: 'bg-amber-950/30 border-amber-800/30',
  },
  {
    status: 'Approved',
    label: 'Đã xuất bản',
    accent: 'text-emerald-400',
    dot: 'bg-emerald-400',
    headerBg: 'bg-emerald-950/30 border-emerald-800/30',
  },
  {
    status: 'Rejected',
    label: 'Bị từ chối',
    accent: 'text-rose-400',
    dot: 'bg-rose-400',
    headerBg: 'bg-rose-950/30 border-rose-800/30',
  },
];

// ── Main board ────────────────────────────────────────────────────────────────

export default function DocumentStatusBoard({ documents }: { documents: WorkspaceDocument[] }) {
  const [rejectedDoc, setRejectedDoc] = useState<WorkspaceDocument | null>(null);

  const byStatus = (status: WorkspaceDocument['status']) =>
    documents.filter((d) => d.status === status);

  return (
    <>
      {rejectedDoc && (
        <RejectionModal doc={rejectedDoc} onClose={() => setRejectedDoc(null)} />
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const docs = byStatus(col.status);
          return (
            <section key={col.status} className="flex flex-col gap-3">
              {/* Column header */}
              <div className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <span className={`text-sm font-semibold ${col.accent}`}>{col.label}</span>
                </div>
                <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-slate-400">
                  {docs.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3">
                {docs.length === 0 ? (
                  <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-600">
                    Không có tài liệu
                  </div>
                ) : (
                  docs.map((doc) => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      onRejectedClick={setRejectedDoc}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
