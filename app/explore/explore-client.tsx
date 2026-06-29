"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { buildThumbnailUrl } from './utils';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type DocResult = {
  id:             string;
  title:          string;
  slug:           string;
  previewPattern: string | null;
  totalPages:     number;
  viewCount:      number;
  downloadCount:  number;
  pointsRequired: number;
  createdAt:      string;
  category:  { name: string; slug: string };
  uploader:  { email: string };
};

type Category = { id: string; name: string; slug: string };

type Pagination = {
  page:       number;
  pageSize:   number;
  total:      number;
  totalPages: number;
};

type Props = {
  initialDocuments: DocResult[];
  initialTotal:     number;
  categories:       Category[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const SORT_OPTIONS = [
  { value: 'latest',      label: 'Mới nhất' },
  { value: 'most_viewed', label: 'Xem nhiều nhất' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

function buildQuery(q: string, category: string, sort: SortValue, page: number) {
  const params = new URLSearchParams();
  if (q)        params.set('q',        q);
  if (category) params.set('category', category);
  params.set('sort', sort);
  params.set('page', String(page));
  return params.toString();
}

/* ------------------------------------------------------------------ */
/*  Document card                                                       */
/* ------------------------------------------------------------------ */

function DocCard({ doc }: { doc: DocResult }) {
  const thumb = buildThumbnailUrl(doc.previewPattern);

  return (
    <Link
      href={`/documents/${doc.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition hover:border-sky-800/50 hover:bg-slate-900"
    >
      {/* Thumbnail */}
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-800">
        {thumb ? (
          <Image
            src={thumb}
            alt={`Trang 1 của ${doc.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-top transition duration-300 group-hover:scale-105"
          />
        ) : (
          /* Placeholder when no preview is available */
          <div className="flex h-full w-full items-center justify-center text-slate-600">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
        )}

        {/* Category badge */}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-950/75 px-2.5 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur-sm">
          {doc.category.name}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-slate-100 group-hover:text-white">
          {doc.title}
        </h3>

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            {/* Pages icon */}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {doc.totalPages} trang
          </span>
          <span className="flex items-center gap-1">
            {/* Views icon */}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {doc.viewCount.toLocaleString('vi-VN')}
          </span>
          <span className="flex items-center gap-1">
            {/* Downloads icon */}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {doc.downloadCount.toLocaleString('vi-VN')}
          </span>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-3">
          <span className="truncate text-xs text-slate-500">
            {doc.uploader.email.split('@')[0]}
          </span>
          <span className="ml-2 shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-950/60 px-2.5 py-0.5 text-xs font-medium text-sky-300 ring-1 ring-sky-800/40">
            {doc.pointsRequired === 0 ? 'Miễn phí' : `${doc.pointsRequired} điểm`}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton card (loading state)                                       */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
      <div className="h-40 w-full animate-pulse bg-slate-800" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-800" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-slate-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main client component                                               */
/* ------------------------------------------------------------------ */

export default function ExploreClient({ initialDocuments, initialTotal, categories }: Props) {
  const [query,    setQuery]    = useState('');
  const [category, setCategory] = useState('');
  const [sort,     setSort]     = useState<SortValue>('latest');
  const [page,     setPage]     = useState(1);

  const [docs,       setDocs]       = useState<DocResult[]>(initialDocuments);
  const [pagination, setPagination] = useState<Pagination>({
    page:       1,
    pageSize:   12,
    total:      initialTotal,
    totalPages: Math.ceil(initialTotal / 12),
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Debounce ref — holds the pending search query
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether this is the initial mount (skip fetch, use SSR data)
  const isFirstRender = useRef(true);

  /* ── Core search fetch ── */
  const fetchResults = useCallback(
    async (q: string, cat: string, s: SortValue, pg: number) => {
      setLoading(true);
      setError('');
      try {
        const qs  = buildQuery(q, cat, s, pg);
        const res = await fetch(`/api/documents/search?${qs}`);
        if (!res.ok) throw new Error('Search failed.');
        const data = await res.json();
        setDocs(data.documents);
        setPagination(data.pagination);
      } catch {
        setError('Không thể tải kết quả. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ── Debounce query changes ── */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchResults(query, category, sort, 1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /* ── Immediate re-fetch on filter/sort/page changes ── */
  useEffect(() => {
    if (isFirstRender.current) return; // guarded above already
    fetchResults(query, category, sort, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, page]);

  /* ── Handlers ── */
  const handleCategoryClick = (slug: string) => {
    const next = category === slug ? '' : slug;
    setCategory(next);
    setPage(1);
  };

  const handleSortChange = (value: SortValue) => {
    setSort(value);
    setPage(1);
  };

  /* ── Layout ── */
  return (
    <main className="min-h-screen bg-slate-950 pt-14 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">

        {/* ── Page header ── */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Valley</p>
          <h1 className="mt-1 text-3xl font-bold">Khám Phá Tài Liệu</h1>
          <p className="mt-2 text-sm text-slate-400">
            {pagination.total.toLocaleString('vi-VN')} tài liệu đã được kiểm duyệt và chia sẻ bởi cộng đồng.
          </p>
        </div>

        {/* ── Search bar ── */}
        <div className="relative mb-8">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm tài liệu theo tiêu đề hoặc mô tả…"
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 pl-12 pr-5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
              aria-label="Xóa tìm kiếm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Body: sidebar + grid ── */}
        <div className="flex gap-8">

          {/* ────────── Sidebar ────────── */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-20 space-y-6">

              {/* Sort */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Sắp xếp
                </p>
                <div className="space-y-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSortChange(opt.value)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                        sort === opt.value
                          ? 'bg-sky-950/60 text-sky-300 ring-1 ring-sky-800/40'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      {sort === opt.value && (
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                      )}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Danh mục
                  </p>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleCategoryClick('')}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                        category === ''
                          ? 'bg-sky-950/60 text-sky-300 ring-1 ring-sky-800/40'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      {category === '' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                      )}
                      Tất cả danh mục
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.slug)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                          category === cat.slug
                            ? 'bg-sky-950/60 text-sky-300 ring-1 ring-sky-800/40'
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        {category === cat.slug && (
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                        )}
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ────────── Main column ────────── */}
          <div className="min-w-0 flex-1">

            {/* Mobile filters row */}
            <div className="mb-5 flex flex-wrap items-center gap-2 lg:hidden">
              {/* Sort selector */}
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value as SortValue)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-600"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Category chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryClick('')}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    category === ''
                      ? 'bg-sky-600 text-white'
                      : 'border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.slug)}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      category === cat.slug
                        ? 'bg-sky-600 text-white'
                        : 'border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Result count + active filters */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                {loading ? (
                  <span className="animate-pulse">Đang tìm kiếm…</span>
                ) : (
                  <>
                    <span className="font-semibold text-white">
                      {pagination.total.toLocaleString('vi-VN')}
                    </span>{' '}
                    tài liệu
                    {query && (
                      <> cho <span className="italic text-slate-300">"{query}"</span></>
                    )}
                  </>
                )}
              </p>

              {/* Active filter pills */}
              <div className="flex flex-wrap gap-2">
                {query && (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    "{query}"
                    <button onClick={() => setQuery('')} className="text-slate-500 hover:text-white">×</button>
                  </span>
                )}
                {category && (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {categories.find((c) => c.slug === category)?.name ?? category}
                    <button onClick={() => { setCategory(''); setPage(1); }} className="text-slate-500 hover:text-white">×</button>
                  </span>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-xl border border-rose-800/40 bg-rose-900/20 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : docs.length === 0 ? (
              /* Empty state */
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-800 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-600">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-300">Không tìm thấy tài liệu bạn cần?</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Hãy tải lên tài liệu của bạn để cộng đồng cùng phát triển!
                  </p>
                </div>
                <Link
                  href="/upload"
                  className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
                >
                  Tải lên tài liệu
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {docs.map((doc) => <DocCard key={doc.id} doc={doc} />)}
              </div>
            )}

            {/* Pagination */}
            {!loading && pagination.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Trang trước"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    const cur = pagination.page;
                    return p === 1 || p === pagination.totalPages || Math.abs(p - cur) <= 1;
                  })
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('…');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-slate-600">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl border px-2 text-sm transition ${
                          pagination.page === p
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Trang tiếp"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
