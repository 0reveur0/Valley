import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const DAILY_REWARD_POINTS = 2;

/** Normalise "today" to a midnight-UTC Date so @db.Date comparisons are stable. */
function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/* ------------------------------------------------------------------ */
/*  GET /api/user/daily-checkin                                        */
/*  Returns whether the current user has already checked in today.    */
/* ------------------------------------------------------------------ */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.userDailyCheckin.findUnique({
    where: {
      userId_checkedInDate: {
        userId: session.user.id,
        checkedInDate: todayUTC(),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ checkedInToday: existing !== null });
}

/* ------------------------------------------------------------------ */
/*  POST /api/user/daily-checkin                                       */
/*  Creates a check-in record and awards 2 credits atomically.        */
/*  Idempotent: concurrent requests that slip past the pre-check      */
/*  hit the DB @@unique constraint (P2002) and receive 400, not 500.  */
/* ------------------------------------------------------------------ */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const today = todayUTC();

  try {
    // Attempt the full transaction optimistically — no pre-read needed.
    // If the unique constraint fires (concurrent double-submit), Prisma
    // throws P2002 which we catch below.
    const [, updatedUser] = await prisma.$transaction([
      prisma.userDailyCheckin.create({
        data: { userId, checkedInDate: today },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: DAILY_REWARD_POINTS } },
        select: { credits: true },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'Daily_Reward',
          points: DAILY_REWARD_POINTS,
          status: 'Completed',
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Điểm danh thành công!',
      newCredits: updatedUser.credits,
      pointsEarned: DAILY_REWARD_POINTS,
    });
  } catch (err) {
    // Unique constraint violation — user already checked in today
    // (either via a prior request or a concurrent race)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Hôm nay bạn đã nhận điểm rồi, quay lại vào ngày mai nhé!' },
        { status: 400 },
      );
    }
    console.error('[daily-checkin POST]', err);
    return NextResponse.json({ error: 'Lỗi máy chủ. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
