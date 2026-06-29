import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };
  }
  return { session };
}

export async function requireRole(allowedRoles: Array<'Admin' | 'User'>) {
  const authResult = await requireAuth();
  if ('error' in authResult) {
    return authResult;
  }

  const { session } = authResult;
  if (!allowedRoles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
  }

  return { session };
}

export async function requirePremiumOrCredits(minCredits = 1) {
  const authResult = await requireAuth();
  if ('error' in authResult) {
    return authResult;
  }

  const { session } = authResult;
  if (session.user.membershipType === 'Premium') {
    return { session };
  }

  if (session.user.credits >= minCredits) {
    return { session };
  }

  return { error: NextResponse.json({ error: 'Not enough credits or premium access required.' }, { status: 403 }) };
}
