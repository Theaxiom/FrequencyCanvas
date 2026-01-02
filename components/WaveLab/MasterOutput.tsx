import React, { useState } from 'react';
import { Wave } from '../../types';
import { useCanvasAnimation } from '../../hooks/useCanvasAnimation';

interface MasterOutputProps {
    waves: Wave[];
}

export const MasterOutput: React.FC<MasterOutputProps> = ({ waves }) => {
    const [status, setStatus] = useState<{ text: string, type: 'normal' | 'destructive' | 'silence' }>({
        text: 'Initializing...', type: 'normal'
    });

    // Helper to check if wave contributes
    const isActive = (w: Wave) => !w.muted && w.amp > 0;

    const canvasRef = useCanvasAnimation((ctx, time, width, height) => {
        const cy = height / 2;
        ctx.clearRect(0, 0, width, height);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#10B981'; // Emerald 500
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        
        // Filter active waves for calculation
        const activeWaves = waves.filter(isActive);

        // Sum amplitude calculation for auto-scaling
        let maxPossibleAmp = activeWaves.reduce((sum, w) => sum + w.amp, 0);
        const scale = maxPossibleAmp > 120 ? (120 / maxPossibleAmp) : 1;

        let currentMaxY = 0;

        for (let x = 0; x < width; x+=1) {
            const t = x / width;
            let ySum = 0;

            for (const wave of activeWaves) {
                const phaseRad = (wave.phase * Math.PI) / 180;
                // Use same time factor as WaveCard (time * 2)
                ySum += (wave.amp / 100) * (height / 2.5) * Math.sin(2 * Math.PI * wave.freq * t + phaseRad - (time * 2));
            }

            ySum *= scale;
            if (Math.abs(ySum) > currentMaxY) currentMaxY = Math.abs(ySum);

            if (x === 0) ctx.moveTo(x, cy - ySum);
            else ctx.lineTo(x, cy - ySum);
        }
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10B981';
        ctx.stroke();
        ctx.shadowBlur = 0;

    }, [waves]);

    // Status logic decoupled from animation loop
    React.useEffect(() => {
        const activeWaves = waves.filter(isActive);
        const totalAmp = activeWaves.reduce((s, w) => s + w.amp, 0);
        
        if (totalAmp === 0) {
            setStatus({ text: 'Silence (Zero Amplitude)', type: 'silence' });
            return;
        }

        // Quick check for interference
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
             setStatus({ text: 'Destructive Interference detected', type: 'destructive' });
        } else {
             setStatus({ text: `Summing ${activeWaves.length} Frequencies`, type: 'normal' });
        }
    }, [waves]);

    const statusColors = {
        normal: 'bg-gray-800 text-gray-400',
        destructive: 'bg-red-900/50 text-red-200 border border-red-500/50 animate-pulse',
        silence: 'bg-gray-800 text-gray-600'
    };

    return (
        <div className="bg-gray-900 rounded-xl shadow-xl border border-gray-800 p-4 sticky top-4 z-20 backdrop-blur-sm bg-opacity-95">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-white font-semibold text-sm tracking-wide">Master Output (Sum)</h2>
                <div className={`text-xs font-mono px-3 py-1 rounded transition-all duration-300 ${statusColors[status.type]}`}>
                    {status.text}
                </div>
            </div>
            <div className="relative h-40 w-full bg-gray-950 rounded-lg overflow-hidden ring-1 ring-white/10">
                <canvas ref={canvasRef} className="w-full h-full block" />
                {/* Center Line visual guide */}
                <div className="absolute top-1/2 left-0 w-full h-px bg-white opacity-10 pointer-events-none"></div>
            </div>
        </div>
    );
};
