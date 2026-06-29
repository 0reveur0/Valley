import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const APPROVE_CREDIT_REWARD = 10;

type ReviewAction = 'APPROVE' | 'REJECT';

function isValidAction(value: unknown): value is ReviewAction {
  return value === 'APPROVE' || value === 'REJECT';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Auth guard ────────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Re-read role from DB so a stale JWT cannot bypass the guard
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (admin?.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // ── Input validation ──────────────────────────────────────────────────────
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const action = (body as Record<string, unknown>)?.action;
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "APPROVE" or "REJECT".' },
        { status: 400 }
      );
    }

    // ── Fetch document ────────────────────────────────────────────────────────
    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true, title: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    // ── APPROVE ───────────────────────────────────────────────────────────────
    if (action === 'APPROVE') {
      let rewarded = false;

      await prisma.$transaction(async (tx) => {
        // Conditional status transition — the WHERE clause on `status: 'Pending'`
        // is evaluated atomically inside the transaction.
        // If another request already changed the status, `count` will be 0 and
        // we skip all downstream writes, preventing duplicate rewards.
        const { count } = await tx.document.updateMany({
          where: { id: document.id, status: 'Pending' },
          data: { status: 'Approved' },
        });

        if (count === 0) {
          // Document was already reviewed by a concurrent request — abort quietly.
          return;
        }

        rewarded = true;

        // Reward the author only when we know the transition succeeded
        await tx.user.update({
          where: { id: document.userId },
          data: { credits: { increment: APPROVE_CREDIT_REWARD } },
        });

        await tx.transaction.create({
          data: {
            userId: document.userId,
            type: 'Upload_Reward',
            points: APPROVE_CREDIT_REWARD,
            amount: null,
            status: 'Completed',
          },
        });
      });

      if (!rewarded) {
        return NextResponse.json(
          { error: `Document is already reviewed. No action taken.` },
          { status: 409 }
        );
      }

      return NextResponse.json({
        message: `Document "${document.title}" approved. Author rewarded +${APPROVE_CREDIT_REWARD} credits.`,
        status: 'Approved',
      });
    }

    // ── REJECT ────────────────────────────────────────────────────────────────
    // Same pattern: conditional transition guards against APPROVE/REJECT races.
    const { count } = await prisma.document.updateMany({
      where: { id: document.id, status: 'Pending' },
      data: { status: 'Rejected' },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: `Document is already reviewed. No action taken.` },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: `Document "${document.title}" rejected.`,
      status: 'Rejected',
    });
  } catch (error) {
    console.error('[admin/review] error:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error.', code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
