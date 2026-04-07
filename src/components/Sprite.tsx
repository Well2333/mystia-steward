/**
 * Sprite sheet component - renders a single sprite from a sprite sheet
 * Sprite sheets are arranged left-to-right, top-to-bottom
 */
import { cn } from '@/lib/utils';

const SPRITE_CONFIGS = {
  recipe: {
    src: '/assets/sprites/recipe.png',
    cols: 10,
    nativeW: 26,
    nativeH: 26,
    displayW: 48,
    displayH: 48,
    totalW: 260,
    totalH: 494,
  },
  ingredient: {
    src: '/assets/sprites/ingredient.png',
    cols: 10,
    nativeW: 26,
    nativeH: 26,
    displayW: 48,
    displayH: 48,
    totalW: 260,
    totalH: 182,
  },
  beverage: {
    src: '/assets/sprites/beverage.png',
    cols: 10,
    nativeW: 26,
    nativeH: 26,
    displayW: 48,
    displayH: 48,
    totalW: 260,
    totalH: 130,
  },
  customer_rare: {
    src: '/assets/sprites/customer_rare.png',
    cols: 10,
    nativeW: 184,
    nativeH: 184,
    displayW: 80,
    displayH: 80,
    totalW: 1840,
    totalH: 1288,
  },
  customer_normal: {
    src: '/assets/sprites/customer_normal.png',
    cols: 10,
    nativeW: 133,
    nativeH: 177,
    displayW: 80,
    displayH: 80,
    totalW: 1330,
    totalH: 885,
  },
} as const;

type SpriteType = keyof typeof SPRITE_CONFIGS;

interface SpriteProps {
  type: SpriteType;
  index: number;
  size?: number;
  className?: string;
}

export function Sprite({ type, index, size, className }: SpriteProps) {
  const config = SPRITE_CONFIGS[type];
  const col = index % config.cols;
  const row = Math.floor(index / config.cols);

  const displayW = size ?? config.displayW;
  const displayH = size ?? config.displayH;
  const scale = displayW / config.nativeW;

  const bgW = config.totalW * scale;
  const bgH = config.totalH * scale;
  const bgX = -(col * config.nativeW * scale);
  const bgY = -(row * config.nativeH * scale);

  return (
    <span
      className={cn('inline-block shrink-0', className)}
      style={{
        width: displayW,
        height: displayH,
        backgroundImage: `url(${config.src})`,
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}
