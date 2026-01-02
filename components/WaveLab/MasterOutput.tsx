import React, { useState } from 'react';
import { Wave } from '../../types';
import { useCanvasAnimation } from '../../hooks/useCanvasAnimation';
import { useAudio } from '../../hooks/useAudio';

interface MasterOutputProps {
    waves: Wave[];
}

type ViewMode = 'time' | 'lissajous' | 'chladni';

export const MasterOutput: React.FC<MasterOutputProps> = ({ waves }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('time');
    const { isPlaying, toggleAudio } = useAudio(waves);
    const [status, setStatus] = useState<{ text: string, type: 'normal' | 'destructive' | 'silence' }>({
        text: 'Initializing...', type: 'normal'
    });

    // Helper to check if wave contributes
    const isActive = (w: Wave) => !w.muted && w.amp > 0;

    const canvasRef = useCanvasAnimation((ctx, time, width, height) => {
        // Clear logic depends on mode
        if (viewMode !== 'chladni') {
            ctx.clearRect(0, 0, width, height);
        }

        const cx = width / 2;
        const cy = height / 2;
        const activeWaves = waves.filter(isActive);

        // --- TIME DOMAIN ---
        if (viewMode === 'time') {
            // Grid Axis
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, cy);
            ctx.lineTo(width, cy);
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = '#10B981'; // Emerald
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.strokeStyle;

            if (activeWaves.length === 0) {
                ctx.stroke();
                return;
            }

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
            ctx.stroke();
            ctx.shadowBlur = 0;
        } 
        
        // --- LISSAJOUS DOMAIN ---
        else if (viewMode === 'lissajous') {
            // Axes
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, height);
            ctx.moveTo(0, cy);
            ctx.lineTo(width, cy);
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = '#F472B6'; // Pink
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.strokeStyle;

            if (activeWaves.length === 0) {
                ctx.stroke();
                return;
            }

            const xWave = activeWaves[0];
            const yWaves = activeWaves.slice(1);

            // Scale to fit
            const margin = 40;
            const radius = (Math.min(width, height) / 2) - margin;

            // We draw a trail over time
            const segments = 500;
            const history = 2.0; 

            for (let i = 0; i < segments; i++) {
                const t = time - (history * (1 - (i/segments)));
                
                // X Calculation
                const xPhase = (xWave.phase * Math.PI) / 180;
                const xVal = Math.sin(2 * Math.PI * xWave.freq * t + xPhase);
                
                // Y Calculation
                let yVal = 0;
                if (yWaves.length > 0) {
                    let yMaxAmp = yWaves.reduce((s, w) => s + w.amp, 0);
                    yMaxAmp = yMaxAmp === 0 ? 1 : yMaxAmp;
                    
                    yWaves.forEach(w => {
                        const wPhase = (w.phase * Math.PI) / 180;
                        yVal += (w.amp) * Math.sin(2 * Math.PI * w.freq * t + wPhase);
                    });
                    yVal = yVal / yMaxAmp;
                } else {
                    yVal = 0;
                }

                const plotX = cx + (xVal * radius);
                const plotY = cy - (yVal * radius);

                if (i === 0) ctx.moveTo(plotX, plotY);
                else ctx.lineTo(plotX, plotY);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // --- CHLADNI / CYMATICS DOMAIN ---
        else if (viewMode === 'chladni') {
            // Pixel manipulation for 2D field
            const imgData = ctx.createImageData(width, height);
            const data = imgData.data;
            
            // Optimization: Skip pixels if high res (e.g. step 2) 
            // but for smooth gradients we do every pixel.
            
            let totalAmp = activeWaves.reduce((sum, w) => sum + w.amp, 0);
            totalAmp = totalAmp === 0 ? 1 : totalAmp;

            for (let y = 0; y < height; y++) {
                // Normalize Y to [-1, 1]
                const ny = (y - cy) / (height / 2);
                
                for (let x = 0; x < width; x++) {
                    // Normalize X to [-1, 1] (maintain aspect ratio logic if needed, but square is fine here)
                    const nx = (x - cx) / (height / 2); // Scale by height to keep aspect square-ish

                    let zSum = 0;

                    for (const w of activeWaves) {
                        // 2D Standing Wave Approximation: sin(kx) * sin(ky) * cos(t)
                        // Frequency determines spatial density
                        const spatialFreq = w.freq * 2.0; 
                        const phaseRad = (w.phase * Math.PI) / 180;
                        
                        // Standing wave pattern
                        const spatialVal = Math.sin(spatialFreq * nx * Math.PI) * Math.sin(spatialFreq * ny * Math.PI);
                        
                        // Time modulation (vibrating plate)
                        const timeVal = Math.cos(time * 5 + phaseRad);
                        
                        zSum += (w.amp) * spatialVal * timeVal;
                    }

                    // Visualize "Sand" collecting at Nodes (where zSum is close to 0)
                    // We map low amplitude to high brightness (Sand)
                    // High amplitude (Antinode) = Dark plate
                    
                    const amplitude = Math.abs(zSum);
                    // Thresholding for "Sand" look vs "Heatmap" look
                    // Let's do a glowing sand look.
                    
                    // The closer to 0, the brighter the sand.
                    // Max amplitude is around totalAmp (100-ish). 
                    
                    // Invert intensity: 
                    // intensity 1.0 = Node (0 amp)
                    // intensity 0.0 = Antinode (High amp)
                    let intensity = Math.max(0, 1 - (amplitude / (totalAmp * 0.4))); 
                    intensity = Math.pow(intensity, 4); // Sharpen the lines (contrast)

                    const index = (y * width + x) * 4;
                    
                    // Sand Color (Amber/Gold-ish: 250, 200, 100)
                    // Background (Dark Blue/Gray: 10, 15, 30)
                    
                    data[index] = 10 + (240 * intensity);     // R
                    data[index + 1] = 15 + (200 * intensity); // G
                    data[index + 2] = 30 + (100 * intensity); // B
                    data[index + 3] = 255;                    // Alpha
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }

    }, [waves, viewMode]);

    // Status logic
    React.useEffect(() => {
        const activeWaves = waves.filter(isActive);
        const totalAmp = activeWaves.reduce((s, w) => s + w.amp, 0);
        
        if (totalAmp === 0) {
            setStatus({ text: 'Silence', type: 'silence' });
            return;
        }

        if (viewMode === 'time' && activeWaves.length > 1) {
            // Simple check for destructive interference
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
        } else if (viewMode === 'chladni') {
             setStatus({ text: 'Virtual Chladni Plate (Sand at Nodes)', type: 'normal' });
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
            <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <h2 className="text-white font-semibold text-sm tracking-wide hidden sm:block">
                        {viewMode === 'time' ? 'Time Domain' : viewMode === 'lissajous' ? 'Lissajous (XY)' : 'Cymatics (2D)'}
                    </h2>
                    <div className="flex bg-gray-800 rounded-lg p-0.5 w-full sm:w-auto justify-center">
                        <button 
                            onClick={() => setViewMode('time')}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'time' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Time
                        </button>
                        <button 
                            onClick={() => setViewMode('lissajous')}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'lissajous' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            XY
                        </button>
                        <button 
                            onClick={() => setViewMode('chladni')}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'chladni' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Plate
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                                Audio
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Muted
                            </>
                        )}
                    </button>
                    <div className={`text-xs font-mono px-3 py-1 rounded transition-all duration-300 ${statusColors[status.type]}`}>
                        {status.text}
                    </div>
                </div>
            </div>
            
            <div className="relative h-64 md:h-72 w-full bg-gray-950 rounded-lg overflow-hidden ring-1 ring-white/10">
                <canvas ref={canvasRef} className="w-full h-full block" />
                {viewMode === 'time' && (
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white opacity-10 pointer-events-none"></div>
                )}
            </div>
            {viewMode === 'chladni' && (
                <div className="mt-2 text-[10px] text-gray-500 flex justify-between px-1">
                    <span>Bright Areas: Nodes (Low Vibration)</span>
                    <span>Dark Areas: Antinodes (High Vibration)</span>
                </div>
            )}
        </div>
    );
};
