import React from 'react';

interface DBCLogoProps {
  className?: string;
  size?: number;
}

export default function DBCLogo({ className = "", size = 32 }: DBCLogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Forme géométrique inspirée du logo DBC */}
        <path
          d="M4 8 L16 4 L28 8 L28 20 L16 28 L4 20 Z"
          fill="#D8E142"
          stroke="#034638"
          strokeWidth="1"
        />
        <path
          d="M8 12 L16 10 L24 12 L24 18 L16 22 L8 18 Z"
          fill="#00BF6F"
        />
        {/* Lettre D stylisée */}
        <text
          x="16"
          y="18"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#034638"
          fontSize="12"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
        >
          D
        </text>
      </svg>
    </div>
  );
} 