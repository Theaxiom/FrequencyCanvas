export interface Wave {
    id: number;
    freq: number;
    amp: number; // 0-100
    phase: number; // 0-360
    color: string;
    muted?: boolean;
}

export interface DFTCoefficient {
    freq: number;
    amp: number;
    phase: number;
}

export type PresetType = 'square' | 'saw' | 'clear';

export const COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16'  // Lime
];
