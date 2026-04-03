import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  CODEX_CATEGORY_TABS,
  CODEX_CATEGORY_SUBJECT,
  getCodexCategoryCount,
  getCodexEntries,
  type CodexCategory,
  type CodexEntry,
} from '../game/codex/codexData';
import { levelUpCardTierPresentation, type LevelUpCardTier } from '../game/config/levelUpCardsConfig';
import {
  PLAYER_WEAPON_ORDER,
  type PlayerWeaponKind,
} from '../game/config/playerWeaponsConfig';
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

/** 列表/详情共用的立绘外框，与局内小人配色一致 */
function CodexPortraitFrame({ portrait }: { portrait: NonNullable<CodexEntry['codexPortrait']> }): JSX.Element {
  return (
    <div className="codex-portrait-frame">
      <CodexUnitSprite kind={portrait} className="codex-sprite" />
    </div>
  );
}

/** 从图鉴条目 id `w_${PlayerWeaponKind}` 解析武器键 */
function parseWeaponKindFromCodexId(id: string): PlayerWeaponKind | null {
  if (!id.startsWith('w_')) {
    return null;
  }
  const k = id.slice(2);
  if ((PLAYER_WEAPON_ORDER as readonly string[]).includes(k)) {
    return k as PlayerWeaponKind;
  }
  return null;
}

/** 图鉴武器 Tab 列表/详情用的图标框，与 `WeaponIcon` 统一 */
function CodexWeaponIconFrame({ kind }: { kind: PlayerWeaponKind }): JSX.Element {
  return (
    <div className="codex-icon-frame">
      <WeaponIcon kind={kind} size={52} />
    </div>
  );
}

/** 图鉴：Tab、分区说明、列表与详情弹层；暖色 Q 风样式见 `app.css` 中 `.page-codex` */
export function CodexPage(): JSX.Element {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CodexCategory>('hero');
  const [detailEntry, setDetailEntry] = useState<CodexEntry | null>(null);

  const entries = useMemo(() => getCodexEntries(category), [category]);
  const single = entries.length === 1;
  const { subject, unit } = CODEX_CATEGORY_SUBJECT[category];
  const count = getCodexCategoryCount(category);

  return (
    <div className="page page-codex">
      <div className="page-codex-overlay" aria-hidden />
      <header className="codex-header">
        <button type="button" className="codex-back" onClick={() => void navigate('/')}>
          <span aria-hidden className="codex-back-chevron" />
          返回
        </button>
        <div className="codex-decor" aria-hidden>
          <span className="codex-decor-star">★</span>
          <span className="codex-decor-star">✦</span>
          <span className="codex-decor-star">★</span>
        </div>
        <h1 className="codex-title">图鉴</h1>
        <p className="codex-subtitle-pill">战役资料馆 · 兵种 · 装备 · 词条</p>
        <p className="codex-meta">资料完整度：100%（当前默认全开）</p>
      </header>

      <div className="codex-tabs-wrap">
        <div className="codex-tab-grid">
          {CODEX_CATEGORY_TABS.map((tab) => {
            const active = tab.id === category;
            const c = getCodexCategoryCount(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`codex-tab ${active ? 'codex-tab--active' : ''}`}
              >
                {tab.label}
                <span className={`codex-tab-badge ${active ? 'codex-tab-badge--active' : ''}`}>{c}</span>
              </button>
            );
          })}
        </div>
        <p className="codex-category-hint">
          {subject} <span className="codex-hint-sep">|</span> 共 <span className="codex-hint-count">{count}</span> {unit}
        </p>
      </div>

      <div className="codex-body">
        {entries.length === 0 ? (
          <div className="codex-empty">
            暂无该分类图鉴内容
            <br />
            快去战斗中探索吧～
          </div>
        ) : (
          <ul className="codex-entry-list">
            {entries.map((ent) => {
              const surf = tierCardSurface(ent.cardTier);
              const weaponKind = parseWeaponKindFromCodexId(ent.id);
              if (single) {
                return (
                  <li key={ent.id} className={surf.className} style={surf.style}>
                    <div className="codex-card-inner">
                      {weaponKind ? (
                        <div className="codex-center">
                          <CodexWeaponIconFrame kind={weaponKind} />
                        </div>
                      ) : ent.codexPortrait ? (
                        <div className="codex-center">
                          <CodexPortraitFrame portrait={ent.codexPortrait} />
                        </div>
                      ) : null}
                      <h2 className="codex-card-single-title">{ent.title}</h2>
                      {ent.subtitle ? <p className="codex-card-single-sub">{ent.subtitle}</p> : null}
                      {ent.coreStats?.length ? (
                        <dl className="codex-stat-grid">
                          {ent.coreStats.map((row) => (
                            <div key={row.label}>
                              <dt className="codex-stat-dt">{row.label}</dt>
                              <dd className="codex-stat-dd">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      <p className="codex-card-preview">
                        {ent.body.split('\n').slice(0, 5).join('\n')}
                        {ent.body.split('\n').length > 5 ? '\n…' : ''}
                      </p>
                      <button type="button" className="codex-detail-btn" onClick={() => setDetailEntry(ent)}>
                        查看详情 ›
                      </button>
                    </div>
                  </li>
                );
              }
              const chev = ent.cardTier ? pixiColorToCss(levelUpCardTierPresentation[ent.cardTier].rimHot) : '#c9a030';
              return (
                <li key={ent.id}>
                  <button type="button" className={`codex-row-btn ${surf.className}`} style={surf.style} onClick={() => setDetailEntry(ent)}>
                    <div className="codex-row-inner">
                      {weaponKind ? (
                        <CodexWeaponIconFrame kind={weaponKind} />
                      ) : ent.codexPortrait ? (
                        <CodexPortraitFrame portrait={ent.codexPortrait} />
                      ) : null}
                      <div className="codex-row-text">
                        <div className="codex-row-title">{ent.title}</div>
                        <div className="codex-row-summary">{ent.listSummary ?? ent.body.split('\n')[0] ?? ''}</div>
                      </div>
                      <span className="codex-row-chev" style={{ color: chev }}>
                        ›
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="page-bottom-bar">
        <button type="button" className="page-btn-primary" onClick={() => void navigate('/')}>
          返回首页
        </button>
      </div>

      {detailEntry ? (
        <div
          className="codex-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="codex-detail-title"
          onClick={() => setDetailEntry(null)}
        >
          <div className="codex-modal-center" onClick={(e) => e.stopPropagation()}>
            <div className="codex-modal-panel">
              <div className="codex-modal-head">
                <div className="codex-modal-head-main">
                  {parseWeaponKindFromCodexId(detailEntry.id) ? (
                    <CodexWeaponIconFrame kind={parseWeaponKindFromCodexId(detailEntry.id)!} />
                  ) : detailEntry.codexPortrait ? (
                    <CodexPortraitFrame portrait={detailEntry.codexPortrait} />
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
