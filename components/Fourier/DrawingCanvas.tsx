import React, { useRef, useState, useEffect } from 'react';

interface DrawingCanvasProps {
    data: number[];
    onChange: (newData: number[]) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ data, onChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial Draw & Resize
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            draw();
        };

        window.addEventListener('resize', resize);
        resize();

        return () => window.removeEventListener('resize', resize);
    }, [data]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Grid background
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < w; i += 20) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
        for (let i = 0; i < h; i += 20) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
        ctx.stroke();

        // Draw Line
        ctx.beginPath();
        ctx.strokeStyle = '#4338ca'; // Indigo 700
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < data.length; i++) {
            const x = (i / (data.length - 1)) * w;
            const y = (1 - data[i]) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    };

    // Redraw when data changes
    useEffect(() => {
        draw();
    }, [data]);

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
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

        const normalizedY = 1 - (y / rect.height);
        const index = Math.min(Math.floor((x / rect.width) * data.length), data.length - 1);

        // Simple brush: affect neighbors for smoothness
        const newData = [...data];
        const brushRadius = Math.floor(data.length * 0.05);
        
        for (let i = -brushRadius; i <= brushRadius; i++) {
            const idx = index + i;
            if (idx >= 0 && idx < newData.length) {
                // Falloff
                const dist = Math.abs(i) / brushRadius;
                const influence = 1 - dist * dist; // Quadratic falloff
                // Lerp towards new value
                newData[idx] = newData[idx] * (1 - influence) + normalizedY * influence;
            }
        }
        onChange(newData);
    };

    return (
        <div 
            ref={containerRef}
            className="relative h-64 md:h-80 w-full bg-white rounded-lg border border-gray-200 shadow-inner overflow-hidden cursor-crosshair touch-none select-none group"
            onMouseDown={() => setIsDrawing(true)}
            onTouchStart={() => setIsDrawing(true)}
            onMouseMove={handlePointerMove}
            onTouchMove={handlePointerMove}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onTouchEnd={() => setIsDrawing(false)}
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
