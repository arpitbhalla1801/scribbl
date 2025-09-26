"use client";

import React, { useCallback, useEffect, useRef } from 'react';
import { Tldraw, TLComponents, TLUiOverrides, Editor, track, useEditor } from 'tldraw';
import { GameState } from '@/lib/types';
import { TldrawSyncService } from '@/lib/tldrawSyncService';

interface TldrawCanvasProps {
  isDrawing: boolean;
  gameState?: GameState;
  roomId: string;
  playerId: string;
}

// Custom UI components - hide all page and extra UI, only show drawing tools
const components: TLComponents = {
  Toolbar: (props: React.ComponentProps<'div'>) => <div style={{ display: 'block' }}>{props.children}</div>,
  StylePanel: null,
  ActionsMenu: null,
  HelpMenu: null,
  ZoomMenu: null,
  MainMenu: null,
  Minimap: null,
  NavigationPanel: null,
  HelperButtons: null,
  // Hide page menu and page navigation (only valid keys)
  PageMenu: null,
};

// UI overrides to customize the interface
const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    // Only show pen/brush and eraser tools (no hand tool, so canvas can't be moved)
    return {
      draw: tools.draw, // pen/brush
      eraser: tools.eraser,
    };
  },
};

// Custom component to track editor changes and sync
const DrawingTracker = track(({ 
  syncService, 
  isDrawing, 
  gameState,
  onEditorReady 
}: { 
  syncService: TldrawSyncService;
  isDrawing: boolean;
  gameState?: GameState;
  onEditorReady?: (editor: Editor) => void;
}) => {
  const editor = useEditor();

  useEffect(() => {
    if (!editor) return;
    
    // Notify parent about editor
    onEditorReady?.(editor);

    // Set up sync service with editor
    syncService.setEditor(editor);
    syncService.setDrawingPermission(isDrawing);

    // Listen to changes in the store when drawing
    if (isDrawing) {
      const handleChange = () => {
        syncService.markForSync();
      };

      const unsubscribe = editor.store.listen(handleChange, { source: 'user', scope: 'all' });
      return () => unsubscribe();
    }
  }, [editor, isDrawing, syncService, onEditorReady]);

  // Apply snapshots from game state when not drawing
  useEffect(() => {
    if (!isDrawing && gameState) {
      syncService.applySnapshot(gameState);
    }
  }, [gameState, isDrawing, syncService]);

  // Clear canvas when starting a new turn (no tldraw snapshot)
  useEffect(() => {
    if (!gameState?.tldrawSnapshot && editor) {
      // Clear the canvas if there's no snapshot (new turn)
      const allShapeIds = editor.getCurrentPageShapeIds();
      if (allShapeIds.size > 0) {
        editor.deleteShapes([...allShapeIds]);
      }
    }
  }, [gameState?.tldrawSnapshot, editor]);

  return null;
});

export const TldrawCanvas: React.FC<TldrawCanvasProps> = ({
  isDrawing,
  gameState,
  roomId,
  playerId,
}) => {
  const editorRef = useRef<Editor | null>(null);
  const syncServiceRef = useRef<TldrawSyncService | null>(null);

  // Initialize sync service
  useEffect(() => {
    syncServiceRef.current = new TldrawSyncService(roomId, playerId);
    
    return () => {
      syncServiceRef.current?.cleanup();
    };
  }, [roomId, playerId]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    
    // Configure editor for drawing game
    editor.updateInstanceState({
      isToolLocked: false,
      isPenMode: false,
      isGridMode: false,
    });

    // Set default tool based on drawing permission
    if (isDrawing) {
      editor.setCurrentTool('draw');
    } else {
      editor.setCurrentTool('hand');
    }
  }, [isDrawing]);

  // Handle read-only state when not drawing
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    
    if (!isDrawing) {
      // Make canvas read-only
      editor.setCurrentTool('hand');
      // Disable all drawing interactions
      editor.updateInstanceState({
        isReadonly: true
      });
    } else {
      // Enable drawing
      editor.updateInstanceState({
        isReadonly: false
      });
      editor.setCurrentTool('draw');
    }
  }, [isDrawing]);

  if (!syncServiceRef.current) {
    return <div>Loading...</div>;
  }

  return (
    <div className="tldraw-container w-full h-full">
      <Tldraw
        onMount={handleMount}
        components={components}
        overrides={uiOverrides}
        autoFocus={isDrawing}
      >
        <DrawingTracker 
          syncService={syncServiceRef.current}
          isDrawing={isDrawing}
          gameState={gameState}
        />
      </Tldraw>
    </div>
  );
};

export default TldrawCanvas;
