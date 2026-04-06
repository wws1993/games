import type { AchievementId } from '../game/meta/achievementDefs';

/** SVG 公共描边属性，保证各成就图标风格统一 */
const S = {
  stroke: 'currentColor' as const,
  fill: 'none' as const,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** 成就列表左侧装饰图：每个 id 独立矢量，与 `ACHIEVEMENT_DEFS` 一一对应 */
export function AchievementIcon({ id }: { id: AchievementId }): JSX.Element {
  switch (id) {
    case 'first_clear':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path
            d="M24 6c6 8 14 16 14 24a14 14 0 1 1-28 0c0-8 8-16 14-24z"
            fill="currentColor"
            fillOpacity={0.12}
          />
          <path d="M24 18v14 M17 25h14" {...S} />
        </svg>
      );
    case 'kills_100':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M14 34V18l10-6 10 6v16" {...S} />
          <path d="M24 12v8 M20 32h8" {...S} />
        </svg>
      );
    case 'kills_1000':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M10 36L22 14l6 4-8 18z M26 36L38 14l6 4-8 18z" {...S} />
        </svg>
      );
    case 'kills_10000':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <ellipse cx="24" cy="22" rx="14" ry="16" {...S} />
          <path d="M16 18h4 M28 18h4 M18 28c2 3 10 3 12 0" {...S} />
          <path d="M14 40c4-4 16-4 20 0" {...S} />
        </svg>
      );
    case 'kills_50000':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path
            d="M24 6l3 9 9 1-7 6 2 9-7-5-7 5 2-9-7-6 9-1z M24 28l2 7 7 1-5 4 1 7-5-3-5 3 1-7-5-4 7-1z"
            fill="currentColor"
            fillOpacity={0.08}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'kills_100000':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <circle cx="24" cy="24" r="16" {...S} />
          <path d="M24 8v32 M8 24h32 M14 14l20 20 M14 34l20-20" {...S} />
        </svg>
      );
    case 'sessions_10':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <rect x="10" y="12" width="28" height="26" rx="3" {...S} />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <line key={i} x1={13 + i * 2.4} y1="34" x2={13 + i * 2.4} y2="38" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          ))}
        </svg>
      );
    case 'sessions_50':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M24 8L40 14v12c0 10-7 18-16 22-9-4-16-12-16-22V14z" {...S} />
          <path d="M24 16v12l8 4" {...S} />
        </svg>
      );
    case 'sessions_100':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path
            d="M8 30c6-8 10-14 16-22 6 8 10 14 16 22-4 4-8 8-16 10-8-2-12-6-16-10z"
            fill="currentColor"
            fillOpacity={0.1}
            stroke="currentColor"
            strokeWidth={2}
          />
          <circle cx="24" cy="26" r="5" {...S} />
        </svg>
      );
    case 'total_play_1h':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <circle cx="24" cy="26" r="16" {...S} />
          <path d="M24 26l8-6 M24 26V14" {...S} />
          <circle cx="24" cy="26" r="2" fill="currentColor" />
        </svg>
      );
    case 'total_play_2h':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M18 10h12v6H18z M18 16v22a6 6 0 0 1-6 6 M30 16v22a6 6 0 0 0 6 6" {...S} />
          <path d="M21 28h6" {...S} />
        </svg>
      );
    case 'best_survival_180':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M14 18h20v18H14z M18 14h12v4H18z" {...S} />
          <path d="M20 24h8 M24 20v8" {...S} />
        </svg>
      );
    case 'best_survival_600':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M8 36 L16 22 L24 28 L32 14 L40 36 Z" fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={2} />
          <circle cx="32" cy="12" r="3" {...S} />
        </svg>
      );
    case 'purple_stash_50':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M12 20h24v18H12z M12 20V14h24v6" {...S} />
          <path d="M18 14V10h12v4" {...S} />
        </svg>
      );
    case 'purple_stash_100':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <rect x="10" y="22" width="12" height="14" rx="1" {...S} />
          <rect x="26" y="18" width="12" height="18" rx="1" {...S} />
        </svg>
      );
    case 'purple_stash_200':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M8 32h32 M10 28V18h28v10" {...S} />
          <path d="M14 18V12h20v6 M18 12V8h12v4" {...S} />
        </svg>
      );
    case 'nine_equipped':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          {[0, 1, 2].flatMap((row) =>
            [0, 1, 2].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={12 + col * 10}
                y={12 + row * 10}
                width="8"
                height="8"
                rx="1.5"
                fill={row === 1 && col === 1 ? 'currentColor' : 'none'}
                fillOpacity={0.2}
                stroke="currentColor"
                strokeWidth={1.8}
              />
            )),
          )}
        </svg>
      );
    case 'lock_10':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M14 22h20v14H14z M18 22V16a6 6 0 0 1 12 0v6" {...S} />
          <circle cx="24" cy="30" r="2" fill="currentColor" />
        </svg>
      );
    case 'die_once':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M24 8v32 M8 24h32" {...S} />
          <circle cx="24" cy="24" r="14" {...S} />
        </svg>
      );
    case 'die_20':
      return (
        <svg className="ach-icon-svg" viewBox="0 0 48 48" aria-hidden>
          <path d="M12 34c4-12 8-20 12-26 4 6 8 14 12 26" {...S} />
          <path d="M18 30h12 M20 22l8 8 M28 22l-8 8" {...S} />
        </svg>
      );
  }
}
