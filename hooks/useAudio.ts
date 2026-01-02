import { useEffect, useRef, useState } from 'react';
import { Wave } from '../types';

// Visual frequencies (1-10Hz) are too low for audio. 
// We multiply by this factor to map them to an audible range while preserving harmonic ratios.
const FREQ_MULTIPLIER = 20;

export const useAudio = (waves: Wave[]) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const oscillatorsRef = useRef<Map<number, { osc: OscillatorNode, gain: GainNode }>>(new Map());
    const masterGainRef = useRef<GainNode | null>(null);

    const toggleAudio = async () => {
        if (!isPlaying) {
            // Init Audio Context on user gesture
            if (!audioCtxRef.current) {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                audioCtxRef.current = new AudioContext();
                
                // Master Gain (Volume limit)
                const master = audioCtxRef.current.createGain();
                master.gain.value = 0.2; // Reduced volume to prevent clipping with multiple waves
                master.connect(audioCtxRef.current.destination);
                masterGainRef.current = master;
            }

            if (audioCtxRef.current.state === 'suspended') {
                await audioCtxRef.current.resume();
            }
            setIsPlaying(true);
        } else {
            if (audioCtxRef.current) {
                audioCtxRef.current.suspend();
            }
            setIsPlaying(false);
        }
    };

    // Sync React State with Web Audio API
    useEffect(() => {
        if (!audioCtxRef.current || !masterGainRef.current) return;
        const ctx = audioCtxRef.current;
        const now = ctx.currentTime;

        // 1. Remove oscillators for waves that no longer exist or are strictly muted
        const currentIds = new Set(waves.map(w => w.id));
        oscillatorsRef.current.forEach((nodes, id) => {
            if (!currentIds.has(id)) {
                try {
                    nodes.osc.stop();
                    nodes.osc.disconnect();
                    nodes.gain.disconnect();
                } catch (e) {
                    // Ignore already stopped errors
                }
                oscillatorsRef.current.delete(id);
            }
        });

        // 2. Create or Update oscillators
        waves.forEach(wave => {
            let nodes = oscillatorsRef.current.get(wave.id);

            if (!nodes) {
                // Create new
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sine';
                osc.connect(gain);
                gain.connect(masterGainRef.current!);
                osc.start();

                nodes = { osc, gain };
                oscillatorsRef.current.set(wave.id, nodes);
            }

            // Update Parameters
            // Map visual freq to audio freq
            const audioFreq = wave.freq * FREQ_MULTIPLIER;
            nodes.osc.frequency.setTargetAtTime(audioFreq, now, 0.05);

            // Amplitude (Volume)
            // If muted or amp is 0, gain is 0. 
            // We normalize amp 0-100 to 0-1 gain.
            // We also divide by waves.length (roughly) or just keep it low to avoid distortion?
            // Let's just use the amp value directly scaled down.
            const targetGain = wave.muted ? 0 : (wave.amp / 100);
            nodes.gain.gain.setTargetAtTime(targetGain, now, 0.05);
        });

    }, [waves, isPlaying]);

    return { isPlaying, toggleAudio };
};
