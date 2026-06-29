import { prisma } from '@/lib/prisma';
import Navbar from '@/components/navbar';
import ExploreClient from './explore-client';

export const dynamic = 'force-dynamic';

async function getInitialData() {
  const [documents, total, categories] = await Promise.all([
    prisma.document.findMany({
      where: { status: 'Approved' },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id:             true,
        title:          true,
        slug:           true,
        previewPattern: true,
        totalPages:     true,
        viewCount:      true,
        downloadCount:  true,
        pointsRequired: true,
        createdAt:      true,
        category:  { select: { name: true, slug: true } },
        uploader:  { select: { email: true } },
      },
    }),
    prisma.document.count({ where: { status: 'Approved' } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return { documents, total, categories };
}

export default async function ExplorePage() {
  const { documents, total, categories } = await getInitialData();

  return (
    <>
      <Navbar />
      <ExploreClient
        initialDocuments={documents.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        }))}
        initialTotal={total}
        categories={categories}
      />
    </>
  );
}
