import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { closePauseEquipmentOverlay, notifyBattleEquipmentChanged } from '../game/meta/gamePauseBridge';

import type { RolledPurpleGearPiece } from '../game/config/gearAffixConfig';
import { aggregatePurpleProfileBonuses } from '../game/config/purpleGearBonuses';
import { DEFAULT_PLAYER_WEAPON_KIND } from '../game/config/playerWeaponsConfig';
import type { GearGradeId } from '../game/config/gearGradeConfig';
import {
  loadAchievementSave,
  quickSellPurpleStashAtOrBelowGrade,
  sellPurpleStashByInstanceIds,
  togglePurpleGearLockByInstanceId,
  tryEquipPurpleFromStash,
  tryUnequipPurpleSlot,
} from '../game/meta/achievementStore';
import { GearSlotIcon } from './GearSlotIcon';
import { WeaponIcon } from './WeaponIcon';

/** 装备分类 Tab id：九部位 */
type EquipmentCategoryId =
  | 'helmet'
  | 'torso'
  | 'shoulder'
  | 'primary'
  | 'secondary'
  | 'hands'
  | 'belt'
  | 'boots'
  | 'trinket';

/** 身位槽元数据；九宫格展示顺序见 `MINI_GRID_CELLS` */
const EQUIPMENT_SLOT_DEFS: readonly {
  key: EquipmentCategoryId;
  category: string;
}[] = [
  { key: 'trinket', category: '饰品' },
  { key: 'helmet', category: '头部' },
  { key: 'shoulder', category: '护肩' },
  { key: 'primary', category: '主战武装' },
  { key: 'torso', category: '躯干' },
  { key: 'hands', category: '护手' },
  { key: 'secondary', category: '副武器' },
  { key: 'boots', category: '军靴' },
  { key: 'belt', category: '腰带' },
];

const MINI_GRID_CELLS: readonly (typeof EQUIPMENT_SLOT_DEFS)[number][] = EQUIPMENT_SLOT_DEFS;

/** 点击后锚定浮层 */
type EquipmentPopupState = {
  piece: RolledPurpleGearPiece;
  rect: DOMRectReadOnly;
};

const EQUIPMENT_POPUP_WIDTH = 300;
const EQUIPMENT_POP_GAP = 10;
const EQUIPMENT_POP_MAX_H = 320;

/** 按点击的图标矩形在视口内放置浮层：优先在图标下方，空间不足则翻到上方 */
function equipmentPopoverStyle(rect: DOMRectReadOnly): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(EQUIPMENT_POPUP_WIDTH, vw - EQUIPMENT_POP_GAP * 2);
  let left = rect.left + rect.width / 2 - w / 2;
  left = Math.max(EQUIPMENT_POP_GAP, Math.min(left, vw - w - EQUIPMENT_POP_GAP));
  const roomBelow = vh - rect.bottom - EQUIPMENT_POP_GAP * 2;
  const roomAbove = rect.top - EQUIPMENT_POP_GAP * 2;
  const preferBelow = roomBelow >= Math.min(EQUIPMENT_POP_MAX_H, 200) || roomBelow >= roomAbove;
  if (preferBelow) {
    const maxH = Math.min(EQUIPMENT_POP_MAX_H, Math.max(120, vh - rect.bottom - EQUIPMENT_POP_GAP * 2));
    return {
      position: 'fixed',
      left,
      top: rect.bottom + EQUIPMENT_POP_GAP,
      width: w,
      maxHeight: maxH,
    };
  }
  const maxH = Math.min(EQUIPMENT_POP_MAX_H, Math.max(120, rect.top - EQUIPMENT_POP_GAP * 2));
  return {
    position: 'fixed',
    left,
    bottom: vh - rect.top + EQUIPMENT_POP_GAP,
    width: w,
    maxHeight: maxH,
  };
}

/** 右侧全身剪影 + 默认主武器与身位示意 */
function EquipmentFigurePreview(): JSX.Element {
  return (
    <div className="equipment-figure-preview">
      <svg className="equipment-figure-base" viewBox="0 0 40 56" aria-hidden>
        <ellipse cx="20" cy="11" rx="9" ry="10" fill="#b8a098" opacity="0.95" />
        <path d="M10 24 H30 L27 52 H13 Z" fill="#a08070" opacity="0.96" />
        <rect x="6" y="26" width="8" height="18" rx="2" fill="#988070" opacity="0.96" />
        <rect x="26" y="26" width="8" height="18" rx="2" fill="#988070" opacity="0.96" />
      </svg>
      <div className="equipment-figure-pin equipment-figure-pin--chest">
        <GearSlotIcon variant="armor" accent="#c8a880" size={36} />
      </div>
      <div className="equipment-figure-pin equipment-figure-pin--weapon">
        <WeaponIcon kind={DEFAULT_PLAYER_WEAPON_KIND} size={42} />
      </div>
      <div className="equipment-figure-pin equipment-figure-pin--belt">
        <GearSlotIcon variant="tactical" accent="#80b888" size={32} />
      </div>
    </div>
  );
}

/** 独立路由为整备页；`battlePause` 为局内暂停层，关闭时恢复战斗 */
export type EquipmentPageProps = {
  mode?: 'standalone' | 'battlePause';
  /** `battlePause` 时关闭整备层（通常传 `closePauseEquipmentOverlay`） */
  onCloseBattle?: () => void;
};

/** 装备页：九格身位为唯一部位切换；角色区展示聚合属性；仓库分区含卸装、一键售阶、多选售卖与锁定；词条聚合见 `aggregatePurpleProfileBonuses` */
export function EquipmentPage({
  mode = 'standalone',
  onCloseBattle,
}: EquipmentPageProps): JSX.Element {
  const navigate = useNavigate();
  const [save, setSave] = useState(() => loadAchievementSave());
  const [categoryTab, setCategoryTab] = useState<EquipmentCategoryId>('primary');
  const [popup, setPopup] = useState<EquipmentPopupState | null>(null);
  /** 多选出售模式：右上角「装备售卖」进入，「确认」结算或空选退出 */
  const [sellMode, setSellMode] = useState(false);
  /** 出售勾选的 `stashInstanceId` */
  const [sellSelectedIds, setSellSelectedIds] = useState<Set<string>>(() => new Set());
  /** 最近一次出售或一键出售提示 */
  const [sellToast, setSellToast] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef(popup);
  popupRef.current = popup;
  const battle = mode === 'battlePause';

  useEffect(() => {
    if (!battle) {
      return;
    }
    const onEsc = (e: KeyboardEvent): void => {
      if (e.code !== 'Escape') {
        return;
      }
      e.preventDefault();
      if (popupRef.current) {
        setPopup(null);
        return;
      }
      (onCloseBattle ?? closePauseEquipmentOverlay)();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [battle, onCloseBattle]);

  useEffect(() => {
    if (!popup || battle) {
      return;
    }
    const onEsc = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') {
        e.preventDefault();
        setPopup(null);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [popup, battle]);

  useEffect(() => {
    if (!popup) {
      return;
    }
    const close = (): void => {
      setPopup(null);
    };
    const el = bodyRef.current;
    el?.addEventListener('scroll', close, { passive: true });
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      el?.removeEventListener('scroll', close);
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, [popup]);

  const equippedBySlot = save.equippedPurpleBySlot ?? {};
  const lockedSet = useMemo(
    () => new Set(save.purpleGearLockedInstanceIds ?? []),
    [save.purpleGearLockedInstanceIds],
  );
  const equippedInstanceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of EQUIPMENT_SLOT_DEFS) {
      const id = equippedBySlot[row.key]?.stashInstanceId;
      if (id) {
        ids.add(id);
      }
    }
    return ids;
  }, [equippedBySlot]);
  const stashForTab = useMemo(() => {
    const out: { piece: RolledPurpleGearPiece; stashIndex: number }[] = [];
    save.purpleGearStash.forEach((piece, stashIndex) => {
      if (piece.slotId === categoryTab) {
        out.push({ piece, stashIndex });
      }
    });
    return out;
  }, [save.purpleGearStash, categoryTab]);

  const currentSlotLabel = useMemo(
    () => EQUIPMENT_SLOT_DEFS.find((s) => s.key === categoryTab)?.category ?? '',
    [categoryTab],
  );

  const equippedPreview = useMemo(
    () => aggregatePurpleProfileBonuses(Object.values(equippedBySlot).filter(Boolean) as RolledPurpleGearPiece[]),
    [equippedBySlot],
  );

  const onEquipFromStash = (stashIndex: number): void => {
    const r = tryEquipPurpleFromStash(categoryTab, stashIndex);
    setSave(r.save);
    if (r.ok && battle) {
      notifyBattleEquipmentChanged();
    }
  };

  const onUnequipSlot = (): void => {
    setSave(tryUnequipPurpleSlot(categoryTab));
    if (battle) {
      notifyBattleEquipmentChanged();
    }
  };

  const switchCategoryTab = (id: EquipmentCategoryId): void => {
    setPopup(null);
    setCategoryTab(id);
  };

  const exitSellMode = (): void => {
    setSellMode(false);
    setSellSelectedIds(new Set());
  };

  const onToggleSellHeader = (): void => {
    if (!sellMode) {
      setSellMode(true);
      setSellSelectedIds(new Set());
      setPopup(null);
      return;
    }
    if (sellSelectedIds.size === 0) {
      exitSellMode();
      return;
    }
    const { save: next, soldCount } = sellPurpleStashByInstanceIds([...sellSelectedIds]);
    setSave(next);
    exitSellMode();
    if (soldCount > 0) {
      setSellToast(`已出售 ${soldCount} 件装备`);
      if (battle) {
        notifyBattleEquipmentChanged();
      }
    }
  };

  const onToggleSellSelect = (instanceId: string): void => {
    if (lockedSet.has(instanceId) || equippedInstanceIds.has(instanceId)) {
      return;
    }
    setSellSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  };

  const onToggleLock = (e: MouseEvent, instanceId: string): void => {
    e.preventDefault();
    e.stopPropagation();
    setSave(togglePurpleGearLockByInstanceId(instanceId));
    setSellSelectedIds((prev) => {
      if (!prev.has(instanceId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(instanceId);
      return next;
    });
  };

  const onQuickSell = (maxGrade: GearGradeId): void => {
    if (sellMode) {
      return;
    }
    const label = `${maxGrade} 及以下`;
    if (!window.confirm(`确定一键出售所有${label}、未锁定且未穿戴的仓库装备吗？`)) {
      return;
    }
    const { save: next, soldCount } = quickSellPurpleStashAtOrBelowGrade(maxGrade);
    setSave(next);
    setSellToast(soldCount > 0 ? `一键出售：已卖出 ${soldCount} 件（${label}）` : '没有可出售的装备');
  };

  const onHeaderBack = (): void => {
    if (sellMode) {
      exitSellMode();
      return;
    }
    if (battle && popup) {
      setPopup(null);
      return;
    }
    if (battle) {
      (onCloseBattle ?? closePauseEquipmentOverlay)();
      return;
    }
    void navigate('/');
  };

  return (
    <div className={`page page-equipment ${battle ? 'page-equipment--battle-pause' : ''}`}>
      <header className="equipment-header equipment-header--balanced">
        <button type="button" className="codex-back" onClick={onHeaderBack}>
          <span aria-hidden className="codex-back-chevron" />
          {sellMode ? '取消' : battle ? '返回战斗' : '返回'}
        </button>
        <h1 className="equipment-header-title">装备</h1>
        <button
          type="button"
          className={`equipment-header-sell-btn ${sellMode ? 'equipment-header-sell-btn--confirm' : ''}`}
          onClick={onToggleSellHeader}
        >
          {sellMode ? '确认' : '装备售卖'}
        </button>
      </header>

      <div className="equipment-body" ref={bodyRef}>
        <div className="equipment-content-shell">
          {sellToast ? (
            <p className="equipment-sell-toast" role="status">
              {sellToast}
              <button type="button" className="equipment-sell-toast-dismiss" onClick={() => setSellToast(null)}>
                知道了
              </button>
            </p>
          ) : null}
          {sellMode ? (
            <p className="equipment-sell-banner">售卖模式：点选下方装备，再按右上角「确认」出售；已穿戴与锁定不可选。</p>
          ) : null}

          <section className="equipment-hero" aria-label="角色与聚合属性">
            <div className="equipment-hero-figure">
              <p className="equipment-hero-figure-label">作战员</p>
              <EquipmentFigurePreview />
            </div>
            <div className="equipment-hero-meta">
              <p className="equipment-hint-sub">
                击杀掉落紫箱装备已入库；点身位格切换部位并筛选下方仓库。主武器局内固定为三八式，数值由九件紫装词条聚合。
              </p>
              <ul className="equipment-stat-pills">
                <li className="equipment-stat-pills-item">
                  <span className="equipment-stat-pills-k">承伤</span>
                  <span className="equipment-stat-pills-v">×{equippedPreview.damageTakenMult.toFixed(2)}</span>
                </li>
                <li className="equipment-stat-pills-item">
                  <span className="equipment-stat-pills-k">移速</span>
                  <span className="equipment-stat-pills-v">×{equippedPreview.moveSpeedMult.toFixed(2)}</span>
                </li>
                <li className="equipment-stat-pills-item">
                  <span className="equipment-stat-pills-k">步枪伤</span>
                  <span className="equipment-stat-pills-v">×{equippedPreview.rifleDamageMult.toFixed(2)}</span>
                </li>
                <li className="equipment-stat-pills-item">
                  <span className="equipment-stat-pills-k">射速</span>
                  <span className="equipment-stat-pills-v">×{equippedPreview.rifleAttackSpeedMult.toFixed(2)}</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="equipment-panel equipment-panel--slots" aria-labelledby="equipment-slots-heading">
            <h2 id="equipment-slots-heading" className="equipment-panel-title">
              身位
            </h2>
            <p className="equipment-panel-lead">点格子切换当前部位（当前部位有高亮描边）</p>
            <div className="equipment-slots-grid-wrap">
              <div className="equipment-mini-grid-9" role="group" aria-label="装备身位槽位">
                {MINI_GRID_CELLS.map((slot) => {
                  const eq = equippedBySlot[slot.key];
                  const isActive = categoryTab === slot.key;
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      className={`equipment-grid-cell equipment-grid-cell--slot-btn equipment-mini-cell ${
                        eq ? 'equipment-grid-cell--purple-on' : ''
                      } ${isActive ? 'equipment-mini-cell--active' : ''}`}
                      aria-label={`${slot.category}：${eq ? eq.displayName : '空'}${isActive ? '（当前）' : ''}`}
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => switchCategoryTab(slot.key)}
                    >
                      <span className="equipment-grid-cat">{slot.category}</span>
                      {eq ? (
                        <>
                          <span
                            className="equipment-grid-name"
                            style={{ borderLeft: `3px solid ${eq.displayBgCss}`, paddingLeft: 6 }}
                          >
                            {eq.displayName}
                          </span>
                          <span className="equipment-session-loot-meta equipment-mini-tier">{eq.tierName}</span>
                        </>
                      ) : (
                        <span className="equipment-grid-placeholder">空</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="equipment-panel equipment-panel--stash" aria-labelledby="equipment-stash-heading">
            <div className="equipment-stash-head">
              <div className="equipment-stash-head-titles">
                <h2 id="equipment-stash-heading" className="equipment-panel-title equipment-panel-title--inline">
                  仓库
                </h2>
                <span className="equipment-stash-badge">
                  {currentSlotLabel} · {stashForTab.length} 件
                </span>
              </div>
              <div className="equipment-stash-head-actions">
                {equippedBySlot[categoryTab] ? (
                  <button type="button" className="equipment-unequip-btn" onClick={onUnequipSlot}>
                    卸下本部位
                  </button>
                ) : (
                  <span className="equipment-purple-toolbar-hint">未穿戴 · 点选一件装备</span>
                )}
              </div>
            </div>

            {!sellMode ? (
              <div className="equipment-quick-sell" aria-label="一键按等阶出售">
                <span className="equipment-quick-sell-label">一键售卖</span>
                <div className="equipment-quick-sell-chips">
                  {(['E', 'D', 'C', 'B', 'A'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      className="equipment-quick-sell-chip"
                      title={`出售${g}及以下等阶（未锁定、未穿戴）`}
                      onClick={() => onQuickSell(g)}
                    >
                      {g}↓
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <ul className="equipment-icon-grid" aria-label={`${currentSlotLabel}·仓库列表`}>
            {stashForTab.length === 0 ? (
              <li className="equipment-icon-grid-empty" key="empty">
                仓库中暂无该部位装备
              </li>
            ) : null}
            {stashForTab.map(({ piece, stashIndex }) => {
              const active = equippedBySlot[categoryTab]?.stashInstanceId === piece.stashInstanceId;
              const locked = lockedSet.has(piece.stashInstanceId);
              const wornHere = equippedInstanceIds.has(piece.stashInstanceId);
              const sellSel = sellSelectedIds.has(piece.stashInstanceId);
              return (
                <li key={piece.stashInstanceId || `${piece.catalogId}-${stashIndex}`}>
                  <div
                    className={`equipment-icon-tile equipment-icon-tile--with-lock ${
                      active ? 'equipment-icon-tile--weapon-on' : ''
                    } ${sellMode && sellSel ? 'equipment-icon-tile--sell-pick' : ''} ${
                      sellMode && (locked || wornHere) ? 'equipment-icon-tile--sell-disabled' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="equipment-icon-tile-main"
                      title={piece.displayName}
                      onClick={(e) => {
                        if (sellMode) {
                          if (locked || wornHere) {
                            return;
                          }
                          onToggleSellSelect(piece.stashInstanceId);
                          return;
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        if (popup?.piece === piece) {
                          setPopup(null);
                          return;
                        }
                        onEquipFromStash(stashIndex);
                        setPopup({ piece, rect });
                      }}
                    >
                      <span
                        className="equipment-grid-name equipment-icon-tile-name"
                        style={{
                          borderLeft: `4px solid ${piece.displayBgCss}`,
                        }}
                      >
                        {piece.displayName}
                      </span>
                      {active ? <span className="equipment-icon-tile-badge">携</span> : null}
                      {sellMode && sellSel ? <span className="equipment-icon-tile-sell-mark">售</span> : null}
                    </button>
                    <button
                      type="button"
                      className={`equipment-icon-lock ${locked ? 'equipment-icon-lock--on' : ''}`}
                      title={locked ? '点击解锁' : '点击锁定'}
                      aria-label={locked ? '解锁' : '锁定'}
                      aria-pressed={locked}
                      onClick={(e) => onToggleLock(e, piece.stashInstanceId)}
                    >
                      <svg className="equipment-icon-lock-svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                        <path
                          fill="currentColor"
                          d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                        />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          </section>
        </div>
      </div>

      <div className="page-bottom-bar">
        {battle ? (
          <button
            type="button"
            className="page-btn-primary"
            onClick={() => (onCloseBattle ?? closePauseEquipmentOverlay)()}
          >
            返回战斗
          </button>
        ) : (
          <button type="button" className="page-btn-primary" onClick={() => void navigate('/')}>
            返回首页
          </button>
        )}
      </div>

      {popup ? (
        <div
          className="equipment-detail-pop"
          style={equipmentPopoverStyle(popup.rect)}
          role="dialog"
          aria-modal="false"
          aria-labelledby="equipment-pop-summary"
        >
          <div className="equipment-detail-pop-scroll equipment-detail-pop-scroll--minimal">
            <div
              className="equipment-detail-pop-panel"
              style={{ borderLeft: `6px solid ${popup.piece.displayBgCss}` }}
            >
              <p className="equipment-pop-summary" id="equipment-pop-summary">
                {popup.piece.displayName} · {popup.piece.slotLabel} · {popup.piece.tierName}
                {popup.piece.setName ? ` · ${popup.piece.setName}` : ''}
              </p>
              <ul className="equipment-session-loot-affix">
                {popup.piece.normalLines.map((line, li) => (
                  <li key={`n-${li}`}>{line}</li>
                ))}
                {popup.piece.rareLines.map((line, li) => (
                  <li key={`r-${li}`} className="equipment-session-loot-affix--rare">
                    【{line}】
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
