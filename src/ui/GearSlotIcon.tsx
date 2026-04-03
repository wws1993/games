/**
 * 护具 / 战术配件槽位小图标（程序化 SVG），与 `WeaponIcon` 同尺寸体系
 * @param variant - 槽类型决定外框与符号
 * @param accent - 强调色 `#rrggbb`，与装备品质或弹体色呼应时可传
 */
export function GearSlotIcon({
  variant,
  accent = '#8a7050',
  size = 40,
  className,
}: {
  variant: 'armor' | 'tactical';
  accent?: string;
  size?: number;
  className?: string;
}): JSX.Element {
  const stroke = variant === 'armor' ? '#6a5040' : '#4a6048';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="5" fill="#12100e" />
      {variant === 'armor' ? (
        <g fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M16 6 L24 9 V17 Q24 23 16 27 Q8 23 8 17 V9 Z"
            stroke={stroke}
            fill="#1a1612"
          />
          <path d="M16 10 V20" stroke={accent} opacity={0.85} />
          <path d="M12 14 H20" stroke={accent} opacity={0.55} />
        </g>
      ) : (
        <g fill="none" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="9" width="18" height="14" rx="2" stroke={stroke} fill="#101410" />
          <circle cx="16" cy="16" r="3.5" stroke={accent} />
          <path d="M16 11 V9 M16 23 V21 M11 16 H9 M23 16 H21" stroke={accent} opacity={0.7} />
        </g>
      )}
    </svg>
  );
}
