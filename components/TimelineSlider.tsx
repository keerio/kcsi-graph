'use client';

import { useState, useCallback } from 'react';

interface TimelineSliderProps {
  min: number;  // e.g. 2020
  max: number;  // e.g. 2026
  value: [number, number];
  onChange: (range: [number, number]) => void;
}

export default function TimelineSlider({ min, max, value, onChange }: TimelineSliderProps) {
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const range = max - min;
  const leftPct = ((value[0] - min) / range) * 100;
  const rightPct = ((value[1] - min) / range) * 100;

  const years = [];
  for (let y = min; y <= max; y++) years.push(y);

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">Таймлайн</span>
        <span className="text-xs text-slate-500">{value[0]} — {value[1]}</span>
      </div>

      {/* Slider track */}
      <div className="relative h-6 flex items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 h-1 bg-slate-700 rounded-full" />

        {/* Active range */}
        <div
          className="absolute h-1 bg-blue-500/60 rounded-full"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />

        {/* Year ticks */}
        <div className="absolute inset-x-0 top-0 h-6 flex justify-between pointer-events-none">
          {years.map(y => (
            <div key={y} className="flex flex-col items-center">
              <div className="w-px h-1.5 bg-slate-600" />
            </div>
          ))}
        </div>

        {/* Start handle */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value[0]}
          onChange={e => {
            const v = parseInt(e.target.value);
            if (v < value[1]) onChange([v, value[1]]);
          }}
          className="absolute inset-x-0 appearance-none bg-transparent pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10"
        />

        {/* End handle */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value[1]}
          onChange={e => {
            const v = parseInt(e.target.value);
            if (v > value[0]) onChange([value[0], v]);
          }}
          className="absolute inset-x-0 appearance-none bg-transparent pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10"
        />
      </div>

      {/* Year labels */}
      <div className="flex justify-between mt-1">
        {years.map(y => (
          <span key={y} className="text-[10px] text-slate-600">{y}</span>
        ))}
      </div>
    </div>
  );
}
