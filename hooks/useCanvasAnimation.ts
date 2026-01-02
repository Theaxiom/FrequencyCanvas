import { useEffect, useRef } from 'react';

type DrawCallback = (ctx: CanvasRenderingContext2D, time: number, width: number, height: number) => void;

export const useCanvasAnimation = (
    draw: DrawCallback,
    dependencies: any[] = []
) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const startTimeRef = useRef<number>(performance.now());
    
    // Keep a mutable ref to the callback to avoid restarting the animation loop on every render
    const drawRef = useRef(draw);
    useEffect(() => {
        drawRef.current = draw;
    }); // Update on every render

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // We set the resolution to match the display density
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Logical dimensions for drawing
        const width = rect.width;
        const height = rect.height;

        const animate = (time: number) => {
            const elapsed = (time - startTimeRef.current) / 1000;
            drawRef.current(ctx, elapsed, width, height);
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ ...dependencies]); 
    // We intentionally spread dependencies to trigger re-setup of canvas if needed
    // though mostly we rely on drawRef for logic updates.

    return canvasRef;
};
