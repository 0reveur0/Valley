"use client";

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

type DocumentViewerProps = {
  previewPattern: string;
  totalPages: number;
  isPremium: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
};

const PAGE_HEIGHT = 720;

export default function DocumentViewer({
  previewPattern,
  totalPages,
  isPremium,
  isOwner,
  isAuthenticated,
}: DocumentViewerProps) {
  const [visiblePages, setVisiblePages] = useState<number[]>(() => [1, 2, 3]);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set([1, 2, 3]));
  const containerRef = useRef<HTMLDivElement>(null);

  const canViewAll = isPremium || isOwner || (!isAuthenticated && false);

  const shouldBlurPage = (pageNumber: number) => {
    if (canViewAll) return false;
    return pageNumber > 3;
  };

  const pagesToRender = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [totalPages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY + window.innerHeight * 1.2;
      const nextVisible = pagesToRender.filter((page) => {
        const pageTop = (page - 1) * PAGE_HEIGHT;
        return pageTop < scrollTop;
      });

      const nextLoaded = new Set(loadedPages);
      nextVisible.slice(0, Math.min(nextVisible.length, 12)).forEach((page) => nextLoaded.add(page));
      setVisiblePages(nextVisible.slice(0, Math.min(nextVisible.length, 12)));
      setLoadedPages(nextLoaded);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadedPages, pagesToRender]);

  return (
    <div
      ref={containerRef}
      className="select-none space-y-8 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:p-6"
      onContextMenu={(event) => event.preventDefault()}
    >
      {pagesToRender.map((page) => {
        const isVisible = visiblePages.includes(page);
        const shouldBlur = shouldBlurPage(page);
        const isLoaded = loadedPages.has(page);

        if (!isVisible && !isLoaded) {
          return null;
        }

        const imageUrl = previewPattern.replace('{{page}}', String(page));

        return (
          <div key={page} className="relative mx-auto flex max-w-3xl flex-col items-center">
            <div className="mb-2 text-sm text-slate-400">Page {page}</div>
            <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg">
              {isLoaded ? (
                <>
                  <Image
                    src={imageUrl}
                    alt={`Document page ${page}`}
                    width={900}
                    height={1200}
                    className={`h-auto w-full object-contain ${shouldBlur ? 'blur-md' : ''}`}
                    loading="lazy"
                    unoptimized
                  />
                  {shouldBlur && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 px-6">
                      <div className="max-w-sm rounded-xl border border-sky-500/40 bg-slate-900/90 p-5 text-center shadow-2xl">
                        <p className="text-sm font-semibold text-sky-300">Paywall</p>
                        <p className="mt-2 text-sm text-slate-300">
                          Upgrade to Premium or upload your own document to unlock the rest of the pages.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-[720px] w-full items-center justify-center bg-slate-900 text-sm text-slate-400">
                  Loading page {page}...
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
