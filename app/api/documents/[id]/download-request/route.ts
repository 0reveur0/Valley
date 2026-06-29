import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: { uploader: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const isPremium = currentUser.membershipType === 'Premium';
    const isAuthor = document.userId === currentUser.id;

    let downloadUrl = document.fileUrl;
    let transactionType: 'Download_Cost' | 'Upload_Reward' | 'Subscription_Purchase' = 'Download_Cost';

    if (!isPremium && !isAuthor) {
      if (currentUser.credits < document.pointsRequired) {
        return NextResponse.json(
          {
            error: 'Bạn không đủ điểm để tải tài liệu này',
            code: 'INSUFFICIENT_CREDITS',
          },
          { status: 402 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: currentUser.id },
          data: { credits: { decrement: document.pointsRequired } },
        });

        await tx.user.update({
          where: { id: document.userId },
          data: { credits: { increment: 2 } },
        });

        await tx.transaction.create({
          data: {
            userId: currentUser.id,
            type: 'Download_Cost',
            points: -document.pointsRequired,
            amount: null,
            status: 'Completed',
          },
        });

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
    }

    await prisma.document.update({
      where: { id: document.id },
      data: { downloadCount: { increment: 1 } },
    });

    return NextResponse.json({
      message: 'Download request processed successfully.',
      downloadUrl,
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
