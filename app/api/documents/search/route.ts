import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 12;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q        = searchParams.get('q')?.trim()        ?? '';
    const category = searchParams.get('category')?.trim() ?? '';
    const sort     = searchParams.get('sort')             ?? 'latest';
    const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

    const where = {
      status: 'Approved' as const,
      ...(q && {
        OR: [
          { title:       { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
      ...(category && {
        category: { slug: category },
      }),
    };

    const orderBy =
      sort === 'most_viewed'
        ? { viewCount: 'desc' as const }
        : { createdAt: 'desc' as const };

    const [documents, total, categories] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
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
      prisma.document.count({ where }),
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return NextResponse.json({
      documents,
      categories,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    console.error('[documents/search] error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
