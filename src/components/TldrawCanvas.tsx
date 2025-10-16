"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tldraw, TLComponents, TLUiOverrides, Editor, track, useEditor, StyleProp, DefaultColorStyle, DefaultSizeStyle } from 'tldraw';
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
  Toolbar: null, // We'll create our own custom toolbar
  StylePanel: null,
  ActionsMenu: null,
  HelpMenu: null,
  ZoomMenu: null,
  MainMenu: null,
  Minimap: null,
  NavigationPanel: null,
  HelperButtons: null,
  PageMenu: null,
};

// UI overrides to customize the interface
const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    // Only show pen/brush and eraser tools
    return {
      draw: tools.draw,
      eraser: tools.eraser,
    };
  },
};

// Custom Drawing Controls Component
const DrawingControls = ({ editor, isDrawing }: { editor: Editor | null; isDrawing: boolean }) => {
  type TldrawColor = 'black' | 'red' | 'blue' | 'green' | 'yellow' | 'violet' | 'light-red' | 'white' | 'grey' | 'light-blue' | 'light-green' | 'light-violet' | 'orange';
  type TldrawSize = 's' | 'm' | 'l' | 'xl';
  
  const [currentColor, setCurrentColor] = useState<TldrawColor>('black');
  const [currentSize, setCurrentSize] = useState<TldrawSize>('m');
  const [currentTool, setCurrentTool] = useState<'draw' | 'eraser'>('draw');

  const colors: Array<{ value: TldrawColor; hex: string; label: string }> = [
    { value: 'black', hex: '#000000', label: 'Black' },
    { value: 'red', hex: '#EF4444', label: 'Red' },
    { value: 'blue', hex: '#3B82F6', label: 'Blue' },
    { value: 'green', hex: '#10B981', label: 'Green' },
    { value: 'yellow', hex: '#F59E0B', label: 'Yellow' },
    { value: 'violet', hex: '#8B5CF6', label: 'Purple' },
    { value: 'light-red', hex: '#EC4899', label: 'Pink' },
    { value: 'white', hex: '#FFFFFF', label: 'White' },
  ];

  const sizes: Array<{ value: TldrawSize; label: string; display: string }> = [
    { value: 's', label: 'Small', display: '4px' },
    { value: 'm', label: 'Medium', display: '8px' },
    { value: 'l', label: 'Large', display: '12px' },
    { value: 'xl', label: 'X-Large', display: '16px' },
  ];

  useEffect(() => {
    if (!editor || !isDrawing) return;

    // Set the initial tool
    editor.setCurrentTool(currentTool);
    
    // Update user preferences for default color
    editor.user.updateUserPreferences({
      color: currentColor,
    });

    // Set the styles for next shapes
    editor.setStyleForNextShapes(DefaultColorStyle, currentColor);
    editor.setStyleForNextShapes(DefaultSizeStyle, currentSize);
  }, [editor, isDrawing, currentColor, currentSize, currentTool]);

  const handleColorChange = (color: TldrawColor) => {
    if (!editor || !isDrawing) return;
    setCurrentColor(color);
    
    // Update user preferences and current style
    editor.user.updateUserPreferences({ color });
    
    // Update the shared styles that affect new shapes
    editor.setStyleForNextShapes(DefaultColorStyle, color);
    
    // Switch to draw tool when selecting a color
    if (currentTool === 'eraser') {
      setCurrentTool('draw');
      editor.setCurrentTool('draw');
    }
  };

  const handleSizeChange = (size: TldrawSize) => {
    if (!editor || !isDrawing) return;
    setCurrentSize(size);
    
    // Update the shared styles that affect new shapes
    editor.setStyleForNextShapes(DefaultSizeStyle, size);
  };

  const handleToolChange = (tool: 'draw' | 'eraser') => {
    if (!editor || !isDrawing) return;
    setCurrentTool(tool);
    editor.setCurrentTool(tool);
  };

  const handleClearAll = () => {
    if (!editor || !isDrawing) return;
    
    const allShapeIds = editor.getCurrentPageShapeIds();
    if (allShapeIds.size > 0) {
      editor.deleteShapes([...allShapeIds]);
    }
  };

  if (!isDrawing) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Tools Section */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleToolChange('draw')}
              className={`p-1.5 rounded transition-colors ${
                currentTool === 'draw'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Pen Tool"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                <path d="M2 2l7.586 7.586"></path>
              </svg>
            </button>
            <button
              onClick={() => handleToolChange('eraser')}
              className={`p-1.5 rounded transition-colors ${
                currentTool === 'eraser'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Eraser Tool"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path>
                <path d="M22 21H7"></path>
                <path d="m5 11 9 9"></path>
              </svg>
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

          {/* Colors Section */}
          <div className="flex items-center gap-1.5">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorChange(color.value)}
                className={`w-6 h-6 rounded-full transition-all ${
                  currentColor === color.value
                    ? 'ring-2 ring-blue-500 ring-offset-1 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ 
                  backgroundColor: color.hex,
                  border: color.value === 'white' ? '2px solid #e5e7eb' : 'none'
                }}
                title={color.label}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

          {/* Size Section */}
          <div className="flex items-center gap-1">
            {sizes.map((size) => (
              <button
                key={size.value}
                onClick={() => handleSizeChange(size.value)}
                className={`w-8 h-6 rounded flex items-center justify-center transition-colors ${
                  currentSize === size.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={size.label}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: size.display, height: size.display }}
                />
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

          {/* Clear Button */}
          <button
            onClick={handleClearAll}
            className="p-1.5 rounded bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            title="Clear All"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
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
    <div className="tldraw-container w-full h-full relative">
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
      <DrawingControls editor={editorRef.current} isDrawing={isDrawing} />
    </div>
  );
};

export default TldrawCanvas;
