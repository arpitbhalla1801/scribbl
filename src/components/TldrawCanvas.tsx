"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tldraw, TLComponents, TLUiOverrides, Editor, track, useEditor, DefaultColorStyle, DefaultSizeStyle, inlineBase64AssetStore } from 'tldraw';
import { useSync } from '@tldraw/sync';
import { GameState } from '@/lib/types';

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
  QuickActions: null, // Hide the undo/redo/delete buttons
  ContextMenu: null, // Hide right-click menu
  KeyboardShortcutsDialog: null,
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
    { value: 'black', hex: '#1B1B2F', label: 'Black' },
    { value: 'red', hex: '#FF4D4D', label: 'Red' },
    { value: 'blue', hex: '#3E7CFF', label: 'Blue' },
    { value: 'green', hex: '#22C55E', label: 'Green' },
    { value: 'yellow', hex: '#FFB800', label: 'Yellow' },
    { value: 'violet', hex: '#9B5DE5', label: 'Purple' },
    { value: 'light-red', hex: '#FF8FA3', label: 'Pink' },
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

  const handleUndo = () => {
    if (!editor || !isDrawing) return;
    editor.undo();
  };

  const handleRedo = () => {
    if (!editor || !isDrawing) return;
    editor.redo();
  };

  if (!isDrawing) return null;

  const toolBtn = (active: boolean): React.CSSProperties =>
    active
      ? { background: 'var(--marker-blue)', color: '#fff' }
      : { background: 'var(--paper-dim)', color: 'var(--text-primary)' };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <div
        className="rounded-2xl px-3 py-2 border-2"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--ink)', boxShadow: '0 3px 0 0 var(--ink)' }}
      >
        <div className="flex items-center gap-3">
          {/* Tools Section */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleToolChange('draw')}
              className="p-1.5 rounded-lg transition-colors"
              style={toolBtn(currentTool === 'draw')}
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
              className="p-1.5 rounded-lg transition-colors"
              style={toolBtn(currentTool === 'eraser')}
              title="Eraser Tool"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path>
                <path d="M22 21H7"></path>
                <path d="m5 11 9 9"></path>
              </svg>
            </button>
          </div>

          <div className="h-6 w-px" style={{ background: 'var(--card-border)' }}></div>

          {/* Colors Section */}
          <div className="flex items-center gap-1.5">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorChange(color.value)}
                className={`w-6 h-6 rounded-full transition-all border-2 ${
                  currentColor === color.value ? 'scale-110' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: color.hex,
                  borderColor: currentColor === color.value ? 'var(--marker-blue)' : color.value === 'white' ? '#e5e7eb' : 'transparent',
                }}
                title={color.label}
              />
            ))}
          </div>

          <div className="h-6 w-px" style={{ background: 'var(--card-border)' }}></div>

          {/* Size Section */}
          <div className="flex items-center gap-1">
            {sizes.map((size) => (
              <button
                key={size.value}
                onClick={() => handleSizeChange(size.value)}
                className="w-8 h-6 rounded-lg flex items-center justify-center transition-colors"
                style={toolBtn(currentSize === size.value)}
                title={size.label}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: size.display, height: size.display }}
                />
              </button>
            ))}
          </div>

          <div className="h-6 w-px" style={{ background: 'var(--card-border)' }}></div>

          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--paper-dim)', color: 'var(--text-primary)' }}
              title="Undo (Ctrl+Z)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6"></path>
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path>
              </svg>
            </button>
            <button
              onClick={handleRedo}
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--paper-dim)', color: 'var(--text-primary)' }}
              title="Redo (Ctrl+Y)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 7v6h-6"></path>
                <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"></path>
              </svg>
            </button>
          </div>

          <div className="h-6 w-px" style={{ background: 'var(--card-border)' }}></div>

          {/* Clear Button */}
          <button
            onClick={handleClearAll}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--danger-light)', color: 'var(--marker-red)' }}
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

// Clears the shared canvas once per turn. Only the drawer has write access
// to the synced store (enforced server-side in server.js), so this is the
// one client that's actually allowed to wipe it - everyone else just sees
// the deletion arrive over the sync connection.
const DrawingTracker = track(({
  isDrawing,
  turnKey,
  onEditorReady,
}: {
  isDrawing: boolean;
  turnKey: number;
  onEditorReady?: (editor: Editor) => void;
}) => {
  const editor = useEditor();
  const clearedForTurn = useRef<number | null>(null);

  useEffect(() => {
    if (!editor) return;
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || !isDrawing || clearedForTurn.current === turnKey) return;
    clearedForTurn.current = turnKey;
    const allShapeIds = editor.getCurrentPageShapeIds();
    if (allShapeIds.size > 0) {
      editor.deleteShapes([...allShapeIds]);
    }
  }, [editor, isDrawing, turnKey]);

  return null;
});

export const TldrawCanvas: React.FC<TldrawCanvasProps> = ({
  isDrawing,
  gameState,
  roomId,
  playerId,
}) => {
  const editorRef = useRef<Editor | null>(null);

  // Drawing rights are decided server-side, from the game state, at the
  // moment the socket connects (see the /api/connect upgrade handler in
  // server.js) - not by anything the client sends. So when isDrawing flips
  // (new turn, new drawer), the store below is remounted via `key` to force
  // a fresh connection and get re-checked permissions.
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
  const uri = typeof window !== 'undefined'
    ? `${proto}://${window.location.host}/api/connect/${roomId}?playerId=${playerId}`
    : '';
  const store = useSync({ uri, assets: inlineBase64AssetStore });

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

  return (
    <div className="tldraw-container w-full h-full relative">
      <Tldraw
        store={store}
        onMount={handleMount}
        components={components}
        overrides={uiOverrides}
        autoFocus={isDrawing}
      >
        <DrawingTracker
          isDrawing={isDrawing}
          turnKey={gameState?.currentTurn ?? 0}
        />
      </Tldraw>
      <DrawingControls editor={editorRef.current} isDrawing={isDrawing} />
    </div>
  );
};

export default TldrawCanvas;
