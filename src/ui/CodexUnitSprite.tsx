import type { CodexPortraitKind } from '../game/codex/codexData';
import type { EnemyKind } from '../game/config/enemyConfig';
import { enemyKindFill, enemyKindStroke } from '../game/survivor/enemyWorldVisual';

/** 0xRRGGBB → `#rrggbb` */
function hx(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** 与 `playerWorldVisual`  idle 配色一致 */
const HERO = {
  body: '#5c6d7c',
  shadow: '#4a5a68',
  skin: '#c49a78',
  cap: '#3a4858',
  brim: '#2a3442',
  star: '#d82828',
  belt: '#4a3828',
  leg: '#3a342c',
  outline: '#2a2218',
  wood: '#4a3528',
  metal: '#2c3238',
};

function gunDark(fill: number): string {
  return hx(((fill & 0xfefefe) >> 1) | 0x080808);
}

/** 游击队员 idle，枪指向右侧 */
function SpriteHero(): JSX.Element {
  const y = -4;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="9" ry="11" fill={HERO.body} stroke={HERO.outline} strokeWidth="2" />
      <rect x="-5" y={y + 1} width="10" height="3" rx="1" fill={HERO.shadow} />
      <line x1="-5" y1={y + 5} x2="5" y2={y + 5} stroke={HERO.belt} strokeWidth="2" />
      <circle cx="0" cy={y - 10} r="5" fill={HERO.skin} stroke={HERO.outline} strokeWidth="2" />
      <ellipse cx="0" cy={y - 13} rx="8" ry="5" fill={HERO.cap} stroke={HERO.outline} strokeWidth="2" />
      <rect x="1" y={y - 12} width="9" height="3" rx="1" fill={HERO.brim} />
      <circle cx="4" cy={y - 12} r="2.2" fill={HERO.star} />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 17} stroke={HERO.leg} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 17} stroke={HERO.leg} strokeWidth="3" />
      <g transform={`translate(5 ${y - 0.5})`}>
        <rect x="0" y="-2.5" width="10" height="5" rx="2" fill={HERO.wood} />
        <rect x="9" y="-2" width="8" height="4" rx="1" fill={HERO.metal} />
      </g>
    </g>
  );
}

/** 步兵 idle（`bodyY = -4`） */
function SpriteInfantry({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="9" ry="11" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="0" cy={y - 12} r="6" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="5" y={y - 3} width="17" height="5" rx="2" fill={g} />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 17} stroke={stroke} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 17} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpritePuppet({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="9" ry="11" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="-4" y={y - 2} width="7" height="6" rx="2" fill="#9a9088" opacity="0.92" />
      <circle cx="0" cy={y - 12} r="6" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="4" y={y - 3} width="15" height="5" rx="2" fill={g} />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 17} stroke={stroke} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 17} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpriteDog({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const hy = -3;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={hy} rx="11" ry="7" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="8" cy={hy - 1} r="4.5" fill={fill} stroke={stroke} strokeWidth="2" />
      <polyline points={`6,${hy - 4} 9,${hy - 7} 7,${hy - 5}`} fill="none" stroke={stroke} strokeWidth="2" />
      <line x1="-9" y1={hy - 2} x2="-14" y2={hy - 5} stroke={stroke} strokeWidth="2.5" />
      <line x1="-3" y1={hy + 4} x2="-3" y2={hy + 10} stroke={stroke} strokeWidth="2.5" />
      <line x1="3" y1={hy + 4} x2="3" y2={hy + 10} stroke={stroke} strokeWidth="2.5" />
      <line x1="-6" y1={hy + 5} x2="-6" y2={hy + 10} stroke={stroke} strokeWidth="2.5" />
      <line x1="6" y1={hy + 5} x2="6" y2={hy + 10} stroke={stroke} strokeWidth="2.5" />
    </g>
  );
}

function SpriteCavalry({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const horseY = 1;
  const fnum = parseInt(fill.slice(1), 16);
  const horseFill = hx(((fnum & 0xfefefe) >> 1) | 0x181008);
  const g = gunDark(fnum);
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={horseY} rx="13" ry="8" fill={horseFill} stroke={stroke} strokeWidth="2" />
      <line x1="-8" y1={horseY + 5} x2="-8" y2={horseY + 11} stroke={stroke} strokeWidth="2.5" />
      <line x1="-2" y1={horseY + 6} x2="-2" y2={horseY + 11} stroke={stroke} strokeWidth="2.5" />
      <line x1="2" y1={horseY + 6} x2="2" y2={horseY + 11} stroke={stroke} strokeWidth="2.5" />
      <line x1="8" y1={horseY + 5} x2="8" y2={horseY + 11} stroke={stroke} strokeWidth="2.5" />
      <ellipse cx="0" cy={y - 5} rx="7" ry="9" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="0" cy={y - 16} r="5" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="4" y={y - 8} width="14" height="4" rx="2" fill={g} />
    </g>
  );
}

function SpriteMg({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="10" ry="12" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="0" cy={y - 12} r="6" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="5" y={y - 4} width="22" height="6" rx="2" fill={g} />
      <rect x="2" y={y + 1} width="5" height="4" rx="1" fill={g} opacity="0.85" />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 17} stroke={stroke} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 17} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpriteArtillery({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const tube = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="11" ry="10" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="0" cy={y - 11} r="5.5" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="3" y={y - 14} width="5" height="16" rx="2" fill={tube} />
      <line x1="-5" y1={y + 8} x2="-5" y2={y + 16} stroke={stroke} strokeWidth="3" />
      <line x1="5" y1={y + 8} x2="5" y2={y + 16} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpriteOfficer({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const capFill = hx(((parseInt(fill.slice(1), 16) & 0xfefefe) >> 1) | 0x101010);
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="9" ry="11" fill={fill} stroke={stroke} strokeWidth="2" />
      <line x1="-3" y1={y + 2} x2="4" y2={y + 8} stroke="#7a2828" strokeWidth="3" opacity="0.92" />
      <circle cx="0" cy={y - 12} r="6" fill={fill} stroke={stroke} strokeWidth="2" />
      <ellipse cx="0" cy={y - 14} rx="7" ry="4" fill={capFill} stroke={stroke} strokeWidth="1.5" />
      <line x1="-2" y1={y - 16} x2="6" y2={y - 13} stroke={stroke} strokeWidth="2" />
      <rect x="5" y={y - 1} width="6" height="3" rx="1" fill="#2a2420" />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 17} stroke={stroke} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 17} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpriteSniper({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="9" ry="11" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="0" cy={y - 12} r="6" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="4" y={y - 4} width="24" height="4" rx="2" fill={g} />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 17} stroke={stroke} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 17} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpriteGrenadier({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="10" ry="11" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="0" cy={y - 12} r="5.5" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="-3" cy={y + 1} r="2.2" fill="#2a2218" opacity="0.85" />
      <circle cx="1" cy={y + 2} r="2.2" fill="#2a2218" opacity="0.85" />
      <rect x="4" y={y - 2} width="12" height="4" rx="1" fill={g} />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 16} stroke={stroke} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 16} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpriteEngineer({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="9" ry="11" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="-6" y={y - 4} width="5" height="8" rx="1" fill={hx(((parseInt(fill.slice(1), 16) & 0xfefefe) >> 1) | 0x101010)} />
      <circle cx="0" cy={y - 12} r="6" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="5" y={y - 2} width="8" height="3" rx="1" fill="#3a3530" />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 17} stroke={stroke} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 17} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpriteHeavy({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="11" ry="12" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="0" cy={y - 12} r="6.5" fill={fill} stroke={stroke} strokeWidth="2" />
      <ellipse cx="0" cy={y - 14} rx="7" ry="4" fill={hx(((parseInt(fill.slice(1), 16) & 0xfefefe) >> 1) | 0x101010)} stroke={stroke} strokeWidth="1.5" />
      <rect x="5" y={y - 3} width="16" height="5" rx="2" fill={g} />
      <line x1="-5" y1={y + 9} x2="-5" y2={y + 17} stroke={stroke} strokeWidth="3" />
      <line x1="5" y1={y + 9} x2="5" y2={y + 17} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpriteScoutCar({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const cy = -2;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="-14" y={cy - 4} width="28" height="12" rx="3" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="-9" cy={cy + 7} r="2.5" fill="#1a1814" />
      <circle cx="9" cy={cy + 7} r="2.5" fill="#1a1814" />
      <circle cx="0" cy={cy - 2} r="4" fill={g} stroke={stroke} strokeWidth="1.5" />
      <rect x="2" y={cy - 5} width="10" height="3" rx="1" fill={g} />
    </g>
  );
}

function SpritePlaneRecon({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const cy = -3;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={cy} rx="4" ry="14" fill={fill} stroke={stroke} strokeWidth="2" />
      <line x1="-16" y1={cy} x2="16" y2={cy} stroke={stroke} strokeWidth="2.5" />
      <polygon points={`0,${cy - 10} -3,${cy - 14} 3,${cy - 14}`} fill={hx(((parseInt(fill.slice(1), 16) & 0xfefefe) >> 1) | 0x101010)} stroke={stroke} strokeWidth="1.5" />
    </g>
  );
}

function SpritePlaneFighter({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const cy = -3;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={cy} rx="5" ry="13" fill={fill} stroke={stroke} strokeWidth="2" />
      <polygon points={`-4,${cy - 2} -18,${cy + 6} -6,${cy + 4}`} fill={fill} stroke={stroke} strokeWidth="2" />
      <polygon points={`4,${cy - 2} 18,${cy + 6} 6,${cy + 4}`} fill={fill} stroke={stroke} strokeWidth="2" />
    </g>
  );
}

function SpritePlaneBomber({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const cy = -2;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={cy} rx="7" ry="12" fill={fill} stroke={stroke} strokeWidth="2" />
      <line x1="-22" y1={cy + 2} x2="22" y2={cy + 2} stroke={stroke} strokeWidth="2.5" />
      <circle cx="0" cy={cy + 5} r="2.5" fill="#2a2018" />
    </g>
  );
}

function SpriteGunship({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const cy = -3;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={cy} rx="6" ry="13" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="-11" y={cy - 1} width="6" height="4" rx="1" fill={g} />
      <rect x="5" y={cy - 1} width="6" height="4" rx="1" fill={g} />
      <line x1="-14" y1={cy + 5} x2="14" y2={cy + 5} stroke={stroke} strokeWidth="2" />
    </g>
  );
}

function SpriteParatrooper({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M -8 -20 Q 0 -28 8 -20" fill="none" stroke={stroke} strokeWidth="2" opacity="0.75" />
      <ellipse cx="0" cy={y} rx="8" ry="10" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="0" cy={y - 11} r="5" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="4" y={y - 3} width="14" height="4" rx="2" fill={g} />
      <line x1="-3" y1={y + 8} x2="-3" y2={y + 15} stroke={stroke} strokeWidth="2.5" />
      <line x1="3" y1={y + 8} x2="3" y2={y + 15} stroke={stroke} strokeWidth="2.5" />
    </g>
  );
}

function spriteEnemy(kind: EnemyKind, fill: string, stroke: string): JSX.Element {
  switch (kind) {
    case 'infantry':
      return <SpriteInfantry fill={fill} stroke={stroke} />;
    case 'puppet':
      return <SpritePuppet fill={fill} stroke={stroke} />;
    case 'dog':
      return <SpriteDog fill={fill} stroke={stroke} />;
    case 'cavalry':
      return <SpriteCavalry fill={fill} stroke={stroke} />;
    case 'mg':
      return <SpriteMg fill={fill} stroke={stroke} />;
    case 'artillery':
      return <SpriteArtillery fill={fill} stroke={stroke} />;
    case 'officer':
      return <SpriteOfficer fill={fill} stroke={stroke} />;
    case 'sniper':
      return <SpriteSniper fill={fill} stroke={stroke} />;
    case 'grenadier':
      return <SpriteGrenadier fill={fill} stroke={stroke} />;
    case 'engineer':
      return <SpriteEngineer fill={fill} stroke={stroke} />;
    case 'heavy_infantry':
      return <SpriteHeavy fill={fill} stroke={stroke} />;
    case 'scout_car':
      return <SpriteScoutCar fill={fill} stroke={stroke} />;
    case 'recon_plane':
      return <SpritePlaneRecon fill={fill} stroke={stroke} />;
    case 'fighter_plane':
      return <SpritePlaneFighter fill={fill} stroke={stroke} />;
    case 'bomber_plane':
      return <SpritePlaneBomber fill={fill} stroke={stroke} />;
    case 'gunship':
      return <SpriteGunship fill={fill} stroke={stroke} />;
    case 'paratrooper':
      return <SpriteParatrooper fill={fill} stroke={stroke} />;
    default:
      return <SpriteInfantry fill={fill} stroke={stroke} />;
  }
}

/**
 * 图鉴用矢量立绘：坐标与局内 `playerWorldVisual` / `enemyWorldVisual` idle 对齐，便于日后换皮一致
 * @param kind - `hero` 或敌兵种类
 * @param className - 外层 `svg` 的语义化尺寸类（如 `codex-sprite`）
 */
export function CodexUnitSprite({ kind, className = '' }: { kind: CodexPortraitKind; className?: string }): JSX.Element {
  const inner =
    kind === 'hero' ? (
      <SpriteHero />
    ) : (
      spriteEnemy(kind, hx(enemyKindFill(kind)), hx(enemyKindStroke(kind)))
    );

  return (
    <svg
      className={className}
      viewBox="-24 -24 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {inner}
    </svg>
  );
}
