/**
 * 玩家档案：成就 + 累计统计；本地持久化与单局结算写入（schema 9：紫箱仓库、九部位装备、锁定与出售）
 */
import {
  formatPurpleChestToast,
  genPurpleGearInstanceId,
  rollPurpleChestBundle,
  type PurpleChestBundle,
  type RolledPurpleGearPiece,
} from '../config/gearAffixConfig';
import { GEAR_GRADE_ORDER, gearGradeIndex, type GearGradeId } from '../config/gearGradeConfig';
import { GEAR_DROP_SLOT_ORDER, type GearDropSlotId } from '../config/gearSlotTypes';
import { DEFAULT_PLAYER_WEAPON_KIND } from '../config/playerWeaponsConfig';
import type { PlayerWeaponKind } from '../config/playerWeaponsConfig';
import { ACHIEVEMENT_FIRST_CLEAR_SURVIVAL_SEC, type AchievementId } from './achievementDefs';

const STORAGE_KEY = 'app_game_achievements_v1';

/** 紫箱装备仓库上限（件） */
const PURPLE_GEAR_STASH_MAX = 720;

/** 当前存档结构（schema 9：紫箱仓库 + 九部位装备 + 锁定实例 id 列表） */
export interface PlayerProfileSave {
  schemaVersion: 9;
  /** 所有局累计击杀 */
  totalKills: number;
  /** 累计阵亡次数（每次 game over 结算记 1） */
  deathCount: number;
  /** 是否已达成过「第一滴血」通关条件 */
  firstClearEver: boolean;
  /** 所有已结算局的存活时间总和（秒） */
  totalPlayTimeSec: number;
  /** 已结算局数（与 `recordRunEndForAchievements` 调用次数一致） */
  totalSessions: number;
  /** 单局最长存活（秒） */
  bestSurvivalSec: number;
  /** 拾取紫箱并入库的装备（可重复）；装备页从此列表选件穿戴到九部位 */
  purpleGearStash: RolledPurpleGearPiece[];
  /** 各部位当前穿戴的紫装（引用仓库中同结构的快照） */
  equippedPurpleBySlot: Partial<Record<GearDropSlotId, RolledPurpleGearPiece>>;
  /** `stashInstanceId` 集合：锁定后不可被出售（含一键售卖） */
  purpleGearLockedInstanceIds: string[];
}

/** @deprecated 与 `PlayerProfileSave` 同义，成就页历史引用 */
export type AchievementSaveV1 = PlayerProfileSave;

/** 固定开局主武器（原军功商店配发三八式） */
export function getDefaultWeaponKind(): PlayerWeaponKind {
  return DEFAULT_PLAYER_WEAPON_KIND;
}

function normalizeCoreV9(
  o: Partial<PlayerProfileSave> & Record<string, unknown>,
): Omit<PlayerProfileSave, 'schemaVersion' | 'purpleGearStash' | 'equippedPurpleBySlot' | 'purpleGearLockedInstanceIds'> {
  return {
    totalKills: Math.max(0, Math.floor(Number(o.totalKills) || 0)),
    deathCount: Math.max(0, Math.floor(Number(o.deathCount) || 0)),
    firstClearEver: Boolean(o.firstClearEver),
    totalPlayTimeSec: Math.max(0, Number(o.totalPlayTimeSec) || 0),
    totalSessions: Math.max(0, Math.floor(Number(o.totalSessions) || 0)),
    bestSurvivalSec: Math.max(0, Number(o.bestSurvivalSec) || 0),
  };
}

const SLOT_ID_SET = new Set<GearDropSlotId>(GEAR_DROP_SLOT_ORDER.map((r) => r.id));

const GRADE_SET = new Set<string>(GEAR_GRADE_ORDER);

function normalizeGearGrade(raw: unknown): GearGradeId {
  return typeof raw === 'string' && GRADE_SET.has(raw) ? (raw as GearGradeId) : 'E';
}

/** 归一化单件紫装 JSON；残缺则 null */
export function normalizePurpleGearPiece(el: unknown): RolledPurpleGearPiece | null {
  if (!el || typeof el !== 'object') {
    return null;
  }
  const p = el as Partial<RolledPurpleGearPiece>;
  if (typeof p.slotId !== 'string' || !SLOT_ID_SET.has(p.slotId as GearDropSlotId)) {
    return null;
  }
  if (!Array.isArray(p.normalLines) || !Array.isArray(p.rareLines)) {
    return null;
  }
  const affixStatTotals: Record<string, number> =
    p.affixStatTotals && typeof p.affixStatTotals === 'object' && !Array.isArray(p.affixStatTotals)
      ? { ...(p.affixStatTotals as Record<string, number>) }
      : {};
  const sid =
    typeof p.stashInstanceId === 'string' && p.stashInstanceId.length > 0 ? p.stashInstanceId : '';
  return {
    slotId: p.slotId as GearDropSlotId,
    slotLabel: typeof p.slotLabel === 'string' ? p.slotLabel : '',
    grade: normalizeGearGrade(p.grade),
    stashInstanceId: sid,
    catalogId: typeof p.catalogId === 'string' ? p.catalogId : '',
    displayName: typeof p.displayName === 'string' ? p.displayName : '',
    setId: p.setId === null || typeof p.setId === 'string' ? p.setId : null,
    setName: p.setName === null || typeof p.setName === 'string' ? p.setName : null,
    tierName: typeof p.tierName === 'string' ? p.tierName : '',
    displayFillColor: typeof p.displayFillColor === 'number' ? p.displayFillColor : 0,
    displayBgCss: typeof p.displayBgCss === 'string' ? p.displayBgCss : '#333',
    normalLines: p.normalLines as string[],
    rareLines: p.rareLines as string[],
    affixStatTotals,
  };
}

function normalizePurpleGearStash(raw: unknown): RolledPurpleGearPiece[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: RolledPurpleGearPiece[] = [];
  for (const el of raw) {
    const p = normalizePurpleGearPiece(el);
    if (p) {
      out.push(p);
    }
  }
  return out.slice(-PURPLE_GEAR_STASH_MAX);
}

function normalizeLockedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const ids = raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
  return [...new Set(ids)];
}

function normalizeEquippedPurpleBySlot(
  raw: unknown,
): Partial<Record<GearDropSlotId, RolledPurpleGearPiece>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const src = raw as Record<string, unknown>;
  const out: Partial<Record<GearDropSlotId, RolledPurpleGearPiece>> = {};
  for (const row of GEAR_DROP_SLOT_ORDER) {
    const v = src[row.id];
    const p = normalizePurpleGearPiece(v);
    if (p && p.slotId === row.id) {
      out[row.id] = p;
    }
  }
  return out;
}

/** 完整 profile 归一化（schema 9） */
function normalizeV9(o: Partial<PlayerProfileSave> & Record<string, unknown>): PlayerProfileSave {
  return {
    schemaVersion: 9,
    ...normalizeCoreV9(o),
    purpleGearStash: normalizePurpleGearStash(o.purpleGearStash),
    equippedPurpleBySlot: normalizeEquippedPurpleBySlot(o.equippedPurpleBySlot),
    purpleGearLockedInstanceIds: normalizeLockedIds(o.purpleGearLockedInstanceIds),
  };
}

/**
 * 为旧存档补齐 `stashInstanceId` 并修剪无效锁定；有变更时返回 true 以便持久化
 * @param save - 已归一化的档案（可就地修改）
 */
function ensurePurpleGearInstanceIdsAndLocks(save: PlayerProfileSave): boolean {
  let dirty = false;
  const gen = (): string => genPurpleGearInstanceId();
  for (const p of save.purpleGearStash) {
    if (!p.stashInstanceId) {
      p.stashInstanceId = gen();
      dirty = true;
    }
  }
  for (const row of GEAR_DROP_SLOT_ORDER) {
    const p = save.equippedPurpleBySlot[row.id];
    if (p && !p.stashInstanceId) {
      p.stashInstanceId = gen();
      dirty = true;
    }
  }
  const stashIds = new Set(save.purpleGearStash.map((p) => p.stashInstanceId));
  const pruned = save.purpleGearLockedInstanceIds.filter((id) => stashIds.has(id));
  if (pruned.length !== save.purpleGearLockedInstanceIds.length) {
    save.purpleGearLockedInstanceIds = pruned;
    dirty = true;
  }
  return dirty;
}

/**
 * 读档后统一收尾：schema 升级、实例 id、锁定表修剪
 * @param save - 已从磁盘归一化或迁移的档案
 */
function finalizeProfileAfterLoad(save: PlayerProfileSave): PlayerProfileSave {
  let s = save;
  if (s.schemaVersion < 9) {
    s = {
      ...s,
      schemaVersion: 9,
      purpleGearLockedInstanceIds: normalizeLockedIds(s.purpleGearLockedInstanceIds),
    };
  }
  const dirty = ensurePurpleGearInstanceIdsAndLocks(s);
  if (dirty) {
    persist(s);
  }
  return s;
}

/** 将紫箱多件压入仓库并截断上限 */
export function appendPiecesToPurpleStash(save: PlayerProfileSave, pieces: readonly RolledPurpleGearPiece[]): void {
  for (const pc of pieces) {
    if (!pc.stashInstanceId) {
      pc.stashInstanceId = genPurpleGearInstanceId();
    }
    save.purpleGearStash.push(pc);
  }
  if (save.purpleGearStash.length > PURPLE_GEAR_STASH_MAX) {
    save.purpleGearStash = save.purpleGearStash.slice(-PURPLE_GEAR_STASH_MAX);
  }
}

/** 从 schema 7 迁移：上一局展示掉落并入仓库，清空军功相关 */
function migrateV7JsonToV8(o: Record<string, unknown>): PlayerProfileSave {
  const lootRaw = o.lastSessionPurpleLoot;
  const stashFromLoot: RolledPurpleGearPiece[] = [];
  if (Array.isArray(lootRaw)) {
    for (const el of lootRaw) {
      if (!el || typeof el !== 'object') {
        continue;
      }
      const b = el as { pieces?: unknown };
      if (!Array.isArray(b.pieces)) {
        continue;
      }
      for (const pc of b.pieces) {
        const p = normalizePurpleGearPiece(pc);
        if (p) {
          stashFromLoot.push(p);
        }
      }
    }
  }
  const core = normalizeCoreV9(o as Partial<PlayerProfileSave> & Record<string, unknown>);
  const existingStash = normalizePurpleGearStash(o.purpleGearStash);
  const merged = [...existingStash, ...stashFromLoot];
  const stash = merged.slice(-PURPLE_GEAR_STASH_MAX);
  return normalizeV9({
    ...core,
    purpleGearStash: stash,
    equippedPurpleBySlot: normalizeEquippedPurpleBySlot(o.equippedPurpleBySlot),
    purpleGearLockedInstanceIds: [],
  });
}

const defaultSave = (): PlayerProfileSave => normalizeV9({});

/** 读取存档；旧版逐级迁移至 schema 8 */
export function loadAchievementSave(): PlayerProfileSave {
  if (typeof localStorage === 'undefined') {
    return defaultSave();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSave();
    }
    const o = JSON.parse(raw) as Record<string, unknown>;
    const ver = Number(o.schemaVersion);
    if (ver === 9) {
      return finalizeProfileAfterLoad(
        normalizeV9(o as Partial<PlayerProfileSave> & Record<string, unknown>),
      );
    }
    if (ver === 8) {
      return finalizeProfileAfterLoad(
        normalizeV9({
          ...(o as Partial<PlayerProfileSave> & Record<string, unknown>),
          schemaVersion: 9,
          purpleGearLockedInstanceIds: normalizeLockedIds(o.purpleGearLockedInstanceIds),
        }),
      );
    }
    if (ver === 7 || ver === 6 || ver === 5) {
      const migrated = migrateV7JsonToV8(o);
      persist(migrated);
      return finalizeProfileAfterLoad(migrated);
    }
    /** ver≤4：先构造 v7 形状再迁 v8 */
    if (ver === 4 || ver === 3 || ver === 2 || ver === 1) {
      const migrated = migrateV7JsonToV8({
        ...o,
        lastSessionPurpleLoot: [],
        purpleGearStash: [],
        equippedPurpleBySlot: {},
      });
      persist(migrated);
      return finalizeProfileAfterLoad(migrated);
    }
    return defaultSave();
  } catch {
    return defaultSave();
  }
}

export function persist(save: PlayerProfileSave): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    /* 配额满等 */
  }
}

/** 根据存档推导已解锁成就 id */
export function getUnlockedAchievementIds(save: PlayerProfileSave): Set<AchievementId> {
  const u = new Set<AchievementId>();
  if (save.firstClearEver) {
    u.add('first_clear');
  }
  if (save.totalKills >= 100) {
    u.add('kills_100');
  }
  if (save.totalKills >= 1000) {
    u.add('kills_1000');
  }
  if (save.totalKills >= 10000) {
    u.add('kills_10000');
  }
  if (save.deathCount >= 1) {
    u.add('die_once');
  }
  return u;
}

/**
 * 一局结束（通常阵亡回首页）时调用：击杀、死亡、通关判定，并累计时长与局数（紫箱已在拾取时入库）
 * @param params.killsThisRun - 本局击杀数
 * @param params.died - 本局是否以阵亡结束
 * @param params.survivalSec - 本局存活秒数（`gameTime`）
 */
export function recordRunEndForAchievements(params: {
  killsThisRun: number;
  died: boolean;
  survivalSec: number;
}): PlayerProfileSave {
  const save = loadAchievementSave();
  const k = Math.max(0, Math.floor(params.killsThisRun));
  save.totalKills += k;
  if (params.died) {
    save.deathCount += 1;
  }
  const surv = Math.max(0, Number(params.survivalSec) || 0);
  save.totalPlayTimeSec += surv;
  save.totalSessions += 1;
  if (surv > save.bestSurvivalSec) {
    save.bestSurvivalSec = surv;
  }
  if (
    !save.firstClearEver &&
    params.died &&
    surv >= ACHIEVEMENT_FIRST_CLEAR_SURVIVAL_SEC
  ) {
    save.firstClearEver = true;
  }
  persist(save);
  return save;
}

/** 供成就页顶部摘要 */
export function getAchievementProgressSummary(save: PlayerProfileSave): {
  totalKills: number;
  deathCount: number;
} {
  return { totalKills: save.totalKills, deathCount: save.deathCount };
}

/** 供数据统计页：结构化数值 */
export function getPlayerStatsSnapshot(save = loadAchievementSave()): {
  totalPlayTimeSec: number;
  totalSessions: number;
  bestSurvivalSec: number;
  totalKills: number;
  deathCount: number;
  avgSurvivalSec: number;
} {
  const n = save.totalSessions;
  const avgSurvivalSec = n > 0 ? save.totalPlayTimeSec / n : 0;
  return {
    totalPlayTimeSec: save.totalPlayTimeSec,
    totalSessions: save.totalSessions,
    bestSurvivalSec: save.bestSurvivalSec,
    totalKills: save.totalKills,
    deathCount: save.deathCount,
    avgSurvivalSec,
  };
}

/** 已装备紫装列表（部位顺序稳定，供词条聚合） */
export function getEquippedPurplePiecesOrdered(save = loadAchievementSave()): RolledPurpleGearPiece[] {
  const m = save.equippedPurpleBySlot ?? {};
  const out: RolledPurpleGearPiece[] = [];
  for (const row of GEAR_DROP_SLOT_ORDER) {
    const p = m[row.id];
    if (p) {
      out.push(p);
    }
  }
  return out;
}

/**
 * 从仓库指定索引穿戴到 `slotId`（须与件的部位一致）
 * @param stashIndex - `purpleGearStash` 下标
 */
export function tryEquipPurpleFromStash(
  slotId: GearDropSlotId,
  stashIndex: number,
): { ok: boolean; save: PlayerProfileSave } {
  const save = loadAchievementSave();
  const item = save.purpleGearStash[stashIndex];
  if (!item || item.slotId !== slotId) {
    return { ok: false, save };
  }
  save.equippedPurpleBySlot = {
    ...save.equippedPurpleBySlot,
    [slotId]: { ...item },
  };
  persist(save);
  return { ok: true, save };
}

/** 卸下某部位紫装 */
export function tryUnequipPurpleSlot(slotId: GearDropSlotId): PlayerProfileSave {
  const save = loadAchievementSave();
  const next = { ...save.equippedPurpleBySlot };
  delete next[slotId];
  save.equippedPurpleBySlot = next;
  persist(save);
  return save;
}

function getEquippedStashInstanceIdSet(save: PlayerProfileSave): Set<string> {
  const ids = new Set<string>();
  for (const row of GEAR_DROP_SLOT_ORDER) {
    const id = save.equippedPurpleBySlot[row.id]?.stashInstanceId;
    if (id) {
      ids.add(id);
    }
  }
  return ids;
}

/**
 * 切换某仓库实例的锁定状态；锁定件不可出售（多选与一键售卖均排除）
 * @param instanceId - `RolledPurpleGearPiece.stashInstanceId`
 */
export function togglePurpleGearLockByInstanceId(instanceId: string): PlayerProfileSave {
  const save = loadAchievementSave();
  const exists = save.purpleGearStash.some((p) => p.stashInstanceId === instanceId);
  if (!exists) {
    return save;
  }
  const set = new Set(save.purpleGearLockedInstanceIds);
  if (set.has(instanceId)) {
    set.delete(instanceId);
  } else {
    set.add(instanceId);
  }
  save.purpleGearLockedInstanceIds = [...set];
  persist(save);
  return save;
}

/**
 * 按实例 id 批量卖出仓库中的装备；已穿戴、已锁定或不在仓库中的 id 会被忽略
 * @param instanceIds - 欲出售的 `stashInstanceId` 列表
 */
export function sellPurpleStashByInstanceIds(instanceIds: readonly string[]): {
  save: PlayerProfileSave;
  soldCount: number;
} {
  const save = loadAchievementSave();
  const locked = new Set(save.purpleGearLockedInstanceIds);
  const equipped = getEquippedStashInstanceIdSet(save);
  const want = new Set(
    instanceIds.filter((id) => id.length > 0 && !locked.has(id) && !equipped.has(id)),
  );
  if (want.size === 0) {
    return { save, soldCount: 0 };
  }
  const before = save.purpleGearStash.length;
  save.purpleGearStash = save.purpleGearStash.filter((p) => !want.has(p.stashInstanceId));
  const soldCount = before - save.purpleGearStash.length;
  save.purpleGearLockedInstanceIds = save.purpleGearLockedInstanceIds.filter((id) => !want.has(id));
  persist(save);
  return { save, soldCount };
}

/**
 * 一键售卖：出售等阶不高于 `maxGrade` 的仓库件（未锁定且未穿戴）
 * @param maxGrade - 该等阶及更低等阶的件均会被卖出（按 `GEAR_GRADE_ORDER`）
 */
export function quickSellPurpleStashAtOrBelowGrade(maxGrade: GearGradeId): {
  save: PlayerProfileSave;
  soldCount: number;
} {
  const save = loadAchievementSave();
  const maxIdx = gearGradeIndex(maxGrade);
  const locked = new Set(save.purpleGearLockedInstanceIds);
  const equipped = getEquippedStashInstanceIdSet(save);
  const ids: string[] = [];
  for (const p of save.purpleGearStash) {
    if (locked.has(p.stashInstanceId)) {
      continue;
    }
    if (equipped.has(p.stashInstanceId)) {
      continue;
    }
    if (gearGradeIndex(p.grade) <= maxIdx) {
      ids.push(p.stashInstanceId);
    }
  }
  return sellPurpleStashByInstanceIds(ids);
}

/**
 * 局内紫箱拾取：按怪等级掉落 1～5 件并入仓库
 * @param monsterLevel - 被击杀敌人等级，影响件数与等阶权重
 */
export function applyPurpleChestLoot(monsterLevel: number): {
  bundle: PurpleChestBundle;
  toastFullText: string;
} {
  const save = loadAchievementSave();
  const bundle = rollPurpleChestBundle(monsterLevel);
  appendPiecesToPurpleStash(save, bundle.pieces);
  persist(save);
  return { bundle, toastFullText: formatPurpleChestToast(bundle) };
}
