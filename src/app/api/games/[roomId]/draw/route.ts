import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { DrawingUpdate } from '@/lib/types';
import { drawRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { validateRoomId } from '@/lib/validation';

// Max size for tldraw snapshots (1MB)
const MAX_SNAPSHOT_SIZE = 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    // Validate roomId
    if (!validateRoomId(roomId)) {
      return NextResponse.json(
        { error: 'Invalid room ID format' },
        { status: 400 }
      );
    }

    const body: DrawingUpdate = await request.json();

    // Validate input
    if (!body.playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Rate limiting - use playerId for per-player limits on drawing
    const rateLimitId = body.playerId || getClientIdentifier(request);
    const rateLimitResult = drawRateLimiter(rateLimitId);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many draw requests. Please slow down.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
          }
        }
      );
    }

    if (!['stroke', 'clear', 'tldraw_snapshot'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid update type' },
        { status: 400 }
      );
    }

    // Validate snapshot size to prevent DoS
    if (body.type === 'tldraw_snapshot' && body.tldrawSnapshot) {
      const snapshotSize = JSON.stringify(body.tldrawSnapshot).length;
      if (snapshotSize > MAX_SNAPSHOT_SIZE) {
        return NextResponse.json(
          { error: 'Drawing data too large' },
          { status: 413 }
        );
      }
    }

    // Update the drawing
    const result = GameManager.updateDrawing(roomId, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const game = GameManager.getGame(roomId);

    return NextResponse.json({
      success: true,
      gameState: game
    });

  } catch (error) {
    console.error('Error updating drawing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
