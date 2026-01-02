import React, { useState } from 'react';
import { MasterOutput } from './components/WaveLab/MasterOutput';
import { WaveCard } from './components/WaveLab/WaveCard';
import { FourierLab } from './components/Fourier/FourierLab';
import { Wave, COLORS } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'interference' | 'fourier'>('interference');
  const [nextId, setNextId] = useState(3);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  
  const [waves, setWaves] = useState<Wave[]>([
    { id: 1, freq: 2, amp: 50, phase: 0, color: COLORS[0], muted: false },
    { id: 2, freq: 3, amp: 30, phase: 0, color: COLORS[1], muted: false }
  ]);

  const addWave = (partial?: Partial<Wave>) => {
    const color = COLORS[(nextId - 1) % COLORS.length];
    setWaves(prev => [
      ...prev, 
      { id: nextId, freq: 2, amp: 50, phase: 0, color, muted: false, ...partial }
    ]);
    setNextId(n => n + 1);
  };

  const removeWave = (id: number) => {
    setWaves(prev => prev.filter(w => w.id !== id));
  };

  const updateWave = (id: number, updates: Partial<Wave>) => {
    setWaves(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const addCounterWave = (targetId: number) => {
    const target = waves.find(w => w.id === targetId);
    if (!target) return;
    
    const color = COLORS[(nextId - 1) % COLORS.length];
    setWaves(prev => [
      ...prev,
      { 
        id: nextId, 
        freq: target.freq, 
        amp: target.amp, 
        phase: (target.phase + 180) % 360, 
        color,
        muted: false
      }
    ]);
    setNextId(n => n + 1);
  };

  // --- PHYSICS PRESETS ---
  const applyPreset = (type: string) => {
    // Reset ID counter for cleaner look on presets
    let tempId = 1;
    const newWaves: Wave[] = [];

    const create = (f: number, a: number, p: number) => {
        newWaves.push({
            id: tempId,
            freq: f,
            amp: a,
            phase: p,
            color: COLORS[(tempId - 1) % COLORS.length],
            muted: false
        });
        tempId++;
    };

    switch(type) {
        // --- INTERFERENCE ---
        case 'beats':
            // Beat Frequency: Two waves close in frequency. 
            // 20x multiplier -> 10*20=200Hz, 10.2*20=204Hz. Beat=4Hz (nice wah-wah).
            create(10, 50, 0);
            create(10.2, 50, 0); 
            break;
        case 'standing':
            // Standing Wave: Two identical waves moving in opposite directions
            // Visually represented by phase opposition here for interference
            create(5, 50, 0);
            create(5, 50, 180);
            break;
        case 'am_synth':
            // AM Synthesis Sidebands (Carrier 10Hz, Mod 2Hz)
            // C: 10Hz, L: 8Hz, U: 12Hz
            create(8, 25, 0);
            create(10, 50, 0);
            create(12, 25, 0);
            break;

        // --- HARMONICS & TIMBRE ---
        case 'square_approx':
            // Square Wave: Odd harmonics (f, 3f, 5f) with 1/n amplitude
            create(4, 50, 0);
            create(12, 16.6, 0); // 50/3
            create(20, 10, 0);   // 50/5
            break;
        case 'saw_approx':
            // Sawtooth: All harmonics (f, 2f, 3f) with 1/n amplitude
            create(4, 50, 0);
            create(8, 25, 0);
            create(12, 16.6, 0);
            break;
        case 'octaves':
            // Octave Stack: 1:2:4
            create(4, 50, 0); // 80Hz
            create(8, 30, 0); // 160Hz
            create(16, 15, 0); // 320Hz
            break;

        // --- MUSIC INTERVALS ---
        case 'major':
            // Major Chord (Just Intonation): 4:5:6 ratio
            create(6, 40, 0); // Root
            create(7.5, 30, 0); // Major Third
            create(9, 30, 0); // Perfect Fifth
            break;
        case 'minor':
            // Minor Chord (Just Intonation): 10:12:15 ratio
            create(5, 40, 0);   // 10 scaled down
            create(6, 30, 0);   // 12 scaled down
            create(7.5, 30, 0); // 15 scaled down
            break;
        case 'golden':
            // Golden Ratio (Phi) Dissonance
            create(8, 50, 0);
            create(8 * 1.618, 50, 0);
            break;

        // --- LISSAJOUS ---
        case 'lissajous_circle':
            // 1:1 Ratio, 90 deg phase
            create(5, 50, 0);
            create(5, 50, 90);
            break;
        case 'lissajous_knot':
            // 3:2 Ratio (Fifth) makes a nice knot in XY mode
            create(3, 50, 0);
            create(2, 50, 90); 
            break;
        case 'lissajous_8':
            // 1:2 Ratio, 90 deg phase (Figure 8)
            create(6, 50, 90);
            create(3, 50, 0);
            break;
    }
    
    setWaves(newWaves);
    setNextId(tempId);
    setIsPresetOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-opacity-90">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">Frequency Canvas</h1>
            </div>
            
            <nav className="flex p-1 space-x-1 bg-gray-100/80 rounded-xl">
                <button
                    onClick={() => setActiveTab('interference')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'interference' 
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                    }`}
                >
                    Wave Lab
                </button>
                <button
                    onClick={() => setActiveTab('fourier')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'fourier' 
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                    }`}
                >
                    Fourier Drawing
                </button>
            </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {activeTab === 'interference' ? (
          <div className="space-y-8 animate-fade-in">
             <MasterOutput waves={waves} />
             
             <div>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-gray-900">Frequency Layers</h3>
                    
                    <div className="flex gap-2 items-center">
                        <div className="relative">
                            <button 
                                onClick={() => setIsPresetOpen(!isPresetOpen)}
                                className={`px-3 py-2 bg-white border ${isPresetOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200 hover:border-indigo-300'} text-gray-700 text-xs font-medium rounded-lg shadow-sm transition-all flex items-center gap-1`}
                            >
                                <span>⚡ Physics Presets</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${isPresetOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            {/* Dropdown */}
                            {isPresetOpen && (
                                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in max-h-96 overflow-y-auto">
                                    
                                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">Interference</div>
                                    <button onClick={() => applyPreset('beats')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-l-2 border-transparent hover:border-indigo-500">
                                        Binaural Beats (4Hz diff)
                                    </button>
                                    <button onClick={() => applyPreset('standing')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-red-50 hover:text-red-700 border-l-2 border-transparent hover:border-red-500">
                                        Phase Cancellation
                                    </button>
                                    <button onClick={() => applyPreset('am_synth')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-l-2 border-transparent hover:border-indigo-500">
                                        AM Synthesis (Sidebands)
                                    </button>

                                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-t border-gray-100">Harmonics</div>
                                    <button onClick={() => applyPreset('square_approx')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-l-2 border-transparent hover:border-indigo-500">
                                        Square Wave Approx
                                    </button>
                                    <button onClick={() => applyPreset('saw_approx')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-l-2 border-transparent hover:border-indigo-500">
                                        Sawtooth Wave Approx
                                    </button>
                                    <button onClick={() => applyPreset('octaves')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-l-2 border-transparent hover:border-indigo-500">
                                        Octave Stack (1:2:4)
                                    </button>

                                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-t border-gray-100">Music Ratios</div>
                                    <button onClick={() => applyPreset('major')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-l-2 border-transparent hover:border-indigo-500">
                                        Major Chord (4:5:6)
                                    </button>
                                    <button onClick={() => applyPreset('minor')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-l-2 border-transparent hover:border-indigo-500">
                                        Minor Chord (10:12:15)
                                    </button>
                                    <button onClick={() => applyPreset('golden')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-l-2 border-transparent hover:border-indigo-500">
                                        Golden Ratio (Phi)
                                    </button>

                                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-t border-gray-100">Lissajous (XY)</div>
                                    <button onClick={() => applyPreset('lissajous_circle')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-pink-50 hover:text-pink-700 border-l-2 border-transparent hover:border-pink-500">
                                        Perfect Circle (90°)
                                    </button>
                                    <button onClick={() => applyPreset('lissajous_knot')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-pink-50 hover:text-pink-700 border-l-2 border-transparent hover:border-pink-500">
                                        Knot (3:2 Ratio)
                                    </button>
                                    <button onClick={() => applyPreset('lissajous_8')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-pink-50 hover:text-pink-700 border-l-2 border-transparent hover:border-pink-500">
                                        Figure 8 (1:2 Ratio)
                                    </button>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => addWave()} 
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {waves.map((wave) => (
                        <WaveCard 
                            key={wave.id} 
                            wave={wave} 
                            onChange={updateWave} 
                            onRemove={removeWave}
                            onCounter={addCounterWave}
                            isRemovable={waves.length > 1}
                        />
                    ))}
                </div>
             </div>
          </div>
        ) : (
          <FourierLab />
        )}

      </main>
      
      <footer className="py-6 text-center text-sm text-gray-400 border-t border-gray-200 mt-auto">
        <p>Mathematical Visualization &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
