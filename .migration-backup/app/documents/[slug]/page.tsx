import DocumentViewer from '@/components/document-viewer';
import DownloadButton from '@/components/download-button';

type DocumentPageProps = {
  params: { slug: string };
};

const mockDocument = {
  title: 'Introduction to Distributed Systems',
  author: 'Jane Doe',
  slug: 'introduction-to-distributed-systems',
  previewPattern: 'https://res.cloudinary.com/demo/image/upload/sample-page-{{page}}.jpg',
  totalPages: 12,
  viewCount: 1240,
  downloadCount: 89,
  pointsRequired: 5,
  isPremium: false,
  isOwner: false,
  isAuthenticated: false,
};

export default function DocumentDetailPage({ params }: DocumentPageProps) {
  const document = {
    ...mockDocument,
    slug: params.slug,
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 md:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[7fr_3fr]">
        <DocumentViewer
          previewPattern={document.previewPattern}
          totalPages={document.totalPages}
          isPremium={document.isPremium}
          isOwner={document.isOwner}
          isAuthenticated={document.isAuthenticated}
        />

        <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-400">Document</p>
              <h1 className="mt-2 text-2xl font-semibold">{document.title}</h1>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Author</p>
              <p className="mt-1 font-medium">{document.author}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Pages</p>
                <p className="mt-1 text-lg font-semibold">{document.totalPages}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Views</p>
                <p className="mt-1 text-lg font-semibold">{document.viewCount}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Downloads</p>
                <p className="mt-1 text-lg font-semibold">{document.downloadCount}</p>
              </div>
            </div>

            <DownloadButton documentId={document.slug} label={`Tải tài liệu bằng ${document.pointsRequired} credits`} pointsRequired={document.pointsRequired} />

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <p className="font-medium text-slate-100">Premium access</p>
              <p className="mt-2">
                Unlock the full document and remove blur from all remaining pages.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
