import React from 'react';
import { Wave } from '../../types';
import { useCanvasAnimation } from '../../hooks/useCanvasAnimation';
import { RangeSlider } from '../ui/RangeSlider';

interface WaveCardProps {
    wave: Wave;
    onChange: (id: number, updates: Partial<Wave>) => void;
    onRemove: (id: number) => void;
    onCounter: (id: number) => void;
    isRemovable: boolean;
}

export const WaveCard: React.FC<WaveCardProps> = ({ wave, onChange, onRemove, onCounter, isRemovable }) => {
    
    const canvasRef = useCanvasAnimation((ctx, time, width, height) => {
        const cy = height / 2;
        ctx.clearRect(0, 0, width, height);

        // Draw background grid line
        ctx.beginPath();
        ctx.strokeStyle = '#f3f4f6';
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        ctx.stroke();

        ctx.beginPath();
        // If muted, show gray/dashed line to indicate potential wave
        ctx.strokeStyle = wave.muted ? '#d1d5db' : wave.color;
        ctx.lineWidth = 2;
        if (wave.muted) ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);
        
        // Optimize drawing: standard sine wave
        for (let x = 0; x < width; x++) { 
            const t = x / width;
            const phaseRad = (wave.phase * Math.PI) / 180;
            // Always show the wave form even if muted, just styled differently
            const yOffset = (wave.amp / 100) * (height / 2.5) * Math.sin(2 * Math.PI * wave.freq * t + phaseRad - (time * 2));
            
            if (x === 0) ctx.moveTo(x, cy - yOffset);
            else ctx.lineTo(x, cy - yOffset);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }, [wave]); 

    return (
        <div className={`bg-white rounded-xl shadow-sm border p-4 relative overflow-hidden transition-all duration-300 hover:shadow-md ${wave.muted ? 'border-gray-100 opacity-75' : 'border-gray-100'}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${wave.muted ? 'bg-gray-300' : ''}`} style={{ backgroundColor: wave.muted ? undefined : wave.color }}></div>
            
            <div className="flex justify-between items-start mb-3 pl-2">
                <div className={`text-xs font-bold uppercase tracking-wider transition-colors ${wave.muted ? 'text-gray-400' : ''}`} style={{ color: wave.muted ? undefined : wave.color }}>
                    Frequency {wave.id} {wave.muted && '(Muted)'}
                </div>
                <div className="flex gap-1">
                    <button 
                        onClick={() => onChange(wave.id, { muted: !wave.muted })}
                        title={wave.muted ? "Unmute" : "Mute"}
                        className={`transition-colors p-1.5 rounded ${wave.muted ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        {wave.muted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                    <button 
                        onClick={() => onCounter(wave.id)}
                        title="Add Cancellation Wave (180° phase shift)"
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded hover:bg-red-50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </button>
                    {isRemovable && (
                        <button 
                            onClick={() => onRemove(wave.id)}
                            title="Remove Layer"
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded hover:bg-gray-100"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Mini Visualizer */}
            <div className={`h-20 w-full bg-gray-50 rounded-lg overflow-hidden border border-gray-100 relative mb-4 transition-opacity ${wave.muted ? 'opacity-50 grayscale' : ''}`}>
                <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            {/* Controls */}
            <div className={`space-y-4 pl-2 transition-opacity ${wave.muted ? 'opacity-50 pointer-events-none' : ''}`}>
                <RangeSlider 
                    label="Frequency (Hz)" 
                    min={0.1} max={144} step={0.1}
                    value={wave.freq}
                    color={wave.color}
                    onChange={(e) => onChange(wave.id, { freq: parseFloat(e.target.value) })}
                />
                <RangeSlider 
                    label="Amplitude (%)" 
                    min={0} max={100}
                    value={wave.amp}
                    color={wave.color}
                    onChange={(e) => onChange(wave.id, { amp: parseFloat(e.target.value) })}
                />
                <RangeSlider 
                    label="Phase (°)" 
                    min={0} max={360}
                    value={wave.phase}
                    color={wave.color}
                    onChange={(e) => onChange(wave.id, { phase: parseFloat(e.target.value) })}
                />
            </div>
        </div>
    );
};
