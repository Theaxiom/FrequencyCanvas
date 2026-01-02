import { DFTCoefficient } from '../types';

export const computeDFT = (signal: number[], maxHarmonics: number = 100): DFTCoefficient[] => {
    const N = signal.length;
    const coefficients: DFTCoefficient[] = [];

    for (let k = 0; k < maxHarmonics; k++) {
        let re = 0;
        let im = 0;

        for (let n = 0; n < N; n++) {
            const phi = (2 * Math.PI * k * n) / N;
            re += signal[n] * Math.cos(phi);
            im -= signal[n] * Math.sin(phi);
        }

        re = re / N;
        im = im / N;

        let freq = k;
        let amp = Math.sqrt(re * re + im * im);
        let phase = Math.atan2(im, re);

        // For real-valued signals, the energy is split between positive and negative frequencies.
        // We multiply DC component by 1 and AC components by 2 to recover full amplitude.
        if (k !== 0) {
            amp = amp * 2;
        }

        coefficients.push({ freq, amp, phase });
    }

    return coefficients;
};

export const generatePresetWave = (type: 'square' | 'saw', length: number = 200): number[] => {
    const wave: number[] = [];
    for (let i = 0; i < length; i++) {
        const t = i / length;
        let val = 0.5;
        if (type === 'square') {
            val = t < 0.5 ? 0.8 : 0.2;
        } else if (type === 'saw') {
            val = 0.2 + (0.6 * t);
        }
        wave.push(val);
    }
    return wave;
};
