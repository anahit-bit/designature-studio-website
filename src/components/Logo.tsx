
import React from 'react';

const LOGO_URLS = {
  horizontal: {
    light:    'https://res.cloudinary.com/dys2k5muv/image/upload/v1779686901/brand/designature-horizontal-oxide-rust.svg',
    reversed: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1780032116/brand/designature-horizontal-oxide-rust-reversed.svg',
  },
  stacked: {
    light:    'https://res.cloudinary.com/dys2k5muv/image/upload/v1779971459/designature-stacked-oxide-rust_o0lzcb.svg',
    reversed: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1780032118/designature-stacked-oxide-rust-reversed_ygsu1z.svg',
  },
  mark: {
    light:    'https://res.cloudinary.com/dys2k5muv/image/upload/v1779971453/designature-mark-oxide-rust_r2k2lc.svg',
    reversed: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1780032121/designature-mark-oxide-rust-reversed_piewmu.svg',
  },
  wordmark: {
    light:    'https://res.cloudinary.com/dys2k5muv/image/upload/v1779971461/designature-wordmark-oxide-rust_jauo5p.svg',
    reversed: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1780032123/designature-wordmark-oxide-rust-reversed_cm3vav.svg',
  },
} as const;

const LOGO_DIMS = {
  horizontal: { w: 820, h: 250 },  // 3.28:1
  stacked:    { w: 420, h: 430 },  // ~1:1 (slightly tall)
  mark:       { w: 220, h: 220 },  // 1:1 square
  wordmark:   { w: 620, h: 170 },  // 3.65:1
} as const;

interface LogoProps {
  invert?: boolean;
  variant?: 'horizontal' | 'stacked' | 'mark' | 'wordmark';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  invert = false,
  variant = 'horizontal',
  className = 'h-8',
}) => {
  const src = LOGO_URLS[variant][invert ? 'reversed' : 'light'];
  const dims = LOGO_DIMS[variant];

  return (
    <img
      src={src}
      alt="Designature Studio"
      width={dims.w}
      height={dims.h}
      decoding="async"
      fetchPriority="high"
      className={`${className} w-auto object-contain transition-all duration-700 cursor-pointer`}
    />
  );
};

export default Logo;
