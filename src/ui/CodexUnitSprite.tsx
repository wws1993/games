import type { CodexHeroPortraitKind, CodexPortraitKind } from '../game/codex/codexData';
import { isCodexHeroPortraitKind } from '../game/codex/codexData';
import type { EnemyKind } from '../game/config/enemyConfig';
import {
  DEFAULT_PLAYER_VECTOR_PALETTE,
  type PlayerVectorPalette,
} from '../game/meta/metaUnlockShopConfig';
import { enemyKindFill, enemyKindStroke } from '../game/survivor/enemyWorldVisual';

/** 0xRRGGBB → `#rrggbb` */
function hx(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** 将存档矢量配色转为 SVG 用 hex（与 `playerWorldVisual` 一致） */
function heroPaletteToCss(
  p: PlayerVectorPalette,
): {
  body: string;
  shadow: string;
  skin: string;
  cap: string;
  brim: string;
  star: string;
  belt: string;
  leg: string;
  outline: string;
} {
  return {
    body: hx(p.uniformBody),
    shadow: hx(p.uniformShadow),
    skin: hx(p.skin),
    cap: hx(p.capBody),
    brim: hx(p.capBrim),
    star: hx(p.capStar),
    belt: hx(p.belt),
    leg: hx(p.legCloth),
    outline: hx(p.outline),
  };
}

function gunDark(fill: number): string {
  return hx(((fill & 0xfefefe) >> 1) | 0x080808);
}

/** 游击队员：制式帽徽、三八式步枪、背带；配色与枪木/金属来自局外商店存档 */
function SpriteHeroGuerrilla({
  palette,
  gunWood,
  gunMetal,
}: {
  palette: PlayerVectorPalette;
  gunWood: number;
  gunMetal: number;
}): JSX.Element {
  const H = heroPaletteToCss(palette);
  const wood = hx(gunWood);
  const metal = hx(gunMetal);
  const y = -4;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <line x1="-6" y1={y - 4} x2="6" y2={y + 6} stroke={H.shadow} strokeWidth="2.5" opacity="0.55" />
      <ellipse cx="0" cy={y} rx="9" ry="11" fill={H.body} stroke={H.outline} strokeWidth="2" />
      <rect x="-5" y={y + 1} width="10" height="3" rx="1" fill={H.shadow} />
      <line x1="-5" y1={y + 5} x2="5" y2={y + 5} stroke={H.belt} strokeWidth="2" />
      <circle cx="0" cy={y - 10} r="5" fill={H.skin} stroke={H.outline} strokeWidth="2" />
      <ellipse cx="0" cy={y - 13} rx="8" ry="5" fill={H.cap} stroke={H.outline} strokeWidth="2" />
      <rect x="1" y={y - 12} width="9" height="3" rx="1" fill={H.brim} />
      <circle cx="4" cy={y - 12} r="2.2" fill={H.star} />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 17} stroke={H.leg} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 17} stroke={H.leg} strokeWidth="3" />
      <g transform={`translate(5 ${y - 0.5})`}>
        <rect x="0" y="-2.5" width="11" height="5" rx="2" fill={wood} />
        <rect x="10" y="-2" width="9" height="4" rx="1" fill={metal} />
        <rect x="17" y="-1.5" width="5" height="3" rx="0.5" fill={metal} opacity="0.9" />
      </g>
    </g>
  );
}

/** 燕双鹰：长风衣轮廓、双持短枪（驳壳/快机意象） */
function SpriteHeroYanShuangying({
  palette,
  gunWood,
  gunMetal,
}: {
  palette: PlayerVectorPalette;
  gunWood: number;
  gunMetal: number;
}): JSX.Element {
  const H = heroPaletteToCss(palette);
  const wood = hx(gunWood);
  const metal = hx(gunMetal);
  const y = -4;
  const coat = H.shadow;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path
        d={`M -12 ${y + 10} L -9 ${y - 14} L 9 ${y - 14} L 12 ${y + 10} L 7 ${y + 11} L -7 ${y + 11} Z`}
        fill={H.body}
        stroke={H.outline}
        strokeWidth="1.8"
        opacity="0.92"
      />
      <ellipse cx="0" cy={y} rx="7" ry="9" fill={H.body} stroke={H.outline} strokeWidth="1.8" />
      <line x1="-5" y1={y + 4} x2="5" y2={y + 4} stroke={coat} strokeWidth="2.2" opacity="0.75" />
      <circle cx="0" cy={y - 10} r="4.8" fill={H.skin} stroke={H.outline} strokeWidth="1.8" />
      <path
        d={`M -7 ${y - 14} Q 0 ${y - 19} 7 ${y - 14} L 6 ${y - 11} L -6 ${y - 11} Z`}
        fill={H.cap}
        stroke={H.outline}
        strokeWidth="1.6"
      />
      <ellipse cx="0" cy={y - 15} rx="2" ry="1.2" fill={H.star} opacity="0.85" />
      <line x1="-5" y1={y + 9} x2="-6" y2={y + 17} stroke={H.leg} strokeWidth="3" />
      <line x1="5" y1={y + 9} x2="6" y2={y + 17} stroke={H.leg} strokeWidth="3" />
      <g transform={`translate(-5 ${y + 2}) rotate(-42)`}>
        <rect x="-10" y="-2" width="9" height="3.5" rx="1" fill={wood} />
        <rect x="-10" y="-2" width="3.5" height="3.5" rx="0.5" fill={metal} />
      </g>
      <g transform={`translate(5 ${y + 2}) rotate(42)`}>
        <rect x="1" y="-2" width="9" height="3.5" rx="1" fill={wood} />
        <rect x="6.5" y="-2" width="3.5" height="3.5" rx="0.5" fill={metal} />
      </g>
    </g>
  );
}

/** 大刀队长：宽刃大刀斜持、红缨、环首刀柄 */
function SpriteHeroDadaoLeader({ palette }: { palette: PlayerVectorPalette }): JSX.Element {
  const H = heroPaletteToCss(palette);
  const blade = '#c8d4dc';
  const edge = '#687482';
  const tassel = '#e03028';
  const y = -4;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="9" ry="11" fill={H.body} stroke={H.outline} strokeWidth="2" />
      <rect x="-5" y={y + 1} width="10" height="3" rx="1" fill={H.shadow} />
      <line x1="-5" y1={y + 5} x2="5" y2={y + 5} stroke={H.belt} strokeWidth="2" />
      <circle cx="0" cy={y - 10} r="5" fill={H.skin} stroke={H.outline} strokeWidth="2" />
      <ellipse cx="0" cy={y - 13} rx="8" ry="5" fill={H.cap} stroke={H.outline} strokeWidth="2" />
      <rect x="1" y={y - 12} width="9" height="3" rx="1" fill={H.brim} />
      <circle cx="3" cy={y - 12} r="2" fill={H.star} />
      <line x1="-5" y1={y + 9} x2="-6" y2={y + 17} stroke={H.leg} strokeWidth="3" />
      <line x1="5" y1={y + 9} x2="6" y2={y + 17} stroke={H.leg} strokeWidth="3" />
      <g transform={`translate(-2 ${y - 1}) rotate(-52)`}>
        <path
          d="M 4 8 L 6 -4 L 9 -16 L 13 -18 L 16 -2 L 12 10 L 6 8 Z"
          fill={blade}
          stroke={edge}
          strokeWidth="1.4"
        />
        <circle cx="15" cy="-8" r="3.5" fill={tassel} stroke={H.outline} strokeWidth="1.1" />
        <circle cx="5" cy="6" r="3.2" fill={H.shadow} stroke={H.outline} strokeWidth="1.3" />
      </g>
    </g>
  );
}

/** 神枪手：长步枪、表尺与瞄准镜意象 */
function SpriteHeroSharpshooter({
  palette,
  gunWood,
  gunMetal,
}: {
  palette: PlayerVectorPalette;
  gunWood: number;
  gunMetal: number;
}): JSX.Element {
  const H = heroPaletteToCss(palette);
  const wood = hx(gunWood);
  const metal = hx(gunMetal);
  const scope = gunDark(gunMetal);
  const y = -4;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="9" ry="11" fill={H.body} stroke={H.outline} strokeWidth="2" />
      <rect x="-5" y={y + 1} width="10" height="3" rx="1" fill={H.shadow} />
      <line x1="-5" y1={y + 5} x2="5" y2={y + 5} stroke={H.belt} strokeWidth="2" />
      <circle cx="0" cy={y - 10} r="5" fill={H.skin} stroke={H.outline} strokeWidth="2" />
      <ellipse cx="0" cy={y - 13} rx="8" ry="5" fill={H.cap} stroke={H.outline} strokeWidth="2" />
      <rect x="1" y={y - 12} width="9" height="3" rx="1" fill={H.brim} />
      <circle cx="4" cy={y - 12} r="2.2" fill={H.star} />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 17} stroke={H.leg} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 17} stroke={H.leg} strokeWidth="3" />
      <g transform={`translate(4 ${y - 1})`}>
        <rect x="0" y="-3" width="14" height="6" rx="2" fill={wood} />
        <rect x="13" y="-2" width="12" height="4" rx="1.5" fill={metal} />
        <rect x="23" y="-1.5" width="8" height="3" rx="1" fill={metal} opacity="0.92" />
        <rect x="8" y="-7" width="10" height="4" rx="1.5" fill={scope} opacity="0.95" />
        <circle cx="13" cy="-5" r="2.2" fill="#1a2030" stroke={metal} strokeWidth="1" />
        <line x1="6" y1="-4" x2="6" y2="2" stroke={metal} strokeWidth="1.2" opacity="0.7" />
      </g>
    </g>
  );
}

/** 按图鉴主角键渲染对应立绘 */
function spriteForHeroPortrait(
  kind: CodexHeroPortraitKind,
  palette: PlayerVectorPalette,
  gunWood: number,
  gunMetal: number,
): JSX.Element {
  switch (kind) {
    case 'hero_guerrilla':
      return <SpriteHeroGuerrilla palette={palette} gunWood={gunWood} gunMetal={gunMetal} />;
    case 'hero_yan_shuangying':
      return <SpriteHeroYanShuangying palette={palette} gunWood={gunWood} gunMetal={gunMetal} />;
    case 'hero_dadao_leader':
      return <SpriteHeroDadaoLeader palette={palette} />;
    case 'hero_sharpshooter':
      return <SpriteHeroSharpshooter palette={palette} gunWood={gunWood} gunMetal={gunMetal} />;
  }
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

function SpriteMotorScout({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const cy = 3;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="-7" cy={cy + 6} r="4" fill="#1a1814" />
      <circle cx="7" cy={cy + 6} r="4" fill="#1a1814" />
      <rect x="-10" y={cy - 2} width="20" height="6" rx="2" fill={g} stroke={stroke} strokeWidth="1.5" />
      <ellipse cx="0" cy={y - 1} rx="7" ry="9" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="0" cy={y - 11} r="5" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="5" y={y - 5} width="12" height="3" rx="1" fill={g} />
    </g>
  );
}

function SpriteMilitaryPolice({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="0" cy={y} rx="9" ry="11" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="-5" y={y + 1} width="5" height="3" rx="1" fill="#8a2828" opacity="0.95" />
      <circle cx="0" cy={y - 12} r="6" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="4" y={y - 2} width="11" height="4" rx="1" fill={g} />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 17} stroke={stroke} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 17} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpriteMortarTeam({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const y = -4;
  const tube = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="-9" y={y + 8} width="18" height="4" rx="1" fill="#3a3530" opacity="0.92" />
      <ellipse cx="0" cy={y} rx="10" ry="11" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="0" cy={y - 12} r="5.5" fill={fill} stroke={stroke} strokeWidth="2" />
      <rect x="2" y={y - 10} width="4" height="12" rx="3" fill={tube} />
      <line x1="-4" y1={y + 9} x2="-4" y2={y + 16} stroke={stroke} strokeWidth="3" />
      <line x1="4" y1={y + 9} x2="4" y2={y + 16} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function SpriteLightTank({ fill, stroke }: { fill: string; stroke: string }): JSX.Element {
  const cy = -1;
  const g = gunDark(parseInt(fill.slice(1), 16));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="-18" y={cy - 5} width="36" height="14" rx="4" fill={fill} stroke={stroke} strokeWidth="2" />
      <circle cx="-12" cy={cy + 8} r="3" fill="#1a1814" />
      <circle cx="12" cy={cy + 8} r="3" fill="#1a1814" />
      <circle cx="0" cy={cy - 2} r="5" fill={g} stroke={stroke} strokeWidth="1.5" />
      <rect x="-3" y={cy - 9} width="10" height="15" rx="2" fill={g} />
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
    case 'motor_scout':
      return <SpriteMotorScout fill={fill} stroke={stroke} />;
    case 'military_police':
      return <SpriteMilitaryPolice fill={fill} stroke={stroke} />;
    case 'mortar_team':
      return <SpriteMortarTeam fill={fill} stroke={stroke} />;
    case 'light_tank':
      return <SpriteLightTank fill={fill} stroke={stroke} />;
    default:
      return <SpriteInfantry fill={fill} stroke={stroke} />;
  }
}

/**
 * 图鉴用矢量立绘：坐标与局内 `playerWorldVisual` / `enemyWorldVisual` idle 对齐，便于日后换皮一致
 * @param kind - `hero_guerrilla` / `hero_yan_shuangying` / `hero_dadao_leader` / `hero_sharpshooter` 或敌兵种类
 * @param className - 外层 `svg` 的语义化尺寸类（如 `codex-sprite`）
 * @param heroPalette - 游击队员造型配色（与商店「造型配色」、局内一致）；省略则用默认灰蓝
 * @param gunWood - 枪木色（与商店枪皮一致）
 * @param gunMetal - 枪金属色
 */
export function CodexUnitSprite({
  kind,
  className = '',
  heroPalette,
  gunWood,
  gunMetal,
}: {
  kind: CodexPortraitKind;
  className?: string;
  heroPalette?: PlayerVectorPalette;
  gunWood?: number;
  gunMetal?: number;
}): JSX.Element {
  const inner = isCodexHeroPortraitKind(kind) ? (
    spriteForHeroPortrait(
      kind,
      heroPalette ?? DEFAULT_PLAYER_VECTOR_PALETTE,
      gunWood ?? 0x4a3528,
      gunMetal ?? 0x2c3238,
    )
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
