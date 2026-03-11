import Image from 'next/image';

type SouthernCrossLogoVariant = 'long' | 'square';

const LOGO_MAP: Record<SouthernCrossLogoVariant, { src: string; width: number; height: number; alt: string }> = {
  long: {
    src: '/scx-logo-long.png',
    width: 1200,
    height: 500,
    alt: 'SouthernCross AI logo',
  },
  square: {
    src: '/scx-logo-square.png',
    width: 2160,
    height: 2160,
    alt: 'SouthernCross AI icon',
  },
};

type SouthernCrossLogoProps = {
  className?: string;
  width?: number;
  height?: number;
  color?: string; // retained for backwards compatibility, ignored for PNG assets
  priority?: boolean;
  variant?: SouthernCrossLogoVariant;
};

export function SouthernCrossLogo({
  className,
  width,
  height,
  color: _color,
  priority,
  variant = 'long',
}: SouthernCrossLogoProps) {
  const logo = LOGO_MAP[variant];

  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={width ?? logo.width}
      height={height ?? logo.height}
      className={className}
      priority={priority}
    />
  );
}
