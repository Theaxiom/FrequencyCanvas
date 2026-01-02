import React, { useState } from 'react';
import { Wave } from '../../types';
import { useCanvasAnimation } from '../../hooks/useCanvasAnimation';
import { useAudio } from '../../hooks/useAudio';

interface MasterOutputProps {
    waves: Wave[];
}

type ViewMode = 'time' | 'lissajous';

export const MasterOutput: React.FC<MasterOutputProps> = ({ waves }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('time');
    const { isPlaying, toggleAudio } = useAudio(waves);
    const [status, setStatus] = useState<{ text: string, type: 'normal' | 'destructive' | 'silence' }>({
        text: 'Initializing...', type: 'normal'
    });

    // Helper to check if wave contributes
    const isActive = (w: Wave) => !w.muted && w.amp > 0;

    const canvasRef = useCanvasAnimation((ctx, time, width, height) => {
        const cx = width / 2;
        const cy = height / 2;
        ctx.clearRect(0, 0, width, height);

        // Grid / Axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (viewMode === 'time') {
            ctx.moveTo(0, cy);
            ctx.lineTo(width, cy);
        } else {
            // Crosshair for Lissajous
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, height);
            ctx.moveTo(0, cy);
            ctx.lineTo(width, cy);
        }
        ctx.stroke();

        const activeWaves = waves.filter(isActive);
        
        // --- RENDERING ---
        ctx.beginPath();
        ctx.strokeStyle = viewMode === 'time' ? '#10B981' : '#F472B6'; // Emerald or Pink
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.strokeStyle;

        if (activeWaves.length === 0) {
            // No output
            ctx.stroke();
            return;
        }

        if (viewMode === 'time') {
            // --- TIME DOMAIN (Original) ---
            let maxPossibleAmp = activeWaves.reduce((sum, w) => sum + w.amp, 0);
            const scale = maxPossibleAmp > 120 ? (120 / maxPossibleAmp) : 1;
            let currentMaxY = 0;

            for (let x = 0; x < width; x+=1) {
                const t = x / width;
                let ySum = 0;

                for (const wave of activeWaves) {
                    const phaseRad = (wave.phase * Math.PI) / 180;
                    ySum += (wave.amp / 100) * (height / 2.5) * Math.sin(2 * Math.PI * wave.freq * t + phaseRad - (time * 2));
                }

                ySum *= scale;
                if (Math.abs(ySum) > currentMaxY) currentMaxY = Math.abs(ySum);

                if (x === 0) ctx.moveTo(x, cy - ySum);
                else ctx.lineTo(x, cy - ySum);
            }
        } else {
            // --- LISSAJOUS DOMAIN (Novel) ---
            // If only 1 wave, draw a circle/line logic? 
            // If > 1 wave: X = Wave 1, Y = Sum(Others)
            
            const xWave = activeWaves[0];
            const yWaves = activeWaves.slice(1);

            // Scale to fit
            const margin = 40;
            const radius = (Math.min(width, height) / 2) - margin;

            // We draw a trail over time
            const segments = 500;
            const history = 2.0; // Seconds of history to draw

            for (let i = 0; i < segments; i++) {
                // t goes from (time) to (time + history)
                // actually better to go (time - history) to (time) to look like a trail
                const t = time - (history * (1 - (i/segments)));
                
                // Calculate X
                const xPhase = (xWave.phase * Math.PI) / 180;
                // Normalize amp 0-1
                const xVal = Math.sin(2 * Math.PI * xWave.freq * t + xPhase);
                
                // Calculate Y
                let yVal = 0;
                if (yWaves.length > 0) {
                    let yMaxAmp = yWaves.reduce((s, w) => s + w.amp, 0);
                    // Avoid div/0
                    yMaxAmp = yMaxAmp === 0 ? 1 : yMaxAmp;
                    
                    yWaves.forEach(w => {
                        const wPhase = (w.phase * Math.PI) / 180;
                        yVal += (w.amp) * Math.sin(2 * Math.PI * w.freq * t + wPhase);
                    });
                    yVal = yVal / yMaxAmp; // Normalize -1 to 1 based on relative amps
                } else {
                    // If only 1 wave, map Y to a simple sine of same freq but 90 deg offset to make a circle?
                    // Or just flat line. Let's do flat line to show "No Y input"
                    yVal = 0;
                }

                const plotX = cx + (xVal * radius);
                const plotY = cy - (yVal * radius);

                if (i === 0) ctx.moveTo(plotX, plotY);
                else ctx.lineTo(plotX, plotY);
            }
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;

    }, [waves, viewMode]);

    // Status logic
    React.useEffect(() => {
        const activeWaves = waves.filter(isActive);
        const totalAmp = activeWaves.reduce((s, w) => s + w.amp, 0);
        
        if (totalAmp === 0) {
            setStatus({ text: 'Silence', type: 'silence' });
            return;
        }

        // Only do interference check in Time mode really, but logic holds
        if (activeWaves.length > 1) {
            let maxObserved = 0;
            for (let t = 0; t < 1; t += 0.05) {
                let ySum = 0;
                for (const wave of activeWaves) {
                    const phaseRad = (wave.phase * Math.PI) / 180;
                    ySum += wave.amp * Math.sin(2 * Math.PI * wave.freq * t + phaseRad);
                }
                if (Math.abs(ySum) > maxObserved) maxObserved = Math.abs(ySum);
            }

            if (maxObserved < totalAmp * 0.1 && totalAmp > 10) {
                 setStatus({ text: 'Destructive Interference', type: 'destructive' });
                 return;
            }
        }
        
        if (viewMode === 'lissajous') {
             if (activeWaves.length < 2) setStatus({ text: 'Lissajous needs 2+ layers', type: 'normal' });
             else setStatus({ text: 'XY Phase Plot', type: 'normal' });
        } else {
             setStatus({ text: 'Composite Wave', type: 'normal' });
        }
        
    }, [waves, viewMode]);

    const statusColors = {
        normal: 'bg-gray-800 text-gray-400',
        destructive: 'bg-red-900/50 text-red-200 border border-red-500/50 animate-pulse',
        silence: 'bg-gray-800 text-gray-600'
    };

    return (
        <div className="bg-gray-900 rounded-xl shadow-xl border border-gray-800 p-4 sticky top-4 z-20 backdrop-blur-sm bg-opacity-95 transition-all duration-500">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-white font-semibold text-sm tracking-wide">
                        {viewMode === 'time' ? 'Time Domain' : 'Lissajous (X vs Y)'}
                    </h2>
                    <div className="flex bg-gray-800 rounded-lg p-0.5">
                        <button 
                            onClick={() => setViewMode('time')}
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'time' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Time
                        </button>
                        <button 
                            onClick={() => setViewMode('lissajous')}
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'lissajous' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            XY
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={toggleAudio}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors border ${
                            isPlaying 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/50 animate-pulse' 
                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
                        }`}
                    >
                        {isPlaying ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                                </svg>
                                Audio ON
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Audio OFF
                            </>
                        )}
                    </button>
                    <div className={`text-xs font-mono px-3 py-1 rounded transition-all duration-300 ${statusColors[status.type]}`}>
                        {status.text}
                    </div>
                </div>
            </div>
            
            <div className="relative h-56 w-full bg-gray-950 rounded-lg overflow-hidden ring-1 ring-white/10">
                <canvas ref={canvasRef} className="w-full h-full block" />
                {viewMode === 'time' && (
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white opacity-10 pointer-events-none"></div>
                )}
            </div>
            {viewMode === 'lissajous' && (
                <div className="mt-2 text-[10px] text-gray-500 flex justify-between">
                    <span>X-Axis: Layer 1</span>
                    <span>Y-Axis: Sum of other layers</span>
                </div>
            )}
        </div>
    );
};
