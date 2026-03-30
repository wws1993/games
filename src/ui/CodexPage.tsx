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

/** 0xRRGGBB → `#rrggbb`，与 Pixi 填色值对齐 */
function pixiColorToCss(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** 列表卡片容器 class + 强化卡分档描边/弱渐变 */
function tierCardSurface(tier: LevelUpCardTier | undefined): { className: string; style: CSSProperties } {
  if (tier == null) {
    return { className: 'rounded-xl border border-[#5a4a40] bg-[#1e1814]/92', style: {} };
  }
  const p = levelUpCardTierPresentation[tier];
  return {
    className: 'rounded-xl border-2',
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

/** 图鉴：Tab、分区说明、列表与详情弹层（数据仍来自 `codexData`） */
export function CodexPage(): JSX.Element {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CodexCategory>('hero');
  const [detailEntry, setDetailEntry] = useState<CodexEntry | null>(null);

  const entries = useMemo(() => getCodexEntries(category), [category]);
  const single = entries.length === 1;
  const { subject, unit } = CODEX_CATEGORY_SUBJECT[category];
  const count = getCodexCategoryCount(category);

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-[#121a1c] to-[#0a0e10] text-[#d8ccb8]">
      <header className="shrink-0 border-b border-[#5a4838]/55 px-3 pb-3 pt-3">
        <button
          type="button"
          className="mb-2 flex items-center gap-1 text-[15px] font-semibold text-[#e8d8c8]"
          onClick={() => void navigate('/')}
        >
          <span aria-hidden className="inline-block h-0 w-0 border-y-[9px] border-r-[10px] border-y-transparent border-r-[#e8d8c8]" />
          返回
        </button>
        <h1 className="text-center text-3xl font-black tracking-[0.2em] text-[#fff8e8] drop-shadow-md">图鉴</h1>
        <p className="mt-2 text-center text-[13px] text-[#8a8078]">战役资料馆 · 单位与装备说明</p>
        <p className="mt-2 text-center text-xs text-[#6a6058]">图鉴资料完整度：100%（当前默认全开）</p>
      </header>

      <div className="shrink-0 px-3 pt-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CODEX_CATEGORY_TABS.map((tab) => {
            const active = tab.id === category;
            const c = getCodexCategoryCount(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`relative rounded-lg border-2 px-2 py-2 text-center text-sm font-bold transition-transform active:scale-[0.98] ${
                  active
                    ? 'border-[#ffe8a0] bg-[#f0c860] text-[#1a1208]'
                    : 'border-[#7a6860]/90 bg-black/15 text-[#c8b8a8]'
                }`}
              >
                {tab.label}
                <span
                  className={`absolute -right-1 -top-1 min-w-[1.15rem] rounded-md px-1 text-[10px] font-bold ${
                    active ? 'bg-[#fff0c0] text-[#2a1a0a]' : 'bg-[#3a3228] text-[#e8d8c8]'
                  }`}
                >
                  {c}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-[#c9b8a0]">
          {subject} <span className="text-[#6a6058]">|</span> 共 <span className="font-bold text-[#ffcc66]">{count}</span> {unit}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-28 pt-2">
        {entries.length === 0 ? (
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-[#4a4038]/60 bg-[#1a1612]/75 px-6 py-10 text-center text-[#8a8078]">
            暂无该分类图鉴内容
            <br />
            快去战斗中探索吧～
          </div>
        ) : (
          <ul className="mx-auto flex max-w-lg flex-col gap-4">
            {entries.map((ent) => {
              const surf = tierCardSurface(ent.cardTier);
              if (single) {
                return (
                  <li key={ent.id} className={`p-1 ${surf.className}`} style={surf.style}>
                    <div className="p-5">
                      <h2 className="text-[22px] font-bold text-[#fff8f0] drop-shadow-sm">{ent.title}</h2>
                      {ent.subtitle ? <p className="mt-2 text-[13px] text-[#b8a898]">{ent.subtitle}</p> : null}
                      {ent.coreStats?.length ? (
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          {ent.coreStats.map((row) => (
                            <div key={row.label} className="col-span-1">
                              <dt className="text-[#9a9088]">{row.label}</dt>
                              <dd className="font-semibold text-[#f0e8d8]">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-[1.45] text-[#d0c4b8]">
                        {ent.body.split('\n').slice(0, 5).join('\n')}
                        {ent.body.split('\n').length > 5 ? '\n…' : ''}
                      </p>
                      <button
                        type="button"
                        className="mx-auto mt-6 block rounded-lg border-2 border-[#c9a030] bg-[#3a3020]/95 px-6 py-2 text-sm font-bold text-[#ffe8a8]"
                        onClick={() => setDetailEntry(ent)}
                      >
                        查看详情 ›
                      </button>
                    </div>
                  </li>
                );
              }
              const chev = ent.cardTier ? pixiColorToCss(levelUpCardTierPresentation[ent.cardTier].rimHot) : '#c9a030';
              return (
                <li key={ent.id}>
                  <button
                    type="button"
                    className={`w-full text-left ${surf.className}`}
                    style={surf.style}
                    onClick={() => setDetailEntry(ent)}
                  >
                    <div className="flex items-stretch gap-2 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[17px] font-bold text-[#f2ebe4]">{ent.title}</div>
                        <div className="mt-2 line-clamp-2 text-[13px] text-[#a89888]">
                          {ent.listSummary ?? ent.body.split('\n')[0] ?? ''}
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center text-3xl font-bold" style={{ color: chev }}>
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

      <div className="fixed bottom-0 left-0 right-0 z-[2] flex justify-center bg-gradient-to-t from-[#0a0e10] pb-6 pt-4">
        <button
          type="button"
          className="mb-4 rounded-full border-2 border-[#5a4020] bg-[#e8c878] px-10 py-2.5 text-lg font-bold text-[#2a1a0a] shadow-md"
          onClick={() => void navigate('/')}
        >
          返回首页
        </button>
      </div>

      {detailEntry ? (
        <div
          className="fixed inset-0 z-[3] bg-black/65"
          role="dialog"
          aria-modal="true"
          aria-labelledby="codex-detail-title"
          onClick={() => setDetailEntry(null)}
        >
          <div className="flex h-full items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="max-h-[min(560px,86vh)] w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#8a7048] bg-[#1e1a16]/98 shadow-xl">
            <div className="flex items-start justify-between gap-2 border-b border-[#5a4838]/40 px-4 py-3">
              <h2 id="codex-detail-title" className="pr-8 text-lg font-bold leading-snug text-[#fff4e8]">
                {detailEntry.subtitle ? `${detailEntry.title} · ${detailEntry.subtitle}` : detailEntry.title}
              </h2>
              <button
                type="button"
                className="shrink-0 rounded-full bg-[#3a3228] px-2.5 py-0.5 text-2xl font-bold leading-none text-[#e8d8c8]"
                onClick={() => setDetailEntry(null)}
              >
                ×
              </button>
            </div>
            <div className="max-h-[calc(min(560px,86vh)-52px)] overflow-y-auto px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#d8ccb8]">{buildDetailBody(detailEntry)}</p>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
