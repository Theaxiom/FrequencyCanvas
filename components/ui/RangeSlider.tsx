import React from 'react';

interface RangeSliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    valueDisplay?: string | number; // Kept for interface compatibility but unused in new design
    color?: string;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({ 
    label, 
    valueDisplay, 
    color = '#4F46E5', 
    className = '',
    value,
    onChange,
    min,
    max,
    step,
    ...props 
}) => {
    return (
        <div className={`w-full ${className}`}>
            <div className="flex justify-between items-center mb-1">
                {label && <span className="text-xs text-gray-500 font-medium select-none">{label}</span>}
                <input 
                    type="number"
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onChange={onChange}
                    className="text-xs font-mono text-gray-700 bg-gray-50 hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded px-1.5 py-0.5 w-16 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                />
            </div>
            <input 
                type="range" 
                className="w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded cursor-pointer"
                style={{ color }}
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={onChange}
                {...props} 
            />
        </div>
    );
};
