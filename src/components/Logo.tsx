
import React from 'react';

interface LogoProps {
  className?: string;
  invert?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  className = "h-8", 
  invert = false
}) => {
  // If invert is true (text needs to be white), we tell Cloudinary to colorize it white.
  // Otherwise, we use the original (Black text with the signature Blue dot).
  const logoUrl = invert 
    ? "https://res.cloudinary.com/dys2k5muv/image/upload/co_rgb:ffffff,e_colorize:100/v1771145846/logo_shgdcd.svg"
    : "https://res.cloudinary.com/dys2k5muv/image/upload/v1771145846/logo_shgdcd.svg";

  return (
    <img 
      src={logoUrl}
      alt="Designature Logo"
      className={`${className} w-auto object-contain transition-all duration-700 cursor-pointer`}
    />
  );
};

export default Logo;
