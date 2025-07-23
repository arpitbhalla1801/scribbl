"use client";

import { useRef, useState, useEffect } from "react";
import { GameState, DrawingUpdate, DrawingStroke } from "@/lib/types";

interface CanvasProps {
  isDrawing: boolean;
  onDrawingChange?: (imageData: string, update: DrawingUpdate) => void;
  gameState?: GameState;
}

const Canvas: React.FC<CanvasProps> = ({ isDrawing, onDrawingChange, gameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingNow, setIsDrawingNow] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  
  const colors = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];
  const brushSizes = [1, 3, 5, 8, 12];
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
      
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setCtx(context);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  // Effect to render drawing strokes from game state
  useEffect(() => {
    if (!ctx || !gameState) return;
    
    // Clear canvas first
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    
    // Render all strokes from game state
    gameState.drawing.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.beginPath();
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.color;
      
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [ctx, gameState?.drawing]);
  
  const clearCanvas = () => {
    if (!ctx || !canvasRef.current || !isDrawing) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    if (onDrawingChange && canvasRef.current) {
      const clearUpdate: DrawingUpdate = {
        playerId: '', // Will be set by the calling component
        type: 'clear'
      };
      onDrawingChange(canvasRef.current.toDataURL(), clearUpdate);
    }
  };
  
  const startDrawing = (x: number, y: number) => {
    if (!isDrawing || !ctx) return;
    
    setIsDrawingNow(true);
    setLastPoint({ x, y });
    
    // Create new stroke
    const newStroke: DrawingStroke = {
      id: `stroke-${Date.now()}`,
      points: [{ x, y }],
      color: currentColor,
      width: brushSize,
      timestamp: Date.now()
    };
    
    setCurrentStroke(newStroke);
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const draw = (x: number, y: number) => {
    if (!isDrawing || !isDrawingNow || !ctx || !lastPoint || !currentStroke) return;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setLastPoint({ x, y });
    
    // Add point to current stroke
    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, { x, y }]
    };
    setCurrentStroke(updatedStroke);
  };
  
  const endDrawing = () => {
    if (!isDrawing || !ctx || !currentStroke) return;
    
    setIsDrawingNow(false);
    setLastPoint(null);
    ctx.closePath();
    
    // Send the completed stroke
    if (onDrawingChange && canvasRef.current && currentStroke.points.length > 1) {
      const strokeUpdate: DrawingUpdate = {
        playerId: '', // Will be set by the calling component
        type: 'stroke',
        stroke: currentStroke
      };
      onDrawingChange(canvasRef.current.toDataURL(), strokeUpdate);
    }
    
    setCurrentStroke(null);
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    startDrawing(e.clientX - rect.left, e.clientY - rect.top);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    draw(e.clientX - rect.left, e.clientY - rect.top);
  };
  
  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !e.touches[0]) return;
    startDrawing(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !e.touches[0]) return;
    draw(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
  };
  
  return (
    <div className="canvas-container relative w-full h-full border border-gray-300 rounded-lg bg-white">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={endDrawing}
      />
      {isDrawing && (
        <div className="absolute bottom-4 left-4 right-4 p-2 bg-white bg-opacity-90 dark:bg-gray-800 dark:bg-opacity-90 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg flex flex-wrap justify-between items-center">
          <div className="flex space-x-1">
            {colors.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full ${currentColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
                aria-label={`Select ${color} color`}
              />
            ))}
          </div>
          
          <div className="flex space-x-1">
            {brushSizes.map((size) => (
              <button
                key={size}
                className={`w-8 h-8 flex items-center justify-center rounded-full ${
                  brushSize === size 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setBrushSize(size)}
                aria-label={`Brush size ${size}`}
              >
                <div className="rounded-full bg-current" style={{ width: size, height: size }}></div>
              </button>
            ))}
          </div>
          
          <button 
            className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 px-3 py-1 rounded"
            onClick={clearCanvas}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default Canvas;