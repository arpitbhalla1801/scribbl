import { NextRequest, NextResponse } from 'next/server';
import { cancelInvite, getInvite } from '@/lib/crews';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const invite = await getInvite(code);
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, invite });
  } catch (error) {
    logger.error('Error looking up crew invite', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const result = await cancelInvite(request.headers, code);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'Sign-in required' ? 401 : 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error cancelling crew invite', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
