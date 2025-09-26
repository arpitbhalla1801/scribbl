"use client";

import { Editor } from 'tldraw';
import { GameState } from './types';

export class TldrawSyncService {
  private editor: Editor | null = null;
  private roomId: string;
  private playerId: string;
  private isDrawing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;
  private syncDelay: number = 500; // Sync every 500ms when drawing
  private pendingSync: boolean = false;

  constructor(roomId: string, playerId: string) {
    this.roomId = roomId;
    this.playerId = playerId;
  }

  setEditor(editor: Editor) {
    this.editor = editor;
  }

  setDrawingPermission(isDrawing: boolean) {
    this.isDrawing = isDrawing;
    
    if (isDrawing) {
      this.startSyncing();
    } else {
      this.stopSyncing();
    }
  }

  private startSyncing() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (this.pendingSync && this.editor) {
        this.syncSnapshot();
      }
    }, this.syncDelay);
  }

  private stopSyncing() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  markForSync() {
    if (this.isDrawing) {
      this.pendingSync = true;
    }
  }

  private async syncSnapshot() {
    if (!this.editor || !this.isDrawing) return;
    
    try {
      const snapshot = this.editor.store.getSnapshot();
      
      const response = await fetch(`/api/games/${this.roomId}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: this.playerId,
          type: 'tldraw_snapshot',
          tldrawSnapshot: snapshot,
        }),
      });

      if (!response.ok) {
        console.error('Failed to sync drawing:', await response.text());
        return;
      }

      this.pendingSync = false;
      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('Error syncing drawing:', error);
    }
  }

  // Apply snapshot from game state (for viewers)
  applySnapshot(gameState: GameState) {
    if (!this.editor || this.isDrawing) return; // Don't apply if we're the one drawing
    
    const tldrawSnapshot = gameState.tldrawSnapshot;
    if (!tldrawSnapshot) return;

    // Only apply if this snapshot is newer than what we have
    if (tldrawSnapshot.timestamp > this.lastSyncTime) {
      try {
        this.editor.store.loadSnapshot(tldrawSnapshot.snapshot);
        this.lastSyncTime = tldrawSnapshot.timestamp;
      } catch (error) {
        console.error('Error applying snapshot:', error);
      }
    }
  }

  // Clear the canvas
  async clearCanvas() {
    if (!this.isDrawing) return;

    try {
      const response = await fetch(`/api/games/${this.roomId}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: this.playerId,
          type: 'clear',
        }),
      });

      if (!response.ok) {
        console.error('Failed to clear canvas:', await response.text());
        return;
      }

      // Clear local canvas
      if (this.editor) {
        this.editor.selectAll();
        this.editor.deleteShapes(this.editor.getSelectedShapeIds());
      }
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
  }

  cleanup() {
    this.stopSyncing();
    this.editor = null;
  }
}
