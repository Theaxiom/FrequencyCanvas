import React, { useRef, useState, useEffect } from 'react';

interface DrawingCanvasProps {
    data: number[];
    onChange: (newData: number[]) => void;
    brushSize: number;
    zoom: number;
    pan: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ data, onChange, brushSize, zoom, pan }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Helper to get view parameters
    const getViewParams = () => {
        const N = data.length;
        const visibleCount = N / zoom;
        const maxStart = N - visibleCount;
        const startIndex = Math.floor(pan * maxStart);
        return { N, visibleCount, startIndex };
    };

    // Initial Draw & Resize
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            // Handle high-DPI displays for crisp rendering
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            // Normalize scale
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
            
            // Set style width/height to match container
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            
            draw();
        };

        window.addEventListener('resize', resize);
        resize();

        return () => window.removeEventListener('resize', resize);
    }, [data, zoom, pan, cursorPos, brushSize]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Using layout dimensions
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        ctx.clearRect(0, 0, w, h);

        const { N, visibleCount, startIndex } = getViewParams();

        // Grid background (Adaptive to zoom?)
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Draw roughly 10 vertical grid lines across the view
        const gridStep = w / 10;
        for (let i = 0; i < w; i += gridStep) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
        for (let i = 0; i < h; i += gridStep) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
        ctx.stroke();

        // Draw Line
        ctx.beginPath();
        ctx.strokeStyle = '#4338ca'; // Indigo 700
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const startDraw = Math.max(0, Math.floor(startIndex));
        const endDraw = Math.min(N - 1, Math.ceil(startIndex + visibleCount));

        for (let i = startDraw; i <= endDraw; i++) {
            // Map index i to screen coord x
            // x = ((i - startIndex) / visibleCount) * w
            const x = ((i - startIndex) / visibleCount) * w;
            const y = (1 - data[i]) * h;
            
            if (i === startDraw) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw Cursor Indicator
        if (cursorPos) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(79, 70, 229, 0.5)'; // Indigo
            ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
            
            // Convert brushSize (data points) to screen pixels
            // 1 data point width = w / visibleCount
            const pixelRadius = Math.max(3, brushSize * (w / visibleCount));
            
            ctx.arc(cursorPos.x, cursorPos.y, pixelRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    };

    // Redraw when any prop changes that affects view
    useEffect(() => {
        draw();
    }, [data, zoom, pan, brushSize, cursorPos]);

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
        
        setCursorPos({x, y});

        if (!isDrawing) return;

        const normalizedY = 1 - (y / rect.height);
        
        // Map X to Data Index
        const { visibleCount, startIndex } = getViewParams();
        const xRatio = x / rect.width;
        // Exact index in data array corresponding to mouse X
        const rawIndex = startIndex + (xRatio * visibleCount);
        const index = Math.max(0, Math.min(Math.floor(rawIndex), data.length - 1));

        const newData = [...data];
        // brushSize is radius in integer indices
        
        for (let i = -brushSize; i <= brushSize; i++) {
            const idx = index + i;
            if (idx >= 0 && idx < newData.length) {
                // Determine if this index is within the visual brush circle (conceptually)
                // We use a simple 1D falloff for the signal
                const dist = Math.abs(i) / (brushSize + 0.1); // Avoid div by zero
                if (dist <= 1) {
                    const influence = 1 - dist * dist; // Quadratic falloff
                    // Lerp
                    newData[idx] = newData[idx] * (1 - influence) + normalizedY * influence;
                }
            }
        }
        onChange(newData);
    };

    const handleEnd = () => {
        setIsDrawing(false);
    };

    const handleLeave = () => {
        setIsDrawing(false);
        setCursorPos(null);
    }

    return (
        <div 
            ref={containerRef}
            className={`relative h-64 md:h-80 w-full bg-white rounded-lg border border-gray-200 shadow-inner overflow-hidden cursor-crosshair touch-none select-none group ${isDrawing ? 'cursor-none' : ''}`}
            onMouseDown={() => setIsDrawing(true)}
            onTouchStart={() => setIsDrawing(true)}
            onMouseMove={handlePointerMove}
            onTouchMove={handlePointerMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleLeave}
            onTouchEnd={handleEnd}
        >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
            
            {/* Hint Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 ${isDrawing || data.some(v => v !== 0.5) ? 'opacity-0' : 'opacity-100'}`}>
                <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-medium text-gray-500 shadow-sm border border-gray-100">
                    Draw a wave shape here
                </span>
            </div>
        </div>
    );
};
