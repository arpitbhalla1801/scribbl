import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { createInvite } from '@/lib/crews';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ crewId: string }> }
) {
  try {
    const rateLimitResult = await apiRateLimiter(getClientIdentifier(request));
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const { crewId } = await params;
    const result = await createInvite(request.headers, crewId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'Sign-in required' ? 401 : 400 });
    }

    return NextResponse.json({ success: true, code: result.code });
  } catch (error) {
    logger.error('Error creating crew invite', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
