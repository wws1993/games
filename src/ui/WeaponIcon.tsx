import { PLAYER_WEAPON_DEFS, type PlayerWeaponKind } from '../game/config/playerWeaponsConfig';

/** 木色 / 铁色：各图标共用，点缀色取自武器 `bulletColor` */
const W = '#5c4030';
const M = '#4a5058';
const D = '#2c3038';

/**
 * 武器剪影图标（程序化 SVG）：用于商店、装备等列表；`accent` 与弹体色一致便于识别
 * @param kind - 武器键
 * @param size - 像素边长
 * @param className - 附加 class（如 `ui-icon-shrink`）
 */
export function WeaponIcon({
  kind,
  size = 40,
  className,
}: {
  kind: PlayerWeaponKind;
  size?: number;
  className?: string;
}): JSX.Element {
  const hex = PLAYER_WEAPON_DEFS[kind].bulletColor.toString(16).padStart(6, '0');
  const accent = `#${hex}`;
  const g = weaponGlyph(kind, accent);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="5" fill="#12100e" />
      <g fill="none" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        {g}
      </g>
    </svg>
  );
}

/** 按武器键返回居中于 16,16 附近的矢量组 */
function weaponGlyph(kind: PlayerWeaponKind, A: string): JSX.Element {
  switch (kind) {
    case 'type38':
      return (
        <g transform="translate(16,17)">
          <path d="M-11 0h18" stroke={W} strokeWidth="2.2" />
          <path d="M7-1.5h7l1.5 1.5v2h-8.5" stroke={M} fill="none" />
          <path d="M-11-2v4" stroke={W} />
          <circle cx="-9" cy="0" r="1" fill={A} stroke="none" />
        </g>
      );
    case 'mauser_c96':
      return (
        <g transform="translate(16,17)">
          <path d="M-8 1h10l3-2v-3h-5" stroke={M} />
          <rect x="-9" y="-1" width="7" height="4" rx="0.5" stroke={W} />
          <path d="M5 0h6" stroke={M} />
          <circle cx="-5" cy="1" r="0.8" fill={A} stroke="none" />
        </g>
      );
    case 'hanyang_88':
      return (
        <g transform="translate(16,17)">
          <path d="M-10 0h17" stroke={W} strokeWidth="2" />
          <path d="M7-1h6v2h-6" stroke={M} />
          <path d="M-10-1.5v3" stroke={W} />
          <path d="M4-3v6" stroke={D} strokeWidth="1" />
        </g>
      );
    case 'zhongzheng':
      return (
        <g transform="translate(16,17)">
          <path d="M-10 0h16" stroke={W} strokeWidth="2.1" />
          <path d="M6-1.2h7l1 1.2v1.6h-8" stroke={M} />
          <rect x="-11" y="-2" width="3" height="4" rx="0.3" stroke={W} />
        </g>
      );
    case 'thompson':
      return (
        <g transform="translate(16,18)">
          <path d="M-9 0h14" stroke={W} strokeWidth="1.8" />
          <ellipse cx="3" cy="3" rx="3.5" ry="2.8" stroke={M} />
          <path d="M5-2v-4h4v2" stroke={M} />
          <path d="M-9-1v2" stroke={D} />
          <circle cx="-6" cy="0" r="0.9" fill={A} stroke="none" />
        </g>
      );
    case 'double_barrel':
      return (
        <g transform="translate(16,16)">
          <path d="M-6-2h12v4h-12z" stroke={W} />
          <path d="M6-1.2h7M6 1.2h7" stroke={M} strokeWidth="1.6" />
          <path d="M-8 0h3" stroke={W} strokeWidth="2" />
        </g>
      );
    case 'mosin_style':
      return (
        <g transform="translate(16,17)">
          <path d="M-12 0h20" stroke={W} strokeWidth="1.9" />
          <path d="M8-1h5v2h-5" stroke={M} />
          <path d="M-12-2v4" stroke={W} />
          <path d="M2-4l2 8" stroke={D} strokeWidth="1" />
          <circle cx="-9" cy="0" r="0.85" fill={A} stroke="none" />
        </g>
      );
    case 'burp_gun':
      return (
        <g transform="translate(16,17)">
          <path d="M-8 0h13" stroke={W} strokeWidth="1.7" />
          <rect x="-9" y="-1.5" width="5" height="3" rx="0.4" stroke={M} />
          <path d="M5-1h6v2h-6" stroke={M} />
          <path d="M-3-3v-2h4v2" stroke={D} />
        </g>
      );
    case 'colt_revolver':
      return (
        <g transform="translate(16,18)">
          <circle cx="0" cy="0" r="4.5" stroke={M} />
          <circle cx="0" cy="0" r="2" stroke={W} />
          <path d="M4-1h7" stroke={M} strokeWidth="1.5" />
          <circle cx="0" cy="0" r="0.8" fill={A} stroke="none" />
        </g>
      );
    case 'lever_action':
      return (
        <g transform="translate(16,17)">
          <path d="M-9 0h15" stroke={W} strokeWidth="2" />
          <path d="M6-1h5v2h-5" stroke={M} />
          <path d="M-2 2v3l-2 1" stroke={D} />
        </g>
      );
    case 'hunting_musket':
      return (
        <g transform="translate(16,17)">
          <path d="M-10 0h14" stroke={W} strokeWidth="2.4" />
          <path d="M4-1.5h8v3h-8" stroke={M} />
          <path d="M-10-2v4" stroke={W} />
        </g>
      );
    case 'heavy_crossbow':
      return (
        <g transform="translate(16,17)">
          <path d="M-10-4h20M-10 4h20" stroke={W} strokeWidth="1.2" />
          <path d="M-10-4v8M10-4v8" stroke={W} />
          <path d="M0-2v4M-6 0h12" stroke={M} strokeWidth="1.5" />
          <path d="M6 0h5" stroke={A} />
        </g>
      );
    case 'pepperbox':
      return (
        <g transform="translate(16,17)">
          <circle cx="0" cy="0" r="5" stroke={M} />
          <circle cx="0" cy="-2.2" r="1" stroke={W} />
          <circle cx="2.1" cy="-0.7" r="1" stroke={W} />
          <circle cx="1.3" cy="1.8" r="1" stroke={W} />
          <circle cx="-1.3" cy="1.8" r="1" stroke={W} />
          <circle cx="-2.1" cy="-0.7" r="1" stroke={W} />
          <path d="M5 0h6" stroke={M} />
        </g>
      );
    case 'anti_tank_rifle':
      return (
        <g transform="translate(16,17)">
          <path d="M-11 0h22" stroke={W} strokeWidth="2.2" />
          <path d="M11-1.4h6v2.8h-6" stroke={M} />
          <rect x="-13" y="-2.5" width="4" height="5" rx="0.4" stroke={D} />
          <circle cx="-9" cy="0" r="0.9" fill={A} stroke="none" />
        </g>
      );
    case 'bren_style':
      return (
        <g transform="translate(16,17)">
          <path d="M-8 0h12" stroke={W} strokeWidth="1.8" />
          <path d="M-2-5v5" stroke={M} />
          <rect x="-4" y="-7" width="4" height="2.5" rx="0.3" stroke={M} />
          <path d="M4-1h6v2h-6" stroke={M} />
        </g>
      );
    case 'pistol_fast':
      return (
        <g transform="translate(16,18)">
          <path d="M-6 1h11" stroke={W} strokeWidth="1.6" />
          <path d="M5 0h7v2h-7" stroke={M} />
          <rect x="-8" y="-0.5" width="4" height="3" rx="0.4" stroke={M} />
        </g>
      );
    case 'sawn_off':
      return (
        <g transform="translate(16,16)">
          <path d="M-5-1.5h10v3h-10z" stroke={W} strokeWidth="1.8" />
          <path d="M5-0.8h6M5 0.8h6" stroke={M} strokeWidth="1.4" />
        </g>
      );
    case 'throwing_blade':
      return (
        <g transform="translate(16,17)">
          <path d="M-8 0l8-6 8 6-8 6z" stroke={M} fill="#1e2024" />
          <path d="M0-4v8" stroke={A} />
          <path d="M-4 0h8" stroke={W} strokeWidth="0.9" />
        </g>
      );
    case 'red_tassel_dart':
      return (
        <g transform="translate(16,16)">
          <path d="M-2 8v4M0 8v5M2 8v4" stroke={A} strokeWidth="1.2" />
          <path d="M-1-6h2v12h-2z" stroke={M} fill={D} />
          <path d="M0-8v3" stroke={W} />
        </g>
      );
    case 'iron_pipe_gun':
      return (
        <g transform="translate(16,17)">
          <path d="M-8 0h14" stroke={D} strokeWidth="2.8" />
          <path d="M6-1h5v2h-5" stroke={M} />
          <path d="M-10-1.5v3" stroke={W} />
          <circle cx="-6" cy="0" r="1" fill={A} stroke="none" />
        </g>
      );
  }
}
