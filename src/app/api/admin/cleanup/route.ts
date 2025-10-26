import { NextRequest, NextResponse } from 'next/server';
import { triggerCleanup } from '@/lib/cleanupService';

export async function POST(request: NextRequest) {
  try {
    // In production, you'd want to add authentication here
    // For now, this is an internal endpoint
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_API_TOKEN || 'dev-token';
    
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
