
import React from 'react';

interface LogoProps {
  className?: string;
  invert?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  className = "h-8",
  invert = false
}) => {
  return (
    <img
      src="https://res.cloudinary.com/dys2k5muv/image/upload/v1771145846/logo_shgdcd.svg"
      alt="Designature Logo"
      className={`${className} w-auto object-contain transition-all duration-700 cursor-pointer`}
      style={invert ? { filter: 'brightness(0) invert(1)' } : undefined}
    />
  );
};

export default Logo;
