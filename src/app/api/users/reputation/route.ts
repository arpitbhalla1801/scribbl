import { NextRequest, NextResponse } from 'next/server';
import { getMyReputation } from '@/lib/reputation';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const result = await getMyReputation(request.headers);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'Sign-in required' ? 401 : 503 });
    }

    return NextResponse.json({ success: true, reputation: result.reputation });
  } catch (error) {
    logger.error('Error fetching reputation', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
