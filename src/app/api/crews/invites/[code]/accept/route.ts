import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { acceptInvite } from '@/lib/crews';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const rateLimitResult = await apiRateLimiter(getClientIdentifier(request));
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const { code } = await params;
    const result = await acceptInvite(request.headers, code);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'Sign-in required' ? 401 : 400 });
    }

    return NextResponse.json({ success: true, crewId: result.crewId });
  } catch (error) {
    logger.error('Error accepting crew invite', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
