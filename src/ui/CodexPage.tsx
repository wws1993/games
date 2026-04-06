import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  CODEX_CATEGORY_SUBJECT,
  CODEX_CATEGORY_TABS,
  getCodexCategoryCount,
  getCodexEntries,
  isCodexHeroPortraitKind,
  slotIdForGearCodexEntryId,
  type CodexCategory,
  type CodexEntry,
  type CodexTabIconId,
} from '../game/codex/codexData';
import {
  getPaletteForActiveGame,
  getSelectedWeaponCosmetic,
  loadAchievementSave,
} from '../game/meta/achievementStore';
import type { PlayerVectorPalette } from '../game/meta/metaUnlockShopConfig';
import {
  LEVEL_UP_CARD_DESIGN_CATEGORY_LABELS,
  levelUpCardTierPresentation,
  type LevelUpCardDesignCategory,
  type LevelUpCardTier,
} from '../game/config/levelUpCardsConfig';
import { GearPieceShapeIcon } from './GearPieceShapeIcon';
import { CodexUnitSprite } from './CodexUnitSprite';
import { WeaponIcon } from './WeaponIcon';

/** 0xRRGGBB → `#rrggbb`，与 Pixi 填色值对齐 */
function pixiColorToCss(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** 列表卡片容器：无分档用平面底；有分档时边框与弱渐变由内联样式驱动 */
function tierCardSurface(tier: LevelUpCardTier | undefined): { className: string; style: CSSProperties } {
  if (tier == null) {
    return { className: 'codex-card-surface codex-card-surface--plain', style: {} };
  }
  const p = levelUpCardTierPresentation[tier];
  return {
    className: 'codex-card-surface codex-card-surface--tier',
    style: {
      borderColor: pixiColorToCss(p.rimHot),
      background: `linear-gradient(145deg, ${pixiColorToCss(p.rimHot)}2a, ${pixiColorToCss(p.badgeBg)}55)`,
    },
  };
}

/** 拼装详情正文（与旧 `CodexScreen._openDetail` 结构一致） */
function buildDetailBody(entry: CodexEntry): string {
  const parts: string[] = [];
  if (entry.coreStats?.length) {
    parts.push('【核心参数】');
    for (const r of entry.coreStats) {
      parts.push(`${r.label}：${r.value}`);
    }
  }
  parts.push('【完整说明】', entry.body);
  if (entry.detailExtra) {
    parts.push('', entry.detailExtra);
  }
  return parts.join('\n');
}

/** 列表/详情共用的立绘外框；游击队员立绘与商店「造型配色」、枪皮存档一致 */
function CodexPortraitFrame({
  portrait,
  heroPalette,
  gunWood,
  gunMetal,
}: {
  portrait: NonNullable<CodexEntry['codexPortrait']>;
  heroPalette?: PlayerVectorPalette;
  gunWood?: number;
  gunMetal?: number;
}): JSX.Element {
  return (
    <div className="codex-portrait-frame">
      <CodexUnitSprite
        kind={portrait}
        className="codex-sprite"
        heroPalette={isCodexHeroPortraitKind(portrait) ? heroPalette : undefined}
        gunWood={isCodexHeroPortraitKind(portrait) ? gunWood : undefined}
        gunMetal={isCodexHeroPortraitKind(portrait) ? gunMetal : undefined}
      />
    </div>
  );
}

/** 图鉴分类 Tab 小图标（与 `CODEX_CATEGORY_TABS.iconId` 一一对应） */
function CodexCategoryTabIcon({ iconId, size = 24 }: { iconId: CodexTabIconId; size?: number }): JSX.Element {
  const s = {
    width: size,
    height: size,
    viewBox: '0 0 24 24' as const,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  switch (iconId) {
    case 'hero':
      return (
        <svg {...s}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M6 20v-1.5a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4V20" />
        </svg>
      );
    case 'weapon':
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 5v14M5 12h14" strokeOpacity="0.55" />
        </svg>
      );
    case 'enemy':
      return (
        <svg {...s}>
          <ellipse cx="12" cy="13" rx="7" ry="6" />
          <circle cx="9" cy="11" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="15" cy="11" r="1.2" fill="currentColor" stroke="none" />
          <path d="M9 15h6" />
          <path d="M12 4v3M8 5l1.5 2M16 5l-1.5 2" />
        </svg>
      );
    case 'card':
      return (
        <svg {...s}>
          <rect x="4" y="5" width="12" height="15" rx="2" />
          <rect x="7" y="8" width="10" height="12" rx="1.5" opacity="0.45" />
          <line x1="9" y1="11" x2="15" y2="11" />
          <line x1="9" y1="14" x2="14" y2="14" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...s}>
          <path d="M12 3 L15 6 L15 10 L12 13 L9 10 L9 6 Z" />
          <path d="M12 13v6M8 19h8" />
        </svg>
      );
    case 'affix':
      return (
        <svg {...s}>
          <line x1="6" y1="7" x2="18" y2="7" />
          <line x1="6" y1="12" x2="18" y2="12" />
          <line x1="6" y1="17" x2="14" y2="17" />
          <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
          <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

/** 强化卡图鉴：按池设计分类分组（顺序与 `LEVEL_UP_CARD_DESIGN_CATEGORY_LABELS` 键序一致） */
function groupCodexCardEntries(entries: CodexEntry[]): { key: string; label: string; items: CodexEntry[] }[] {
  const order: LevelUpCardDesignCategory[] = ['base', 'sharedWeapon', 'rangedWeapon', 'meleeWeapon'];
  const labels = LEVEL_UP_CARD_DESIGN_CATEGORY_LABELS;
  const buckets = new Map<LevelUpCardDesignCategory, CodexEntry[]>();
  for (const k of order) {
    buckets.set(k, []);
  }
  for (const e of entries) {
    const k = e.levelUpCardDesignCategory ?? 'base';
    const arr = buckets.get(k);
    if (arr) arr.push(e);
  }
  return order
    .map((k) => ({
      key: k,
      label: labels[k],
      items: buckets.get(k) ?? [],
    }))
    .filter((g) => g.items.length > 0);
}

/** 宫格缩略图内预览：兵种立绘 / 强化卡分档 / 紫装部位剪影 / 词条图标 / 资料色块字 */
function CodexEntryThumbVisual({
  ent,
  category,
  heroPalette,
  gunWood,
  gunMetal,
}: {
  ent: CodexEntry;
  category: CodexCategory;
  heroPalette: PlayerVectorPalette;
  gunWood: number;
  gunMetal: number;
}): JSX.Element {
  if (ent.codexPortrait) {
    return (
      <div className="codex-thumb-visual codex-thumb-visual--portrait">
        <CodexUnitSprite
          kind={ent.codexPortrait}
          className="codex-sprite codex-thumb-sprite"
          heroPalette={isCodexHeroPortraitKind(ent.codexPortrait) ? heroPalette : undefined}
          gunWood={isCodexHeroPortraitKind(ent.codexPortrait) ? gunWood : undefined}
          gunMetal={isCodexHeroPortraitKind(ent.codexPortrait) ? gunMetal : undefined}
        />
      </div>
    );
  }
  if (ent.codexWeaponKind) {
    return (
      <div className="codex-thumb-visual codex-thumb-visual--weapon">
        <WeaponIcon kind={ent.codexWeaponKind} size={44} className="codex-icon-weapon" />
      </div>
    );
  }
  if (ent.cardTier) {
    const p = levelUpCardTierPresentation[ent.cardTier];
    return (
      <div
        className="codex-thumb-visual codex-thumb-visual--card"
        style={{
          borderColor: pixiColorToCss(p.rimHot),
          background: `linear-gradient(145deg, ${pixiColorToCss(p.rimHot)}2a, ${pixiColorToCss(p.badgeBg)}55)`,
        }}
      >
        <span className="codex-thumb-fallback-text">{ent.title.slice(0, 2)}</span>
      </div>
    );
  }
  if (category === 'gear') {
    const bg = pixiColorToCss(ent.accentColor);
    return (
      <div className="codex-thumb-visual codex-thumb-visual--gear">
        <GearPieceShapeIcon slotId={slotIdForGearCodexEntryId(ent.id)} bgCss={bg} size={44} />
      </div>
    );
  }
  if (category === 'affix') {
    const bg = pixiColorToCss(ent.accentColor);
    return (
      <div
        className="codex-thumb-visual codex-thumb-visual--affix"
        style={{
          borderColor: `${bg}aa`,
          color: bg,
          background: `linear-gradient(160deg, ${bg}22, ${bg}44)`,
        }}
      >
        <CodexCategoryTabIcon iconId="affix" size={36} />
      </div>
    );
  }
  const bg = pixiColorToCss(ent.accentColor);
  return (
    <div
      className="codex-thumb-visual codex-thumb-visual--plain"
      style={{
        borderColor: `${bg}aa`,
        background: `linear-gradient(160deg, ${bg}33, ${bg}66)`,
      }}
    >
      <span className="codex-thumb-fallback-text">{ent.title.slice(0, 2)}</span>
    </div>
  );
}

/** 图鉴：图标 Tab、条目宫格与详情弹层；暖色 Q 风样式见 `app.css` 中 `.page-codex` */
export function CodexPage(): JSX.Element {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CodexCategory>('hero');
  const [detailEntry, setDetailEntry] = useState<CodexEntry | null>(null);

  const profileSnap = loadAchievementSave();
  const heroPalette = getPaletteForActiveGame(profileSnap);
  const weaponCos = getSelectedWeaponCosmetic(profileSnap);

  const entries = useMemo(() => getCodexEntries(category), [category]);
  const { subject, unit } = CODEX_CATEGORY_SUBJECT[category];
  const count = getCodexCategoryCount(category);

  useEffect(() => {
    setDetailEntry(null);
  }, [category]);

  return (
    <div className="page page-codex">
      <div className="page-codex-overlay" aria-hidden />
      <header className="codex-header">
        <button type="button" className="codex-back" onClick={() => void navigate('/')}>
          <span aria-hidden className="codex-back-chevron" />
          返回首页
        </button>
        <div className="codex-decor" aria-hidden>
          <span className="codex-decor-star">★</span>
          <span className="codex-decor-star">✦</span>
          <span className="codex-decor-star">★</span>
        </div>
        <h1 className="codex-title">图鉴</h1>
        <p className="codex-meta">资料完整度：100%（当前默认全开）</p>
      </header>

      <div className="codex-tabs-wrap">
        <div className="codex-icon-tabs-scroll" role="tablist" aria-label="图鉴分类">
          <div className="codex-icon-tabs">
            {CODEX_CATEGORY_TABS.map((tab) => {
              const active = tab.id === category;
              const c = getCodexCategoryCount(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`codex-tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls="codex-panel-entries"
                  className={`codex-icon-tab ${active ? 'codex-icon-tab--active' : ''}`}
                  onClick={() => setCategory(tab.id)}
                  title={`${tab.label}（${c}）`}
                >
                  <span className="codex-icon-tab-ico" aria-hidden>
                    <CodexCategoryTabIcon iconId={tab.iconId} />
                  </span>
                  <span className="codex-icon-tab-label">{tab.label}</span>
                  <span className={`codex-icon-tab-badge ${active ? 'codex-icon-tab-badge--active' : ''}`}>{c}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="codex-category-hint" id="codex-panel-hint">
          {subject} <span className="codex-hint-sep">|</span> 共 <span className="codex-hint-count">{count}</span> {unit}
        </p>
      </div>

      <div className="codex-body" id="codex-panel-entries" role="tabpanel" aria-labelledby={`codex-tab-${category}`}>
        {entries.length === 0 ? (
          <div className="codex-empty">
            暂无该分类图鉴内容
            <br />
            快去战斗中探索吧～
          </div>
        ) : category === 'card' ? (
          <>
            {groupCodexCardEntries(entries).map((group) => (
              <section key={group.key} className="codex-card-section">
                <h3 className="codex-card-section-title">{group.label}</h3>
                <ul className="codex-thumb-grid">
                  {group.items.map((ent) => {
                    const surf = tierCardSurface(ent.cardTier);
                    return (
                      <li key={ent.id}>
                        <button
                          type="button"
                          className={`codex-thumb-cell ${surf.className}`}
                          style={surf.style}
                          onClick={() => setDetailEntry(ent)}
                        >
                          <CodexEntryThumbVisual
                            ent={ent}
                            category={category}
                            heroPalette={heroPalette}
                            gunWood={weaponCos.gunWood}
                            gunMetal={weaponCos.gunMetal}
                          />
                          <span className="codex-thumb-title">{ent.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </>
        ) : (
          <ul className="codex-thumb-grid">
            {entries.map((ent) => {
              const surf = tierCardSurface(ent.cardTier);
              return (
                <li key={ent.id}>
                  <button
                    type="button"
                    className={`codex-thumb-cell ${surf.className}`}
                    style={surf.style}
                    onClick={() => setDetailEntry(ent)}
                  >
                    <CodexEntryThumbVisual
                      ent={ent}
                      category={category}
                      heroPalette={heroPalette}
                      gunWood={weaponCos.gunWood}
                      gunMetal={weaponCos.gunMetal}
                    />
                    <span className="codex-thumb-title">{ent.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {detailEntry ? (
        <div
          className="codex-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="codex-detail-title"
          onClick={() => setDetailEntry(null)}
        >
          <div className="codex-modal-center">
            <div className="codex-modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="codex-modal-head">
                <div className="codex-modal-head-main">
                  {detailEntry.codexPortrait ? (
                    <CodexPortraitFrame
                      portrait={detailEntry.codexPortrait}
                      heroPalette={heroPalette}
                      gunWood={weaponCos.gunWood}
                      gunMetal={weaponCos.gunMetal}
                    />
                  ) : detailEntry.codexWeaponKind ? (
                    <div className="codex-icon-frame codex-icon-frame--weapon">
                      <WeaponIcon kind={detailEntry.codexWeaponKind} size={52} />
                    </div>
                  ) : category === 'gear' ? (
                    <div className="codex-icon-frame codex-icon-frame--gear">
                      <GearPieceShapeIcon
                        slotId={slotIdForGearCodexEntryId(detailEntry.id)}
                        bgCss={pixiColorToCss(detailEntry.accentColor)}
                        size={52}
                      />
                    </div>
                  ) : category === 'affix' ? (
                    <div
                      className="codex-icon-frame codex-icon-frame--affix"
                      style={{ color: pixiColorToCss(detailEntry.accentColor) }}
                    >
                      <CodexCategoryTabIcon iconId="affix" size={40} />
                    </div>
                  ) : null}
                  <h2 id="codex-detail-title" className="codex-modal-title">
                    {detailEntry.subtitle ? `${detailEntry.title} · ${detailEntry.subtitle}` : detailEntry.title}
                  </h2>
                </div>
                <button type="button" className="codex-modal-close" onClick={() => setDetailEntry(null)}>
                  ×
                </button>
              </div>
              <div className="codex-modal-body">
                <p className="codex-modal-body-text">{buildDetailBody(detailEntry)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
