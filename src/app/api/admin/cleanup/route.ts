import { NextRequest, NextResponse } from 'next/server';
import { triggerCleanup } from '@/lib/cleanupService';

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.CLEANUP_API_TOKEN;

    // Refuse rather than fall back to a known default - a deploy that
    // forgets to set CLEANUP_API_TOKEN should not silently expose this
    // endpoint to anyone who reads the source. Set CLEANUP_API_TOKEN
    // locally to use this endpoint in development too.
    if (!expectedToken) {
      console.error('CLEANUP_API_TOKEN is not set; refusing cleanup request');
      return NextResponse.json(
        { error: 'Cleanup endpoint is not configured' },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    triggerCleanup();

    return NextResponse.json({
      success: true,
      message: 'Cleanup triggered successfully'
    });

  } catch (error) {
    console.error('Error triggering cleanup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
