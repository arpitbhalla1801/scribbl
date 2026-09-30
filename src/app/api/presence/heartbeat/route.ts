import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { auth } from '@/lib/auth';
import { heartbeat } from '@/lib/presence';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await apiRateLimiter(getClientIdentifier(request));
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
    }

    await heartbeat(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error recording presence heartbeat', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
