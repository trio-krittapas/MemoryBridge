'use client'

import React, { useEffect, useState } from 'react'

interface WellnessGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export default function WellnessGauge({ score, size = 200, strokeWidth = 20 }: WellnessGaugeProps) {
  const [offset, setOffset] = useState(0);
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  // Only use half the circumference for a semi-circle gauge
  const arcLength = circumference / 2;

  useEffect(() => {
    // Offset calculation: (1 - score/100) * arcLength
    const progressOffset = ((100 - score) / 100) * arcLength;
    setOffset(progressOffset);
  }, [score, arcLength]);

  const getColor = (s: number) => {
    if (s >= 70) return '#10b981'; // Emerald
    if (s >= 40) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div className="relative flex flex-col items-center justify-center pt-8">
      <svg
        width={size}
        height={size / 2 + 20}
        className="transform -rotate-0"
      >
        <path
          d={`M ${strokeWidth},${size / 2} A ${radius},${radius} 0 0 1 ${size - strokeWidth},${size / 2}`}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${strokeWidth},${size / 2} A ${radius},${radius} 0 0 1 ${size - strokeWidth},${size / 2}`}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={arcLength}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pt-16 flex flex-col items-center">
        <span className="text-6xl font-black text-zinc-900 tracking-tighter" style={{ color: getColor(score) }}>{score}</span>
        <span className="text-sm font-bold text-zinc-400 -mt-2">WELLNESS SCORE</span>
      </div>
    </div>
  );
}
