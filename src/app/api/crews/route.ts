import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { createCrew, listMyCrews } from '@/lib/crews';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const crews = await listMyCrews(request.headers);
    return NextResponse.json({ success: true, crews });
  } catch (error) {
    logger.error('Error listing crews', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await apiRateLimiter(getClientIdentifier(request));
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const { name } = await request.json();
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed || trimmed.length > 40) {
      return NextResponse.json({ error: 'Crew name must be 1-40 characters' }, { status: 400 });
    }

    const result = await createCrew(request.headers, trimmed);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'Sign-in required' ? 401 : 400 });
    }

    return NextResponse.json({ success: true, crew: result.crew });
  } catch (error) {
    logger.error('Error creating crew', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
