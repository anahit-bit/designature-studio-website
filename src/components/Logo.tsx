
import React from 'react';

interface LogoProps {
  className?: string;
  invert?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  className = "h-8",
  invert = false
}) => {
  const wordColor = invert ? '#FFFFFF' : '#111111';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="35 30 700 169"
      role="img"
      aria-label="Designature Studio"
      className={`${className} w-auto block transition-all duration-700 cursor-pointer`}
    >
      <g transform="translate(42 37)">
        <rect x="0" y="0" width="126" height="126" fill="none" stroke={wordColor} strokeWidth="9" strokeLinejoin="miter" />
        <circle cx="116" cy="126" r="31" fill="#8E3F2D" />
      </g>
      <text x="220" y="110" fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif" fontWeight="400" fontSize="58" fill={wordColor}>designature</text>
      <text x="224" y="160" fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif" fontWeight="600" fontSize="22" letterSpacing="12" fill="#8E3F2D">STUDIO</text>
    </svg>
  );
};

export default Logo;
