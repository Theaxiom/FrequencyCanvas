import React, { useState, useRef, useEffect } from 'react';
import { Wave } from '../../types';
import { useCanvasAnimation } from '../../hooks/useCanvasAnimation';
import { useAudio } from '../../hooks/useAudio';

interface MasterOutputProps {
    waves: Wave[];
}

type ViewMode = 'time' | 'lissajous' | 'xyz' | 'chladni' | 'fluid' | 'water';

interface ViewState {
    zoom: number;
    pan: { x: number; y: number };
}

export const MasterOutput: React.FC<MasterOutputProps> = ({ waves }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('time');
    const { isPlaying, toggleAudio } = useAudio(waves);
    const [status, setStatus] = useState<{ text: string, type: 'normal' | 'destructive' | 'silence' }>({
        text: 'Initializing...', type: 'normal'
    });

    // Resizing State
    const [height, setHeight] = useState(500); // Default pixel height
    const isResizing = useRef(false);

    // Speed Control
    const [speed, setSpeed] = useState(1);
    const simTimeRef = useRef(0);

    // Auto Rotation State for XYZ
    const [isAutoRotating, setIsAutoRotating] = useState(true);
    const autoRotRef = useRef(0);

    // View Controls State (Persisted per view)
    const [viewSettings, setViewSettings] = useState<Record<ViewMode, ViewState>>({
        time: { zoom: 1, pan: { x: 0, y: 0 } },
        lissajous: { zoom: 1, pan: { x: 0, y: 0 } },
        xyz: { zoom: 0.8, pan: { x: 0, y: 0 } },
        chladni: { zoom: 0.6, pan: { x: 0, y: 0 } },
        fluid: { zoom: 0.6, pan: { x: 0, y: 0 } },
        water: { zoom: 1, pan: { x: 0, y: 0 } }
    });

    // Derived values for current view
    const zoom = viewSettings[viewMode].zoom;
    const pan = viewSettings[viewMode].pan;

    const [isDragging, setIsDragging] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Native Wheel Listener to prevent scrolling and handle zoom
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheelNative = (e: WheelEvent) => {
            if (viewMode === 'chladni' || viewMode === 'fluid' || viewMode === 'water' || viewMode === 'xyz') {
                e.preventDefault();
                const delta = -e.deltaY * 0.001;
                
                setViewSettings(prev => {
                    const current = prev[viewMode];
                    const newZoom = Math.max(0.1, Math.min(10, current.zoom * (1 + delta)));
                    return {
                        ...prev,
                        [viewMode]: { ...current, zoom: newZoom }
                    };
                });
            }
        };

        // { passive: false } is required to allow preventDefault() to stop scrolling
        container.addEventListener('wheel', handleWheelNative, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheelNative);
        };
    }, [viewMode]);

    // Handle Resize Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            e.preventDefault();
            // Constrain height between 300px and 800px (or roughly 80% of viewport)
            const newHeight = Math.max(300, Math.min(window.innerHeight * 0.8, e.clientY - (containerRef.current?.getBoundingClientRect().top || 0)));
            setHeight(newHeight);
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startResize = (e: React.MouseEvent) => {
        isResizing.current = true;
        document.body.style.cursor = 'ns-resize';
    };

    // Helper to check if wave contributes
    const isActive = (w: Wave) => !w.muted && w.amp > 0;

    const canvasRef = useCanvasAnimation((ctx, _totalTime, deltaTime, width, height) => {
        const cx = width / 2;
        const cy = height / 2;
        const activeWaves = waves.filter(isActive);

        // Update Simulation Time
        simTimeRef.current += deltaTime * speed;
        const time = simTimeRef.current;

        // Clear canvas
        if (viewMode !== 'chladni' && viewMode !== 'water') {
             // For fluid/xyz mode, we might want a darker clear or gradient
            ctx.fillStyle = (viewMode === 'fluid' || viewMode === 'xyz') ? '#0b0f19' : '#00000000'; 
            ctx.fillRect(0, 0, width, height);
            if (viewMode !== 'fluid' && viewMode !== 'xyz') ctx.clearRect(0, 0, width, height);
        }

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
            ctx.shadowBlur = 8;
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
        
        // --- LISSAJOUS DOMAIN (2D) ---
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
            ctx.shadowBlur = 8;
            ctx.shadowColor = ctx.strokeStyle;

            if (activeWaves.length === 0) {
                ctx.stroke();
                return;
            }

            const xWave = activeWaves[0];
            const yWaves = activeWaves.slice(1);

            const margin = 40;
            const radius = (Math.min(width, height) / 2) - margin;

            const segments = 500;
            const history = 2.0; 

            for (let i = 0; i < segments; i++) {
                const t = time - (history * (1 - (i/segments)));
                
                const xPhase = (xWave.phase * Math.PI) / 180;
                const xVal = Math.sin(2 * Math.PI * xWave.freq * t + xPhase);
                
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

        // --- 3D LISSAJOUS (XYZ) ---
        else if (viewMode === 'xyz') {
            // We need 3 dimensions. If fewer than 3 waves, we use 0 for missing dimensions.
            const wX = activeWaves[0];
            const wY = activeWaves[1];
            const wZ = activeWaves[2];

            // Camera Setup
            const cameraZ = 1200 / Math.max(0.1, zoom);
            const scale = Math.min(width, height) * 0.4;
            
            // Auto Rotation Logic
            if (isAutoRotating) {
                autoRotRef.current += deltaTime * speed * 0.2;
            }

            // Rotation controlled by mouse pan + auto rotate
            const rotX = (pan.y * 0.01) + 0.5;
            const rotY = (pan.x * 0.01) + autoRotRef.current;

            // Draw 3D Bounding Box (Reference Cube)
            const boxSize = scale * 1.2;
            const boxPoints = [
                {x:-1,y:-1,z:-1}, {x:1,y:-1,z:-1}, {x:1,y:1,z:-1}, {x:-1,y:1,z:-1}, // Back Face
                {x:-1,y:-1,z:1}, {x:1,y:-1,z:1}, {x:1,y:1,z:1}, {x:-1,y:1,z:1}      // Front Face
            ];

            const project = (x: number, y: number, z: number) => {
                 // Rotate Y
                 let rx = x * Math.cos(rotY) - z * Math.sin(rotY);
                 let rz = x * Math.sin(rotY) + z * Math.cos(rotY);
                 // Rotate X
                 let ry = y * Math.cos(rotX) - rz * Math.sin(rotX);
                 rz = y * Math.sin(rotX) + rz * Math.cos(rotX);

                 const depth = rz + cameraZ;
                 if (depth < 10) return null; // Clip
                 const screenX = cx + (rx / depth) * 1000; // 1000 is generic fov factor
                 const screenY = cy + (ry / depth) * 1000;
                 return { x: screenX, y: screenY };
            };

            // Draw Box Edges
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            const edges = [
                [0,1], [1,2], [2,3], [3,0], // Back
                [4,5], [5,6], [6,7], [7,4], // Front
                [0,4], [1,5], [2,6], [3,7]  // Connectors
            ];
            
            ctx.beginPath();
            edges.forEach(([s, e]) => {
                const start = boxPoints[s];
                const end = boxPoints[e];
                const p1 = project(start.x * boxSize, start.y * boxSize, start.z * boxSize);
                const p2 = project(end.x * boxSize, end.y * boxSize, end.z * boxSize);
                if (p1 && p2) {
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                }
            });
            ctx.stroke();


            // Draw The Knot
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            // Neon Gradient
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#6366f1'); // Indigo
            gradient.addColorStop(0.5, '#ec4899'); // Pink
            gradient.addColorStop(1, '#8b5cf6'); // Violet
            ctx.strokeStyle = gradient;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ec4899';

            ctx.beginPath();
            const points = 800;
            // Longer history for knot to show full shape
            // Calculate Greatest Common Divisor-ish period (simplified) or just draw enough cycles
            const cycles = 4; 
            
            for (let i = 0; i < points; i++) {
                // Parameter t running through the cycles
                const tOffset = (i / points) * (Math.PI * 2 * cycles); 
                // Add current time for animation flow
                const t = tOffset + (time * 0.5); 

                // X Axis
                let x = 0;
                if (wX) {
                    const phase = (wX.phase * Math.PI) / 180;
                    x = Math.sin(wX.freq * t * 0.2 + phase); // Scale freq down slightly for smoother viewing
                }

                // Y Axis
                let y = 0;
                if (wY) {
                    const phase = (wY.phase * Math.PI) / 180;
                    y = Math.sin(wY.freq * t * 0.2 + phase);
                }

                // Z Axis
                let z = 0;
                if (wZ) {
                    const phase = (wZ.phase * Math.PI) / 180;
                    z = Math.sin(wZ.freq * t * 0.2 + phase);
                }

                const p = project(x * scale, y * scale, z * scale);
                if (p) {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // --- CHLADNI / CYMATICS DOMAIN ---
        else if (viewMode === 'chladni') {
            const imgData = ctx.createImageData(width, height);
            const data = imgData.data;
            
            let totalAmp = activeWaves.reduce((sum, w) => sum + w.amp, 0) * 2;
            totalAmp = totalAmp === 0 ? 1 : totalAmp;

            const baseScale = height / 2;
            const currentScale = baseScale * zoom;

            const waveParams = activeWaves.map(w => ({
                amp: w.amp,
                spatialFreq: w.freq * 2.0 * Math.PI,
                angleBase: (w.phase * Math.PI / 180) - (time * w.freq * 5)
            }));

            for (let y = 0; y < height; y++) {
                const ny = (y - cy - pan.y) / currentScale;
                
                for (let x = 0; x < width; x++) {
                    const nx = (x - cx - pan.x) / currentScale;

                    let reSum = 0;
                    let imSum = 0;

                    for (let i = 0; i < waveParams.length; i++) {
                        const w = waveParams[i];
                        const spatialVal = Math.cos(w.spatialFreq * nx) + Math.cos(w.spatialFreq * ny);
                        reSum += w.amp * spatialVal * Math.cos(w.angleBase);
                        imSum += w.amp * spatialVal * Math.sin(w.angleBase);
                    }

                    const magnitude = Math.sqrt(reSum * reSum + imSum * imSum);
                    const normalizedAmp = magnitude / totalAmp;
                    
                    const val = Math.min(1, normalizedAmp);
                    const intensity = Math.pow(val, 1.5);

                    const index = (y * width + x) * 4;
                    
                    data[index]     = 10 + (245 * intensity);
                    data[index + 1] = 12 + (208 * intensity);
                    data[index + 2] = 20 + (130 * intensity);
                    data[index + 3] = 255;
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }

        // --- WATER RIPPLE DOMAIN ---
        else if (viewMode === 'water') {
            const imgData = ctx.createImageData(width, height);
            const data = imgData.data;

            const poolRadius = (Math.min(width, height) / 2) * 0.85 * zoom;
            const centerX = cx + pan.x;
            const centerY = cy + pan.y;

            // Pre-calculate wave properties
            const waveParams = activeWaves.map(w => ({
                amp: w.amp,
                // Wave number k (spatial frequency)
                k: w.freq * 0.5, 
                // Speed needs to be proportional to freq for non-dispersive appearance, 
                // or just constant for water look. Let's use constant speed assumption for simplicity:
                // phase = k*r - w*t. 
                speedFactor: w.freq * 8, 
                phaseOffset: (w.phase * Math.PI) / 180
            }));

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const idx = (y * width + x) * 4;

                    if (dist > poolRadius) {
                        // Outside pool - simple dark background
                        data[idx] = 17; data[idx+1] = 24; data[idx+2] = 39; data[idx+3] = 255;
                        continue;
                    }

                    const rNorm = dist / poolRadius; // 0 to 1 inside pool
                    
                    let h = 0;
                    let gradX = 0;
                    let gradY = 0;

                    for (const w of waveParams) {
                        // 1. Outward Wave: sin(k*r - w*t)
                        // Note: dist here is in pixels, we scale k relative to pool size for aesthetics
                        // Let's use normalized radius for calculation to make "frequency" relative to pool size
                        const rVal = rNorm * 20; // 20 units across radius
                        
                        // Outward Phase
                        const argOut = (w.k * rVal) - (time * w.speedFactor) + w.phaseOffset;
                        const wOut = Math.sin(argOut);

                        // 2. Inward (Reflected) Wave: 
                        // Travels distance 2R (center->edge->center). At 'r', it has traveled R + (R-r) = 2R - r.
                        // We subtract amplitude to simulate hard boundary reflection (180 deg phase shift)
                        const rRefl = (2 - rNorm) * 20; 
                        const argIn = (w.k * rRefl) - (time * w.speedFactor) + w.phaseOffset;
                        const wIn = Math.sin(argIn);

                        // Combine with damping on reflection
                        const damping = 0.7;
                        const waveH = w.amp * (wOut - (wIn * damping));
                        h += waveH;

                        // Calculate gradient (derivative) for lighting
                        // d(sin(u))/dx = cos(u) * du/dx.  du/dr = k. dr/dx = x/r.
                        // dH/dr
                        const dOut = w.k * Math.cos(argOut);
                        const dIn = w.k * Math.cos(argIn) * -1 * damping; // chain rule (2-r) -> -1
                        
                        const dHdr = w.amp * (dOut - dIn);
                        
                        // Avoid division by zero at center
                        const safeDist = dist < 1 ? 1 : dist;
                        gradX += dHdr * (dx / safeDist);
                        gradY += dHdr * (dy / safeDist);
                    }

                    // Revised Lighting Model for clarity
                    const slopeScale = 0.02; // Lowered to reduce noise/shimmer
                    const sx = gradX * slopeScale;
                    const sy = gradY * slopeScale;
                    
                    // Light direction (top-left)
                    const lx = -0.6;
                    const ly = -0.6;
                    
                    // Diffuse component (Fake N dot L)
                    // Measures how much the wave slope faces the light source
                    const diffuse = (sx * lx + sy * ly);
                    
                    // Base shading from height (crests lighter, troughs darker)
                    const heightShade = h * 1.2;

                    // Specular Highlight
                    // Sharper exponent (16) reduces widespread shimmer, keeps it to peaks
                    const specular = Math.pow(Math.max(0, diffuse - 0.2), 16) * 60;
                    
                    // Light intensity mixing
                    const lightIntensity = (diffuse * 60);

                    // Color Composition
                    // R: Mostly specular highlight + faint height tint
                    data[idx]   = Math.max(0, Math.min(255, 0 + specular + heightShade * 0.5));
                    // G: Teal/Green tint
                    data[idx+1] = Math.max(0, Math.min(255, 50 + lightIntensity + specular + heightShade));
                    // B: Strong Blue base
                    data[idx+2] = Math.max(0, Math.min(255, 110 + lightIntensity + specular + heightShade));
                    data[idx+3] = 255;
                }
            }
            ctx.putImageData(imgData, 0, 0);

            // Draw vector border
            ctx.beginPath();
            ctx.arc(centerX, centerY, poolRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#60a5fa'; // Blue-400
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // --- NON-NEWTONIAN FLUID (3D MESH) ---
        else if (viewMode === 'fluid') {
            // 3D Projection Parameters
            const gridSize = 63; // Resolution of the mesh (Increased for 3x3 scaling)
            // Scale out to 3x3 area (width * 4.0 covers roughly 3x the previous area)
            const gridSpacing = (width * 4.0) / gridSize; 
            const offset = (gridSize * gridSpacing) / 2;
            
            const cameraZ = 2500 / Math.max(0.1, zoom); 
            const screenScale = 1800; 

            // Auto Rotation
            const rotX = 0.8; // Tilt
            const rotY = time * 0.2 + (pan.x * 0.005); // Spin

            // Pre-calculate wave data
            const waveParams = activeWaves.map(w => ({
                amp: w.amp,
                spatialFreq: (w.freq * Math.PI) / (gridSize / 2),
                angleBase: (w.phase * Math.PI / 180) - (time * w.freq * 8)
            }));

            // Calculate Grid Points
            const points: {x: number, y: number, z: number, depth: number}[] = [];

            for (let z = 0; z < gridSize; z++) {
                for (let x = 0; x < gridSize; x++) {
                    // Physical Coordinates centered at 0
                    const px = (x * gridSpacing) - offset;
                    const pz = (z * gridSpacing) - offset;

                    // Calculate Height (Interference)
                    let h = 0;
                    if (activeWaves.length > 0) {
                        let reSum = 0;
                        let imSum = 0;
                        
                        // Scale normalized coords to -3 to 3 to show 3x3 repetition pattern
                        const nx = ((x / gridSize) * 6) - 3;
                        const nz = ((z / gridSize) * 6) - 3;

                        for (const w of waveParams) {
                            const d = Math.sqrt(nx*nx + nz*nz);
                            const spatialVal = Math.cos(w.spatialFreq * d * 5) + Math.cos(w.spatialFreq * nx * 2);

                            reSum += w.amp * spatialVal * Math.cos(w.angleBase);
                            imSum += w.amp * spatialVal * Math.sin(w.angleBase);
                        }
                        
                        const mag = Math.sqrt(reSum * reSum + imSum * imSum);
                        const threshold = 15; 
                        if (mag > threshold) {
                            // Reduced power and multiplier to prevent spikes from stretching to infinity
                            h = -Math.pow((mag - threshold), 1.2) * 1.5;
                        } else {
                            h = -Math.sin(mag) * 2; 
                        }
                    }

                    // 3D Transformation
                    
                    // 1. Rotation (World Space)
                    // Rotate Y
                    let rx = px * Math.cos(rotY) - pz * Math.sin(rotY);
                    let rz = px * Math.sin(rotY) + pz * Math.cos(rotY);
                    
                    // Rotate X (Tilt)
                    let ry = h * Math.cos(rotX) - rz * Math.sin(rotX);
                    rz = h * Math.sin(rotX) + rz * Math.cos(rotX);

                    // 2. Camera Translation
                    const Z = rz + cameraZ;

                    // 3. Perspective Projection: X' = X / Z
                    if (Z <= 100) continue; // Near clip plane

                    const xPrime = rx / Z;
                    const yPrime = ry / Z;

                    // 4. Viewport Mapping (Screen Space)
                    const sx = xPrime * screenScale + cx;
                    const sy = yPrime * screenScale + cy + (pan.y * 0.5);

                    const depthMetric = screenScale / Z;

                    points.push({ x: sx, y: sy, z: rz, depth: depthMetric });
                }
            }

            // Draw Mesh (Painter's Algorithm by loop order Z then X)
            ctx.lineWidth = 1;
            
            for (let z = 0; z < gridSize - 1; z++) {
                for (let x = 0; x < gridSize - 1; x++) {
                    const i = z * gridSize + x;
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    const p3 = points[i + gridSize + 1];
                    const p4 = points[i + gridSize];

                    if (!p1 || !p2 || !p3 || !p4) continue;

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineTo(p3.x, p3.y);
                    ctx.lineTo(p4.x, p4.y);
                    ctx.closePath();

                    // Fluid Color Grading
                    const heightFactor = Math.min(1, Math.abs(p1.y - cy) / 150);
                    
                    const r = 40 + (heightFactor * 100);
                    const g = 10 + (heightFactor * 200);
                    const b = 60 + (heightFactor * 255);
                    const alpha = 0.4 + (p1.depth * 0.6);

                    ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.8})`;
                    ctx.strokeStyle = `rgba(${r+50},${g+50},${b+100},${alpha * 0.3})`;
                    
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }

    }, [waves, viewMode, zoom, pan, height, isAutoRotating, speed]);

    // Status logic
    React.useEffect(() => {
        const activeWaves = waves.filter(isActive);
        const totalAmp = activeWaves.reduce((s, w) => s + w.amp, 0);
        
        if (totalAmp === 0) {
            setStatus({ text: 'Silence', type: 'silence' });
            return;
        }

        if (viewMode === 'time' && activeWaves.length > 1) {
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
        } else if (viewMode === 'xyz') {
             if (activeWaves.length < 3) setStatus({ text: 'XYZ needs 3 layers (X, Y, Z)', type: 'normal' });
             else setStatus({ text: 'XYZ 3D Lissajous Knot', type: 'normal' });
        } else if (viewMode === 'chladni') {
             setStatus({ text: `Rigid Plate Mode (Zoom: ${zoom.toFixed(1)}x)`, type: 'normal' });
        } else if (viewMode === 'fluid') {
             setStatus({ text: 'Non-Newtonian Simulation (3D)', type: 'normal' });
        } else if (viewMode === 'water') {
             setStatus({ text: 'Wave Tank (Boundary Reflections)', type: 'normal' });
        } else {
             setStatus({ text: 'Composite Wave', type: 'normal' });
        }
        
    }, [waves, viewMode, zoom]);

    const statusColors = {
        normal: 'bg-gray-800 text-gray-400',
        destructive: 'bg-red-900/50 text-red-200 border border-red-500/50 animate-pulse',
        silence: 'bg-gray-800 text-gray-600'
    };

    // Interaction Handlers (Mouse Drag only)
    const handleMouseDown = (e: React.MouseEvent) => {
        if (viewMode !== 'chladni' && viewMode !== 'fluid' && viewMode !== 'water' && viewMode !== 'xyz') return;
        
        // Pause auto-rotation for XYZ when interacting
        if (viewMode === 'xyz') {
            setIsAutoRotating(false);
        }

        setIsDragging(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || (viewMode !== 'chladni' && viewMode !== 'fluid' && viewMode !== 'water' && viewMode !== 'xyz')) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        
        setViewSettings(prev => {
            const current = prev[viewMode];
            return {
                ...prev,
                [viewMode]: {
                    ...current,
                    pan: { x: current.pan.x + dx, y: current.pan.y + dy }
                }
            };
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <div className="bg-gray-900 rounded-xl shadow-xl border border-gray-800 p-4 relative transition-all duration-75 flex flex-col pb-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-3 gap-3 flex-none">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <h2 className="text-white font-semibold text-sm tracking-wide hidden sm:block">
                        {viewMode === 'time' ? 'Time Domain' : viewMode === 'lissajous' ? 'Lissajous (XY)' : viewMode === 'xyz' ? 'Lissajous (XYZ)' : viewMode === 'chladni' ? 'Cymatics (2D)' : viewMode === 'water' ? 'Water' : 'Oobleck (3D)'}
                    </h2>
                    <div className="flex bg-gray-800 rounded-lg p-0.5 w-full sm:w-auto justify-center overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setViewMode('time')}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all whitespace-nowrap ${viewMode === 'time' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Time
                        </button>
                        <button 
                            onClick={() => setViewMode('lissajous')}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all whitespace-nowrap ${viewMode === 'lissajous' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            XY
                        </button>
                        <button 
                            onClick={() => setViewMode('xyz')}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all whitespace-nowrap ${viewMode === 'xyz' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            XYZ
                        </button>
                        <button 
                            onClick={() => setViewMode('chladni')}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all whitespace-nowrap ${viewMode === 'chladni' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Plate
                        </button>
                        <button 
                            onClick={() => setViewMode('water')}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all whitespace-nowrap ${viewMode === 'water' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Water
                        </button>
                        <button 
                            onClick={() => setViewMode('fluid')}
                            className={`flex-1 sm:flex-none px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all whitespace-nowrap ${viewMode === 'fluid' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Fluid
                        </button>
                    </div>

                    {/* Speed Slider */}
                    <div className="flex items-center gap-2 border-l border-gray-700 pl-3 ml-1">
                        <span className="text-[10px] text-gray-500 font-bold uppercase hidden sm:inline">Speed</span>
                        <input 
                            type="range" 
                            min="0" max="4" step="0.1" 
                            value={speed} 
                            onChange={e => setSpeed(parseFloat(e.target.value))}
                            className="w-16 sm:w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <span className="text-xs font-mono text-gray-400 w-8">{speed.toFixed(1)}x</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
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
            
            <div 
                ref={containerRef}
                className="relative w-full bg-gray-950 rounded-lg overflow-hidden ring-1 ring-white/10"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ 
                    cursor: (viewMode === 'chladni' || viewMode === 'fluid' || viewMode === 'water' || viewMode === 'xyz') ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    height: `${height}px`
                }}
            >
                <canvas ref={canvasRef} className="w-full h-full block" />
                {viewMode === 'time' && (
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white opacity-10 pointer-events-none"></div>
                )}

                {/* Resume Rotation Button for XYZ */}
                {viewMode === 'xyz' && !isAutoRotating && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent drag start
                            setIsAutoRotating(true);
                        }}
                        className="absolute bottom-4 right-4 bg-gray-800/80 hover:bg-gray-700 text-white p-2 rounded-full backdrop-blur-sm transition-all border border-gray-600 shadow-lg z-20 group"
                        title="Resume Auto-Rotation"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:animate-spin" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>
            {(viewMode === 'chladni' || viewMode === 'fluid' || viewMode === 'water' || viewMode === 'xyz') && (
                <div className="mt-2 text-[10px] text-gray-500 flex justify-between px-1 flex-none">
                    <span className="flex items-center gap-2">
                        {viewMode === 'chladni' ? (
                            <>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-gray-800 border border-gray-600 rounded-sm"></span>
                                    <span>Quiet</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-amber-200 rounded-sm"></span>
                                    <span>Loud</span>
                                </span>
                            </>
                        ) : viewMode === 'water' ? (
                            <span className="italic text-blue-400/70">
                                2D Ripple Tank
                            </span>
                        ) : viewMode === 'xyz' ? (
                            <span className="italic text-purple-500/70">
                                3D Lissajous Phase Plot
                            </span>
                        ) : (
                            <span className="italic text-cyan-600/70">
                                3D Simulation
                            </span>
                        )}
                    </span>
                    <span className="font-medium text-amber-600">Scroll to Zoom • Drag to Pan</span>
                </div>
            )}
            
            {/* Resizing Handle */}
            <div 
                className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center cursor-ns-resize group hover:bg-gray-800/50 transition-colors rounded-b-xl"
                onMouseDown={startResize}
            >
                <div className="w-12 h-1 rounded-full bg-gray-700 group-hover:bg-gray-500 transition-colors"></div>
            </div>
        </div>
    );
};