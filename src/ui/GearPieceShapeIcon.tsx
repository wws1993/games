import type { GearDropSlotId } from '../game/config/gearSlotTypes';

type GearPieceShapeIconProps = {
  slotId: GearDropSlotId;
  /** 等阶背景色，来自 `GEAR_GRADE_VISUAL.bgCss` / `RolledPurpleGearPiece.displayBgCss` */
  bgCss: string;
  /** 边长（px） */
  size?: number;
  /** 空槽：中性灰底，仍显示部位轮廓 */
  muted?: boolean;
  className?: string;
};

const MUTED_BG =
  'linear-gradient(165deg, rgba(255,255,255,0.55) 0%, rgba(210,200,190,0.92) 48%, rgba(185,175,168,0.98) 100%)';

const STROKE = 'rgba(255, 252, 248, 0.94)';
const FILL = 'rgba(255, 255, 255, 0.13)';

/** 九部位紫装轮廓 SVG（程序化路径）；`muted` 时背景为灰，`muted` 为 false 时用 `bgCss` 作等阶底色 */
export function GearPieceShapeIcon({
  slotId,
  bgCss,
  size = 40,
  muted = false,
  className,
}: GearPieceShapeIconProps): JSX.Element {
  const bgStyle = muted
    ? { background: MUTED_BG }
    : {
        background: [
          'linear-gradient(180deg, rgba(255,252,248,0.22) 0%, transparent 42%)',
          `linear-gradient(155deg, ${bgCss}e6 0%, ${bgCss} 52%, ${bgCss} 100%)`,
        ].join(', '),
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 8px rgba(0,0,0,0.12)`,
      };
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.max(6, size * 0.2),
        overflow: 'hidden',
        ...bgStyle,
      }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block' }}>
        {gearSlotShapeGroup(slotId)}
      </svg>
    </div>
  );
}

/** 按部位绘制一组 path，统一描边/填充以便叠在等阶色上可读 */
function gearSlotShapeGroup(slotId: GearDropSlotId): JSX.Element {
  const c = { fill: FILL, stroke: STROKE, strokeWidth: 1.35, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (slotId) {
    case 'helmet':
      return (
        <g>
          <path
            d="M10 17 L10 14 Q10 9.5 16 7.5 Q22 9.5 22 14 L22 17 Q22 21.5 16 23.5 Q10 21.5 10 17 Z"
            {...c}
          />
          <path d="M12 16 Q16 14 20 16" fill="none" stroke={STROKE} strokeWidth={1} opacity={0.75} />
        </g>
      );
    case 'torso':
      return (
        <g>
          <path d="M11 13 H21 L22.5 26 H9.5 Z" {...c} />
          <path d="M13 17 H19" fill="none" stroke={STROKE} strokeWidth={1} opacity={0.65} />
          <path d="M14 21 H18" fill="none" stroke={STROKE} strokeWidth={1} opacity={0.5} />
        </g>
      );
    case 'shoulder':
      return (
        <g>
          <path d="M8 12 Q14 10 20 12 L22 20 Q16 22 10 20 Z" {...c} />
          <ellipse cx="15" cy="15" rx="3" ry="2.2" fill="none" stroke={STROKE} strokeWidth={1} opacity={0.55} />
        </g>
      );
    case 'primary':
      return (
        <g>
          <rect x="3" y="14" width="20" height="5" rx="1.2" {...c} />
          <rect x="21" y="12" width="8" height="4" rx="0.6" {...c} />
          <path d="M5 16.5 H8 M24 14 V18" fill="none" stroke={STROKE} strokeWidth={1} opacity={0.7} />
        </g>
      );
    case 'secondary':
      return (
        <g>
          <path d="M7 17 H17 L19 14 H23 V16 H19.5 L18 19 H7 Z" {...c} />
          <circle cx="9" cy="17.5" r="1.8" fill="none" stroke={STROKE} strokeWidth={1} />
        </g>
      );
    case 'hands':
      return (
        <g>
          <path d="M7 14 Q9 11 11 13 L12 22 Q9 24 7 21 Z" {...c} />
          <path d="M25 14 Q23 11 21 13 L20 22 Q23 24 25 21 Z" {...c} />
          <path d="M14 15 H18 V22 H14 Z" {...c} />
        </g>
      );
    case 'belt':
      return (
        <g>
          <rect x="6" y="14" width="20" height="6" rx="1.5" {...c} />
          <rect x="14" y="13" width="4" height="8" rx="0.8" fill="none" stroke={STROKE} strokeWidth={1.2} />
          <path d="M9 17 H12 M20 17 H23" fill="none" stroke={STROKE} strokeWidth={0.9} opacity={0.55} />
        </g>
      );
    case 'boots':
      return (
        <g>
          <path d="M10 10 L12 24 H20 L22 10 Q16 8 10 10 Z" {...c} />
          <path d="M11 20 H21" fill="none" stroke={STROKE} strokeWidth={1} opacity={0.55} />
          <ellipse cx="16" cy="25" rx="5" ry="1.6" fill="none" stroke={STROKE} strokeWidth={1} opacity={0.45} />
        </g>
      );
    case 'trinket':
      return (
        <g>
          <path d="M16 7 L22 16 L16 25 L10 16 Z" {...c} />
          <path d="M16 11 V21 M11 16 H21" fill="none" stroke={STROKE} strokeWidth={0.9} opacity={0.5} />
          <circle cx="16" cy="16" r="2.2" fill="none" stroke={STROKE} strokeWidth={1} opacity={0.75} />
        </g>
      );
  }
}
