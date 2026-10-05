import { NextRequest, NextResponse } from 'next/server';
import { leaveCrew } from '@/lib/crews';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ crewId: string }> }
) {
  try {
    const { crewId } = await params;
    const result = await leaveCrew(request.headers, crewId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'Sign-in required' ? 401 : 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error leaving crew', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
