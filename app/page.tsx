import UploadDocument from '@/components/upload-document';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <div className="max-w-3xl text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-sky-400">Valley</p>
        <h1 className="text-4xl font-semibold sm:text-6xl">Share knowledge. Unlock documents.</h1>
        <p className="mt-6 text-lg text-slate-300">
          Upload PDF documents securely to Cloudinary and store metadata in Prisma.
        </p>
      </div>

      <div className="mt-10 w-full max-w-3xl">
        <UploadDocument />
      </div>
    </main>
  );
}
