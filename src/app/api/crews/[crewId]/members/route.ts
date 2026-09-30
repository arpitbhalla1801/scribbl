import { NextRequest, NextResponse } from 'next/server';
import { listCrewMembers } from '@/lib/crews';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ crewId: string }> }
) {
  try {
    const { crewId } = await params;
    const result = await listCrewMembers(request.headers, crewId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'Sign-in required' ? 401 : 403 });
    }

    return NextResponse.json({ success: true, members: result.members });
  } catch (error) {
    logger.error('Error listing crew members', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
