import React, { useState, useMemo } from 'react';
import { DrawingCanvas } from './DrawingCanvas';
import { generatePresetWave, computeDFT } from '../../utils/math';
import { useCanvasAnimation } from '../../hooks/useCanvasAnimation';
import { RangeSlider } from '../ui/RangeSlider';
import { Wave, COLORS } from '../../types';

interface FourierLabProps {
    onExportToLab?: (waves: Wave[]) => void;
}

export const FourierLab: React.FC<FourierLabProps> = ({ onExportToLab }) => {
    // 200 sample points for the drawing
    const [drawing, setDrawing] = useState<number[]>(new Array(200).fill(0.5));
    const [harmonics, setHarmonics] = useState<number>(5);
    const [showComponents, setShowComponents] = useState<boolean>(false);
    
    // Editor controls
    const [brushSize, setBrushSize] = useState<number>(5);
    const [zoom, setZoom] = useState<number>(1);
    const [pan, setPan] = useState<number>(0);

    // Compute coefficients only when drawing changes
    const coefficients = useMemo(() => computeDFT(drawing), [drawing]);

    // Updated signature: added deltaTime
    const reconstructionCanvasRef = useCanvasAnimation((ctx, time, deltaTime, width, height) => {
        ctx.clearRect(0, 0, width, height);
        
        // Draw ghost of original drawing
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
        ctx.lineWidth = 4;
        for (let i = 0; i < drawing.length; i++) {
            const x = (i / (drawing.length - 1)) * width;
            const y = (1 - drawing[i]) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw Individual Sine Components
        if (showComponents) {
            ctx.lineWidth = 1.5;
            for (let k = 0; k < harmonics; k++) {
                if (k >= coefficients.length) break;
                const c = coefficients[k];

                ctx.beginPath();
                // Assign distinct color based on harmonic index using Golden Angle approximation
                // This ensures adjacent harmonics have distinct hues
                ctx.strokeStyle = `hsla(${(k * 137.5) % 360}, 70%, 60%, 0.3)`;

                for (let x = 0; x < width; x+=2) {
                    const t = x / width;
                    let yVal = 0;
                    
                    if (k === 0) {
                         // DC Component: Constant level
                         yVal = c.amp;
                    } else {
                         // AC Components: Centered around 0.5 for clear visualization
                         yVal = 0.5 + c.amp * Math.cos(2 * Math.PI * c.freq * t + c.phase);
                    }

                    const screenY = (1 - yVal) * height;
                    if (x === 0) ctx.moveTo(x, screenY);
                    else ctx.lineTo(x, screenY);
                }
                ctx.stroke();
            }
        }

        // Draw Reconstruction Sum
        ctx.beginPath();
        ctx.strokeStyle = '#4F46E5'; // Indigo 600
        ctx.lineWidth = 3;
        
        // Add shadow/glow to make it pop over the components if they are visible
        if (showComponents) {
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
        }

        for (let x = 0; x < width; x++) {
            const t = x / width; // 0 to 1
            let yVal = 0;

            for (let k = 0; k < harmonics; k++) {
                if (k >= coefficients.length) break;
                const c = coefficients[k];
                yVal += c.amp * Math.cos(2 * Math.PI * c.freq * t + c.phase);
            }
            
            const screenY = (1 - yVal) * height;

            if (x === 0) ctx.moveTo(x, screenY);
            else ctx.lineTo(x, screenY);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

    }, [drawing, harmonics, coefficients, showComponents]);

    const handleExport = () => {
        if (!onExportToLab) return;
        
        const wavesToExport: Wave[] = [];
        // We skip the DC component (k=0) as WaveLab works with AC frequencies > 0
        const activeCoefficients = coefficients.slice(1, harmonics + 1);
        
        // Find max amplitude to normalize visual loudness in Wave Lab
        // Wave Lab uses 0-100 scale, DFT uses 0-0.5 approx.
        // We want the strongest harmonic to be around 80% amplitude in Wave Lab.
        const maxAmp = Math.max(...activeCoefficients.map(c => c.amp));
        const scaleFactor = maxAmp > 0.001 ? (80 / maxAmp) : 100;

        activeCoefficients.forEach((c, index) => {
            // Filter out extremely quiet harmonics to reduce clutter
            if (c.amp * scaleFactor < 1) return;

            wavesToExport.push({
                id: index + 1,
                // Wave Lab uses relative frequency. c.freq is integer harmonic index.
                freq: c.freq,
                amp: c.amp * scaleFactor,
                // Convert Radians to Degrees for Wave Lab
                phase: (c.phase * 180 / Math.PI + 360) % 360,
                color: COLORS[index % COLORS.length],
                muted: false
            });
        });

        onExportToLab(wavesToExport);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Fourier Decomposition</h2>
                        <p className="text-gray-500 text-sm max-w-lg mt-1">
                            Draw any single-cycle shape. The blue line shows the mathematical reconstruction using purely sine waves.
                        </p>
                    </div>
                    <div className="flex space-x-2 bg-gray-50 p-1 rounded-lg">
                        <button 
                            onClick={() => setDrawing(generatePresetWave('square'))}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded-md transition-all"
                        >
                            Square
                        </button>
                        <button 
                            onClick={() => setDrawing(generatePresetWave('saw'))}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded-md transition-all"
                        >
                            Sawtooth
                        </button>
                        <button 
                            onClick={() => setDrawing(new Array(200).fill(0.5))}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-all"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Drawing Input */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Input Signal (Draw Here)</label>
                        </div>
                        
                        {/* Editor Controls */}
                        <div className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                             <div className="flex-1">
                                <RangeSlider 
                                    label="Brush Size" 
                                    min={1} max={20} step={1} 
                                    value={brushSize} 
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                                    color="#6366f1"
                                />
                             </div>
                             <div className="flex-1">
                                <RangeSlider 
                                    label="Zoom" 
                                    min={1} max={5} step={0.1} 
                                    value={zoom} 
                                    onChange={(e) => setZoom(parseFloat(e.target.value))} 
                                    color="#6366f1"
                                />
                             </div>
                             <div className={`flex-1 transition-opacity ${zoom <= 1 ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                <RangeSlider 
                                    label="Pan View" 
                                    min={0} max={1} step={0.01} 
                                    value={pan} 
                                    onChange={(e) => setPan(parseFloat(e.target.value))} 
                                    color="#6366f1"
                                />
                             </div>
                        </div>

                        <DrawingCanvas 
                            data={drawing} 
                            onChange={setDrawing} 
                            brushSize={brushSize}
                            zoom={zoom}
                            pan={pan}
                        />
                    </div>

                    {/* Output */}
                    <div className="space-y-2">
                         <div className="flex justify-between items-end">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fourier Reconstruction</label>
                            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none hover:text-indigo-600 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={showComponents} 
                                    onChange={(e) => setShowComponents(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                />
                                Show Components
                            </label>
                        </div>
                        <div className="h-64 md:h-80 w-full bg-gray-900 rounded-lg border border-gray-800 shadow-inner overflow-hidden relative">
                             <canvas ref={reconstructionCanvasRef} className="w-full h-full block" />
                             <div className="absolute top-4 right-4 bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded font-mono pointer-events-none">
                                 N = {harmonics}
                             </div>
                        </div>
                    </div>
                </div>

                {/* Slider Control */}
                <div className="mt-8 p-6 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col md:flex-row gap-8 items-end">
                    <div className="flex-1 w-full">
                        <RangeSlider
                            label="Harmonic Complexity (Number of Sine Waves)"
                            valueDisplay={harmonics}
                            min={1}
                            max={50}
                            step={1}
                            value={harmonics}
                            onChange={(e) => setHarmonics(parseInt(e.target.value))}
                        />
                        <p className="text-xs text-indigo-600/80 mt-3">
                            As you increase harmonics, the reconstruction (blue line) better approximates your sharp edges.
                        </p>
                    </div>

                    <div className="w-full md:w-auto flex-shrink-0">
                        <button 
                            onClick={handleExport}
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg text-sm font-semibold shadow-md transition-all hover:scale-105 active:scale-95"
                        >
                            <span>Open in Wave Lab</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};