import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Await params — required in Next.js 15 App Router
    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { uploader: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const isAdmin = currentUser.role === 'Admin';
    const isAuthor = document.userId === currentUser.id;

    // Block downloads of non-approved documents.
    // Admins and the document's own author can still access their own content
    // regardless of moderation status (e.g. to verify a pending upload).
    if (document.status !== 'Approved' && !isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: 'Tài liệu này chưa được phê duyệt.' },
        { status: 403 }
      );
    }

    // Step 1 — Check if the user is Premium or the document's own author.
    // Either condition bypasses all credit logic.
    const isPremium = currentUser.membershipType === 'Premium';

    if (!isPremium && !isAuthor) {
      // Step 2 — Free user: deduct credits atomically inside a transaction.
      //
      // The WHERE clause `credits: { gte: pointsRequired }` means Prisma emits
      // a single conditional UPDATE … WHERE credits >= $cost.
      // If no row is matched (credits were too low or a concurrent request already
      // drained them) Prisma throws P2025, which we catch and convert to a 402.
      // This prevents any race-condition / double-spend.
      try {
        await prisma.$transaction(async (tx) => {
          // Atomically decrement — only succeeds when current balance is sufficient
          await tx.user.update({
            where: {
              id: currentUser.id,
              credits: { gte: document.pointsRequired },
            },
            data: { credits: { decrement: document.pointsRequired } },
          });

          // Reward the author
          await tx.user.update({
            where: { id: document.userId },
            data: { credits: { increment: 2 } },
          });

          // Record the download cost for the downloader
          await tx.transaction.create({
            data: {
              userId: currentUser.id,
              type: 'Download_Cost',
              points: -document.pointsRequired,
              amount: null,
              status: 'Completed',
            },
          });

          // Record the upload reward for the author
          await tx.transaction.create({
            data: {
              userId: document.userId,
              type: 'Upload_Reward',
              points: 2,
              amount: null,
              status: 'Completed',
            },
          });
        });
      } catch (err) {
        // P2025 = "Record to update not found" — our proxy for insufficient credits
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          return NextResponse.json(
            {
              error: 'Bạn không đủ điểm để tải tài liệu này',
              code: 'INSUFFICIENT_CREDITS',
            },
            { status: 402 }
          );
        }
        throw err; // re-throw unexpected errors
      }
    }

    // Step 3 — Increment the document's download counter and return the file URL.
    await prisma.document.update({
      where: { id: document.id },
      data: { downloadCount: { increment: 1 } },
    });

    return NextResponse.json({
      message: 'Download request processed successfully.',
      downloadUrl: document.fileUrl,
      document: {
        id: document.id,
        title: document.title,
        pointsRequired: document.pointsRequired,
      },
    });
  } catch (error) {
    console.error('Download request error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
