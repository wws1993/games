import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { closePauseEquipmentOverlay, notifyBattleEquipmentChanged } from '../game/meta/gamePauseBridge';

import { getGearBaseStatsForPiece } from '../game/config/gearBaseStatsConfig';
import {
  formatAffixCompareCurrentValue,
  formatAffixCompareDeltaArrowSuffix,
  getAffixIdShortLabel,
  sortedAffixIdsFromTwoTotals,
  type RolledPurpleGearPiece,
} from '../game/config/gearAffixConfig';
import { DEFAULT_PLAYER_WEAPON_KIND } from '../game/config/playerWeaponsConfig';
import { GEAR_GRADE_ORDER, type GearGradeId } from '../game/config/gearGradeConfig';
import { GEAR_SET_DEFS } from '../game/config/gearSetConfig';
import {
  loadAchievementSave,
  quickSellPurpleStashAtOrBelowGrade,
  sellPurpleStashByInstanceIds,
  togglePurpleGearLockByInstanceId,
  tryEquipPurpleFromStash,
  tryUnequipPurpleSlot,
} from '../game/meta/achievementStore';
import { getPlayableHeroDef } from '../game/meta/playableHeroConfig';
import { GearPieceShapeIcon } from './GearPieceShapeIcon';
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

/** 点击后锚定浮层；含 `stashIndex` 供「装备」按钮穿戴 */
type EquipmentPopupState = {
  piece: RolledPurpleGearPiece;
  stashIndex: number;
  rect: DOMRectReadOnly;
};

const EQUIPMENT_POPUP_WIDTH = 322;
const EQUIPMENT_POP_GAP = 10;

/** 按点击的图标矩形在视口内放置浮层：优先在图标下方；`maxHeight` 取可用视口绝大部分，减少内层滚动 */
function equipmentPopoverStyle(rect: DOMRectReadOnly): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(EQUIPMENT_POPUP_WIDTH, vw - EQUIPMENT_POP_GAP * 2);
  let left = rect.left + rect.width / 2 - w / 2;
  left = Math.max(EQUIPMENT_POP_GAP, Math.min(left, vw - w - EQUIPMENT_POP_GAP));
  const margin = EQUIPMENT_POP_GAP * 2;
  const roomBelow = vh - rect.bottom - margin;
  const roomAbove = rect.top - margin;
  const preferBelow = roomBelow >= Math.min(280, vh * 0.42) || roomBelow >= roomAbove;
  const cap = Math.min(vh * 0.9, vh - 8);
  if (preferBelow) {
    const maxH = Math.max(200, Math.min(cap, roomBelow));
    return {
      position: 'fixed',
      left,
      top: rect.bottom + EQUIPMENT_POP_GAP,
      width: w,
      maxHeight: maxH,
    };
  }
  const maxH = Math.max(200, Math.min(cap, roomAbove));
  return {
    position: 'fixed',
    left,
    bottom: vh - rect.top + EQUIPMENT_POP_GAP,
    width: w,
    maxHeight: maxH,
  };
}

/** 比对行尾 ↑/↓ 色调：与 `app.css` 中 `equipment-cmp-up` / `equipment-cmp-down` 一致 */
function equipmentCompareDeltaClass(id: string, rawEq: number, rawCand: number): string | undefined {
  const suf = formatAffixCompareDeltaArrowSuffix(id, rawEq, rawCand);
  if (!suf) {
    return undefined;
  }
  if (suf.endsWith('↑')) {
    return 'equipment-cmp-up';
  }
  if (suf.endsWith('↓')) {
    return 'equipment-cmp-down';
  }
  return undefined;
}

/** 基础攻防移速比对：数值高为↑（与词条箭头样式一致） */
function equipmentBaseCompareArrow(eq: number, cand: number): string {
  const d = cand - eq;
  if (Math.abs(d) < 1e-6) {
    return '';
  }
  return d > 0 ? '↑' : '↓';
}

/** 基础比对行色调：与 `equipmentCompareDeltaClass` 一致 */
function equipmentBaseCompareClass(eq: number, cand: number): string | undefined {
  const d = cand - eq;
  if (Math.abs(d) < 1e-6) {
    return undefined;
  }
  return d > 0 ? 'equipment-cmp-up' : 'equipment-cmp-down';
}

/** 由 `RolledPurpleGearPiece.displayBgCss`（即 `GEAR_GRADE_VISUAL.bgCss`）叠两层渐变：上层保亮度保可读，下层随等阶染色 */
function equipmentGradeBackgroundStyle(bgCss: string): CSSProperties {
  return {
    background: [
      'linear-gradient(180deg, rgba(255,252,248,0.97) 0%, rgba(255,245,236,0.62) 42%, rgba(255,232,218,0.28) 100%)',
      `linear-gradient(165deg, ${bgCss}26 0%, ${bgCss}5c 100%)`,
    ].join(', '),
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

/** 装备页：九格身位切换部位；仓库点选打开详情（与同部位已穿戴词条数值比对、「装备」穿戴）；卸装、一键售阶、多选售卖与锁定 */
export function EquipmentPage({
  mode = 'standalone',
  onCloseBattle,
}: EquipmentPageProps): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [save, setSave] = useState(() => loadAchievementSave());
  const [categoryTab, setCategoryTab] = useState<EquipmentCategoryId>('primary');
  const [popup, setPopup] = useState<EquipmentPopupState | null>(null);
  /** 多选出售模式：右上角「装备售卖」进入，「确认」结算或空选退出 */
  const [sellMode, setSellMode] = useState(false);
  /** 出售勾选的 `stashInstanceId` */
  const [sellSelectedIds, setSellSelectedIds] = useState<Set<string>>(() => new Set());
  /** 一键按等阶售卖：待用户确认的等阶（非 null 时显示自定义确认层） */
  const [quickSellPendingGrade, setQuickSellPendingGrade] = useState<GearGradeId | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const battle = mode === 'battlePause';

  useEffect(() => {
    setSave(loadAchievementSave());
  }, [location.pathname]);

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

  /** 详情浮层内「数值比对」行序：以 `popup.piece.slotId` 同部位已穿戴为基准，与当前查看的仓库件合并列词条 */
  const popupCompareIds = useMemo(() => {
    if (!popup) {
      return [] as string[];
    }
    const slotId = popup.piece.slotId;
    return sortedAffixIdsFromTwoTotals(
      equippedBySlot[slotId]?.affixStatTotals ?? {},
      popup.piece.affixStatTotals ?? {},
    );
  }, [popup, equippedBySlot]);

  /** 详情浮层：同部位已穿戴基础三维（无穿戴为 0） */
  const popupBaseEq = useMemo(() => {
    if (!popup) {
      return { attack: 0, defense: 0, moveSpeed: 0 };
    }
    const eq = equippedBySlot[popup.piece.slotId];
    if (!eq) {
      return { attack: 0, defense: 0, moveSpeed: 0 };
    }
    return getGearBaseStatsForPiece(eq.slotId, eq.grade);
  }, [popup, equippedBySlot]);

  /** 详情浮层：当前查看件基础三维 */
  const popupBaseCand = useMemo(() => {
    if (!popup) {
      return { attack: 0, defense: 0, moveSpeed: 0 };
    }
    return getGearBaseStatsForPiece(popup.piece.slotId, popup.piece.grade);
  }, [popup]);

  const currentSlotLabel = useMemo(
    () => EQUIPMENT_SLOT_DEFS.find((s) => s.key === categoryTab)?.category ?? '',
    [categoryTab],
  );

  /** 已穿戴各套装件数（同 `setId` 计件），供右侧套装面板 */
  const equippedSetCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of Object.values(equippedBySlot)) {
      if (p?.setId) {
        c[p.setId] = (c[p.setId] ?? 0) + 1;
      }
    }
    return c;
  }, [equippedBySlot]);

  /** 仅「已生效」套装：同套件数 ≥3（首档加成起算），与列表展示一致 */
  const activatedGearSets = useMemo(
    () => GEAR_SET_DEFS.filter((set) => (equippedSetCounts[set.id] ?? 0) >= 3),
    [equippedSetCounts],
  );

  /** @param slotId - 须与 `purpleGearStash[stashIndex].slotId` 一致 */
  const onEquipFromStash = (slotId: EquipmentCategoryId, stashIndex: number): void => {
    const r = tryEquipPurpleFromStash(slotId, stashIndex);
    setSave(r.save);
    if (r.ok && battle) {
      notifyBattleEquipmentChanged();
    }
  };

  /** 详情浮层底部「装备」：穿戴当前查看的仓库件并关闭浮层 */
  const onEquipFromDetailPopup = (): void => {
    if (!popup) {
      return;
    }
    onEquipFromStash(popup.piece.slotId, popup.stashIndex);
    setPopup(null);
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
    if (soldCount > 0 && battle) {
      notifyBattleEquipmentChanged();
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

  /** 打开一键售卖确认层（替代 `window.confirm`，风格与装备页一致） */
  const onQuickSellRequest = (maxGrade: GearGradeId): void => {
    if (sellMode) {
      return;
    }
    setQuickSellPendingGrade(maxGrade);
  };

  /** 确认执行一键售卖并关闭弹层 */
  const onQuickSellConfirm = (): void => {
    if (quickSellPendingGrade == null) {
      return;
    }
    const maxGrade = quickSellPendingGrade;
    const { save: next, soldCount } = quickSellPurpleStashAtOrBelowGrade(maxGrade);
    setSave(next);
    setQuickSellPendingGrade(null);
    if (soldCount > 0 && battle) {
      notifyBattleEquipmentChanged();
    }
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
          {sellMode ? '取消' : battle ? '返回战斗' : '返回首页'}
        </button>
        <h1 className="equipment-header-title">装备</h1>
        <button
          type="button"
          className={`equipment-header-sell-btn ${sellMode ? 'equipment-header-sell-btn--confirm' : ''}`}
          onClick={onToggleSellHeader}
        >
          {sellMode ? '确认' : '出售'}
        </button>
      </header>

      {!battle ? (
        <div className="equipment-hero-strip" role="region" aria-label="玩法角色">
          <div className="equipment-hero-strip-meta">
            <span className="equipment-hero-strip-k">玩法角色</span>
            <span className="equipment-hero-strip-v">
              {getPlayableHeroDef(save.selectedPlayableHeroId)?.name ?? '游击队员'}
            </span>
          </div>
          <button
            type="button"
            className="equipment-hero-strip-btn"
            onClick={() => void navigate('/shop?tab=heroes')}
          >
            去商店切换
          </button>
        </div>
      ) : null}

      <div className="equipment-body" ref={bodyRef}>
        <div className="equipment-content-shell">
          {sellMode ? (
            <p className="equipment-sell-banner">售卖模式：点选下方装备，再按右上角「确认」出售；已穿戴与锁定不可选。</p>
          ) : null}

          {/* <section className="equipment-hero" aria-label="角色与聚合属性">
            <div className="equipment-hero-figure">
              <p className="equipment-hero-figure-label">作战员</p>
              <EquipmentFigurePreview />
            </div>
            <div className="equipment-hero-meta">
              <p className="equipment-hint-sub">
                击杀掉落紫箱装备已入库；点身位格切换部位并筛选下方仓库。主武器局内由触摸切枪（玩法角色可限制武器池），数值由九件紫装词条聚合。
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
          </section> */}

          <div className="equipment-slots-and-sets">
            <section
              className="equipment-panel equipment-panel--slots equipment-panel--slots-compact"
              aria-labelledby="equipment-slots-heading"
            >
              <h2 id="equipment-slots-heading" className="equipment-panel-title">
                身位
              </h2>
              <p className="equipment-panel-lead equipment-panel-lead--compact">
                点格切换部位
              </p>
              <div className="equipment-slots-grid-wrap">
                <div className="equipment-mini-grid-9 equipment-mini-grid-9--compact" role="group" aria-label="装备身位槽位">
                  {MINI_GRID_CELLS.map((slot) => {
                    const eq = equippedBySlot[slot.key];
                    const isActive = categoryTab === slot.key;
                    return (
                      <button
                        key={slot.key}
                        type="button"
                        className={`equipment-grid-cell equipment-grid-cell--slot-btn equipment-mini-cell equipment-mini-cell--compact ${
                          eq ? 'equipment-grid-cell--purple-on' : ''
                        } ${isActive ? 'equipment-mini-cell--active' : ''}`}
                        style={eq ? equipmentGradeBackgroundStyle(eq.displayBgCss) : undefined}
                        aria-label={`${slot.category}：${eq ? eq.displayName : '空'}${isActive ? '（当前）' : ''}`}
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => switchCategoryTab(slot.key)}
                      >
                        <span className="equipment-grid-cat equipment-grid-cat--compact">{slot.category}</span>
                        <div className="equipment-mini-shape-wrap">
                          <GearPieceShapeIcon
                            slotId={slot.key}
                            bgCss={eq?.displayBgCss ?? '#a89888'}
                            muted={!eq}
                            size={26}
                          />
                        </div>
                        {eq ? (
                          <>
                            <span className="equipment-grid-name equipment-grid-name--compact">
                              {eq.displayName}
                            </span>
                            <span className="equipment-session-loot-meta equipment-mini-tier equipment-mini-tier--compact">
                              {eq.tierName}
                            </span>
                          </>
                        ) : (
                          <span className="equipment-grid-placeholder equipment-grid-placeholder--compact">空</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="equipment-panel equipment-panel--sets" aria-labelledby="equipment-sets-heading">
              <h2 id="equipment-sets-heading" className="equipment-panel-title">
                套装
              </h2>
              <p className="equipment-panel-lead equipment-panel-lead--sets">已生效（≥3 件）·横向排列</p>
              {activatedGearSets.length === 0 ? (
                <p className="equipment-set-empty" role="status">
                  暂无已生效套装（同套需至少 3 件）
                </p>
              ) : (
                <div className="equipment-set-list" role="list">
                  {activatedGearSets.map((set) => {
                    const n = equippedSetCounts[set.id] ?? 0;
                    return (
                      <section key={set.id} className="equipment-set-card" role="listitem">
                        <div className="equipment-set-card-head">
                          <span className="equipment-set-card-name">{set.name}</span>
                          <span className="equipment-set-card-count" aria-label={`已穿戴 ${n} 件`}>
                            {n}/9
                          </span>
                        </div>
                        <ul className="equipment-set-bonus-list">
                          <li className={`equipment-set-bonus-row ${n >= 3 ? 'equipment-set-bonus-row--on' : ''}`}>
                            <span className="equipment-set-bonus-k">3</span>
                            <span className="equipment-set-bonus-v">{set.bonus3}</span>
                          </li>
                          <li className={`equipment-set-bonus-row ${n >= 6 ? 'equipment-set-bonus-row--on' : ''}`}>
                            <span className="equipment-set-bonus-k">6</span>
                            <span className="equipment-set-bonus-v">{set.bonus6}</span>
                          </li>
                          <li className={`equipment-set-bonus-row ${n >= 9 ? 'equipment-set-bonus-row--on' : ''}`}>
                            <span className="equipment-set-bonus-k">9</span>
                            <span className="equipment-set-bonus-v">{set.bonus9}</span>
                          </li>
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}
            </aside>
          </div>

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
                    卸下装备
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
                  {GEAR_GRADE_ORDER.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className="equipment-quick-sell-chip"
                      title={`出售${g}及以下等阶（未锁定、未穿戴）`}
                      onClick={() => onQuickSellRequest(g)}
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
                    style={equipmentGradeBackgroundStyle(piece.displayBgCss)}
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
                        if (popup?.piece.stashInstanceId === piece.stashInstanceId) {
                          setPopup(null);
                          return;
                        }
                        setPopup({ piece, stashIndex, rect });
                      }}
                    >
                      <GearPieceShapeIcon
                        className="equipment-icon-tile-shape"
                        slotId={piece.slotId}
                        bgCss={piece.displayBgCss}
                        size={46}
                      />
                      <span className="equipment-grid-name equipment-icon-tile-name">
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
                      <svg className="equipment-icon-lock-svg" width="11" height="11" viewBox="0 0 24 24" aria-hidden>
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

      {popup ? (
        <>
          <button
            type="button"
            className="equipment-popup-backdrop"
            aria-label="关闭装备详情"
            onClick={() => setPopup(null)}
          />
          <div
            className="equipment-detail-pop equipment-detail-pop--fit"
            style={equipmentPopoverStyle(popup.rect)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="equipment-pop-name"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="equipment-detail-pop-scroll equipment-detail-pop-scroll--fit">
              <div
                className="equipment-detail-pop-panel equipment-detail-pop-panel--fit"
                style={{
                  ...equipmentGradeBackgroundStyle(popup.piece.displayBgCss),
                  borderLeft: `6px solid ${popup.piece.displayBgCss}`,
                }}
              >
                <button
                  type="button"
                  className="equipment-pop-close"
                  aria-label="关闭详情"
                  onClick={() => setPopup(null)}
                >
                  ×
                </button>
                <div className="equipment-pop-head equipment-pop-head--compact">
                  <div className="equipment-pop-icon-frame equipment-pop-icon-frame--compact" aria-hidden>
                    <GearPieceShapeIcon
                      slotId={popup.piece.slotId}
                      bgCss={popup.piece.displayBgCss}
                      size={44}
                    />
                  </div>
                  <div className="equipment-pop-title-block">
                    <h3 className="equipment-pop-name equipment-pop-name--compact" id="equipment-pop-name">
                      {popup.piece.displayName}
                    </h3>
                    <div className="equipment-pop-badges">
                      <span className="equipment-pop-badge">{popup.piece.slotLabel}</span>
                      <span className="equipment-pop-badge equipment-pop-badge--grade">{popup.piece.tierName}</span>
                      {popup.piece.setName ? (
                        <span className="equipment-pop-badge equipment-pop-badge--set">{popup.piece.setName}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <section className="equipment-pop-stats equipment-pop-stats--compare" aria-label="数值比对">
                  <h4 className="equipment-pop-stats-title">数值比对</h4>
                  <p className="equipment-pop-cmp-legend">基础属性</p>
                  <div className="equipment-pop-cmp-inline-wrap">
                    <ul className="equipment-pop-cmp-inline-list">
                      {(
                        [
                          ['攻击', popupBaseEq.attack, popupBaseCand.attack],
                          ['防御', popupBaseEq.defense, popupBaseCand.defense],
                          ['移速', popupBaseEq.moveSpeed, popupBaseCand.moveSpeed],
                        ] as const
                      ).map(([label, eqV, candV]) => {
                        const arr = equipmentBaseCompareArrow(eqV, candV);
                        const dCls = equipmentBaseCompareClass(eqV, candV);
                        return (
                          <li key={label} className="equipment-pop-cmp-inline-row">
                            <span className="equipment-pop-cmp-inline-name">{label}</span>
                            <span className="equipment-pop-cmp-inline-meta">
                              <span className="equipment-pop-cmp-inline-val">{candV}</span>
                              {arr ? (
                                <span className={`equipment-pop-cmp-inline-delta ${dCls ?? ''}`}>{arr}</span>
                              ) : null}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {popupCompareIds.length > 0 ? (
                    <>
                      <p className="equipment-pop-cmp-subtitle">词条</p>
                      <div className="equipment-pop-cmp-inline-wrap">
                        <ul className="equipment-pop-cmp-inline-list">
                          {popupCompareIds.map((affixId) => {
                            const rawEq =
                              equippedBySlot[popup.piece.slotId]?.affixStatTotals?.[affixId] ?? 0;
                            const rawCand = popup.piece.affixStatTotals?.[affixId] ?? 0;
                            const cur = formatAffixCompareCurrentValue(affixId, rawCand);
                            const arrow = formatAffixCompareDeltaArrowSuffix(affixId, rawEq, rawCand);
                            const dCls = equipmentCompareDeltaClass(affixId, rawEq, rawCand);
                            return (
                              <li key={affixId} className="equipment-pop-cmp-inline-row">
                                <span className="equipment-pop-cmp-inline-name">{getAffixIdShortLabel(affixId)}</span>
                                <span className="equipment-pop-cmp-inline-meta">
                                  <span className="equipment-pop-cmp-inline-val">{cur}</span>
                                  {arrow ? (
                                    <span className={`equipment-pop-cmp-inline-delta ${dCls ?? ''}`}>{arrow}</span>
                                  ) : null}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </>
                  ) : null}
                </section>
                <div className="equipment-pop-actions">
                  <button
                    type="button"
                    className="equipment-pop-equip-btn"
                    disabled={equippedBySlot[popup.piece.slotId]?.stashInstanceId === popup.piece.stashInstanceId}
                    onClick={onEquipFromDetailPopup}
                  >
                    {equippedBySlot[popup.piece.slotId]?.stashInstanceId === popup.piece.stashInstanceId
                      ? '已装备'
                      : '装备'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {quickSellPendingGrade != null ? (
        <>
          <button
            type="button"
            className="equipment-confirm-backdrop"
            aria-label="关闭确认"
            onClick={() => setQuickSellPendingGrade(null)}
          />
          <div
            className="equipment-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="equipment-quick-sell-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="equipment-quick-sell-confirm-title" className="equipment-confirm-title">
              确认一键售卖
            </h2>
            <p className="equipment-confirm-body">
              确定一键出售所有{quickSellPendingGrade} 及以下、未锁定且未穿戴的仓库装备吗？此操作不可撤销。
            </p>
            <div className="equipment-confirm-actions">
              <button
                type="button"
                className="equipment-confirm-btn equipment-confirm-btn--cancel"
                onClick={() => setQuickSellPendingGrade(null)}
              >
                取消
              </button>
              <button type="button" className="equipment-confirm-btn equipment-confirm-btn--ok" onClick={onQuickSellConfirm}>
                确定出售
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
