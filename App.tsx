import React, { useState } from 'react';
import { MasterOutput } from './components/WaveLab/MasterOutput';
import { WaveCard } from './components/WaveLab/WaveCard';
import { FourierLab } from './components/Fourier/FourierLab';
import { Wave, COLORS } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'interference' | 'fourier'>('interference');
  const [nextId, setNextId] = useState(3);
  
  const [waves, setWaves] = useState<Wave[]>([
    { id: 1, freq: 1, amp: 50, phase: 0, color: COLORS[0], muted: false },
    { id: 2, freq: 1.5, amp: 30, phase: 45, color: COLORS[1], muted: false }
  ]);

  const addWave = () => {
    const color = COLORS[(nextId - 1) % COLORS.length];
    setWaves(prev => [
      ...prev, 
      { id: nextId, freq: 1, amp: 50, phase: 0, color, muted: false }
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
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Frequency Layers</h3>
                    <button 
                        onClick={addWave} 
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Frequency
                    </button>
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
