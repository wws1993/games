/**
 * 玩家档案：成就 + 累计统计 + 金币与商店解锁；本地持久化与单局结算写入（schema 11：玩法角色；主武器由紫箱掉落解锁）
 */
import {
  formatPurpleChestToast,
  genPurpleGearInstanceId,
  rollPurpleChestBundle,
  type PurpleChestBundle,
  type RolledPurpleGearPiece,
} from '../config/gearAffixConfig';
import {
  GEAR_GRADE_ORDER,
  GEAR_GRADE_VISUAL,
  gearGradeIndex,
  type GearGradeId,
} from '../config/gearGradeConfig';
import { GEAR_DROP_SLOT_ORDER, type GearDropSlotId } from '../config/gearSlotTypes';
import {
  DEFAULT_PLAYER_WEAPON_KIND,
  PLAYER_WEAPON_DEFS,
  PLAYER_WEAPON_ORDER,
} from '../config/playerWeaponsConfig';
import type { PlayerWeaponKind } from '../config/playerWeaponsConfig';
import {
  CHARACTER_SKIN_SHOP_DEFS,
  DEFAULT_CHARACTER_SKIN_ID,
  DEFAULT_PLAYER_VECTOR_PALETTE,
  DEFAULT_WEAPON_COSMETIC_ID,
  type PlayerVectorPalette,
  WEAPON_COSMETIC_SHOP_DEFS,
  type WeaponCosmeticShopDef,
} from './metaUnlockShopConfig';
import {
  DADAO_LEADER_HERO_ID,
  DEFAULT_PLAYABLE_HERO_ID,
  getPlayableHeroDef,
  PLAYABLE_HERO_DEFS,
  PLAYABLE_HERO_ORDER,
  type PlayableHeroId,
  SHARPSHOOTER_HERO_ID,
  usesCharacterSkinPalette,
  YAN_SHUANGYING_HERO_ID,
} from './playableHeroConfig';
import {
  ACHIEVEMENT_DEFS,
  ACHIEVEMENT_BEST_SURVIVAL_180_SEC,
  ACHIEVEMENT_BEST_SURVIVAL_600_SEC,
  ACHIEVEMENT_FIRST_CLEAR_SURVIVAL_SEC,
  ACHIEVEMENT_TOTAL_PLAY_1H_SEC,
  ACHIEVEMENT_TOTAL_PLAY_2H_SEC,
  type AchievementId,
} from './achievementDefs';

const STORAGE_KEY = 'app_game_achievements_v1';

/** 紫箱装备仓库上限（件） */
const PURPLE_GEAR_STASH_MAX = 720;

/** 当前存档结构（schema 11：玩法角色燕双鹰等） */
export interface PlayerProfileSave {
  schemaVersion: 11;
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
  /** 局外货币；单局结算与商店消费 */
  coins: number;
  /** 已解锁角色外观 id（见 `CHARACTER_SKIN_SHOP_DEFS`） */
  unlockedCharacterIds: string[];
  /** 当前选用角色外观 */
  selectedCharacterId: string;
  /** 已解锁枪皮 id（见 `WEAPON_COSMETIC_SHOP_DEFS`） */
  unlockedWeaponSkinIds: string[];
  /** 当前选用枪皮 */
  selectedWeaponSkinId: string;
  /** 已解锁玩法角色（默认游击队员；燕双鹰可免费选用） */
  unlockedPlayableHeroIds: PlayableHeroId[];
  /** 当前开局玩法角色：影响局内武器池与被动 */
  selectedPlayableHeroId: PlayableHeroId;
  /** 已解锁主武器种类（默认三八式；其余由紫箱额外掉落解锁）；顺序以 `PLAYER_WEAPON_ORDER` 为准 */
  unlockedWeaponKinds: PlayerWeaponKind[];
  /** 拾取紫箱并入库的装备（可重复）；装备页从此列表选件穿戴到九部位 */
  purpleGearStash: RolledPurpleGearPiece[];
  /** 各部位当前穿戴的紫装（引用仓库中同结构的快照） */
  equippedPurpleBySlot: Partial<Record<GearDropSlotId, RolledPurpleGearPiece>>;
  /** `stashInstanceId` 集合：锁定后不可被出售（含一键售卖） */
  purpleGearLockedInstanceIds: string[];
}

/** @deprecated 与 `PlayerProfileSave` 同义，成就页历史引用 */
export type AchievementSaveV1 = PlayerProfileSave;

/** 固定开局主武器（默认三八式） */
export function getDefaultWeaponKind(): PlayerWeaponKind {
  return DEFAULT_PLAYER_WEAPON_KIND;
}

function normalizeCoreV9(
  o: Partial<PlayerProfileSave> & Record<string, unknown>,
): Pick<
  PlayerProfileSave,
  'totalKills' | 'deathCount' | 'firstClearEver' | 'totalPlayTimeSec' | 'totalSessions' | 'bestSurvivalSec'
> {
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

const CHAR_SHOP_ID_SET = new Set(CHARACTER_SKIN_SHOP_DEFS.map((d) => d.id));
const WEAPON_SKIN_ID_SET = new Set(WEAPON_COSMETIC_SHOP_DEFS.map((d) => d.id));
const WEAPON_KIND_SET = new Set<PlayerWeaponKind>(PLAYER_WEAPON_ORDER);
const PLAYABLE_HERO_ID_SET = new Set<string>(PLAYABLE_HERO_ORDER);

function normalizeUnlockedPlayableHeroIds(raw: unknown): PlayableHeroId[] {
  const arr = Array.isArray(raw) ? raw : [];
  const valid = arr.filter((x): x is PlayableHeroId => typeof x === 'string' && PLAYABLE_HERO_ID_SET.has(x));
  const uniq = [...new Set(valid)] as PlayableHeroId[];
  if (!uniq.includes(DEFAULT_PLAYABLE_HERO_ID)) {
    uniq.unshift(DEFAULT_PLAYABLE_HERO_ID);
  }
  for (const id of PLAYABLE_HERO_ORDER) {
    if (!uniq.includes(id)) {
      uniq.push(id);
    }
  }
  return uniq;
}

function pickSelectedPlayableHeroId(raw: unknown, unlocked: readonly PlayableHeroId[]): PlayableHeroId {
  if (typeof raw === 'string' && PLAYABLE_HERO_ID_SET.has(raw) && unlocked.includes(raw as PlayableHeroId)) {
    return raw as PlayableHeroId;
  }
  return unlocked.includes(DEFAULT_PLAYABLE_HERO_ID) ? DEFAULT_PLAYABLE_HERO_ID : unlocked[0]!;
}

function normalizeUnlockedCharacterIds(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const valid = arr.filter((x): x is string => typeof x === 'string' && CHAR_SHOP_ID_SET.has(x));
  const uniq = [...new Set(valid)];
  if (!uniq.includes(DEFAULT_CHARACTER_SKIN_ID)) {
    uniq.unshift(DEFAULT_CHARACTER_SKIN_ID);
  }
  return uniq;
}

function normalizeUnlockedWeaponSkinIds(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const valid = arr.filter((x): x is string => typeof x === 'string' && WEAPON_SKIN_ID_SET.has(x));
  const uniq = [...new Set(valid)];
  if (!uniq.includes(DEFAULT_WEAPON_COSMETIC_ID)) {
    uniq.unshift(DEFAULT_WEAPON_COSMETIC_ID);
  }
  return uniq;
}

function normalizeUnlockedWeaponKinds(raw: unknown): PlayerWeaponKind[] {
  const arr = Array.isArray(raw) ? raw : [];
  const picked: PlayerWeaponKind[] = [];
  for (const x of arr) {
    if (typeof x === 'string' && WEAPON_KIND_SET.has(x as PlayerWeaponKind)) {
      picked.push(x as PlayerWeaponKind);
    }
  }
  if (!picked.includes(DEFAULT_PLAYER_WEAPON_KIND)) {
    picked.unshift(DEFAULT_PLAYER_WEAPON_KIND);
  }
  return PLAYER_WEAPON_ORDER.filter((k) => picked.includes(k));
}

function pickSelectedId(
  raw: unknown,
  unlocked: readonly string[],
  fallback: string,
): string {
  if (typeof raw === 'string' && unlocked.includes(raw)) {
    return raw;
  }
  return unlocked.includes(fallback) ? fallback : unlocked[0]!;
}

/** 完整 profile 归一化（schema 11：含玩法角色；旧存档 ver≤10 读入时补齐） */
function normalizeV10(o: Partial<PlayerProfileSave> & Record<string, unknown>): PlayerProfileSave {
  const ver = Number(o.schemaVersion) || 0;
  const core = normalizeCoreV9(o);
  const coins = ver >= 10 ? Math.max(0, Math.floor(Number(o.coins) || 0)) : 0;
  const unlockedCharacterIds =
    ver >= 10 ? normalizeUnlockedCharacterIds(o.unlockedCharacterIds) : [DEFAULT_CHARACTER_SKIN_ID];
  const unlockedWeaponSkinIds =
    ver >= 10 ? normalizeUnlockedWeaponSkinIds(o.unlockedWeaponSkinIds) : [DEFAULT_WEAPON_COSMETIC_ID];
  const unlockedWeaponKinds =
    ver >= 10 ? normalizeUnlockedWeaponKinds(o.unlockedWeaponKinds) : [DEFAULT_PLAYER_WEAPON_KIND];
  const selectedCharacterId = pickSelectedId(
    o.selectedCharacterId,
    unlockedCharacterIds,
    DEFAULT_CHARACTER_SKIN_ID,
  );
  const selectedWeaponSkinId = pickSelectedId(
    o.selectedWeaponSkinId,
    unlockedWeaponSkinIds,
    DEFAULT_WEAPON_COSMETIC_ID,
  );
  const unlockedPlayableHeroIds = normalizeUnlockedPlayableHeroIds(o.unlockedPlayableHeroIds);
  const selectedPlayableHeroId = pickSelectedPlayableHeroId(o.selectedPlayableHeroId, unlockedPlayableHeroIds);
  return {
    schemaVersion: 11,
    ...core,
    coins,
    unlockedCharacterIds,
    selectedCharacterId,
    unlockedWeaponSkinIds,
    selectedWeaponSkinId,
    unlockedPlayableHeroIds,
    selectedPlayableHeroId,
    unlockedWeaponKinds,
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
    } as unknown as PlayerProfileSave;
  }
  if (s.schemaVersion < 11) {
    s = normalizeV10(s as unknown as Record<string, unknown>);
    persist(s);
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

/** 从 schema 7 迁移：上一局展示掉落并入仓库，丢弃旧版局外字段 */
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
  return normalizeV10({
    ...core,
    purpleGearStash: stash,
    equippedPurpleBySlot: normalizeEquippedPurpleBySlot(o.equippedPurpleBySlot),
    purpleGearLockedInstanceIds: [],
    schemaVersion: 9,
  } as unknown as Partial<PlayerProfileSave> & Record<string, unknown>);
}

const defaultSave = (): PlayerProfileSave => normalizeV10({});

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
    if (ver === 11) {
      return finalizeProfileAfterLoad(
        normalizeV10(o as Partial<PlayerProfileSave> & Record<string, unknown>),
      );
    }
    if (ver === 10) {
      return finalizeProfileAfterLoad(
        normalizeV10(o as Partial<PlayerProfileSave> & Record<string, unknown>),
      );
    }
    if (ver === 9) {
      return finalizeProfileAfterLoad(
        normalizeV10(o as Partial<PlayerProfileSave> & Record<string, unknown>),
      );
    }
    if (ver === 8) {
      return finalizeProfileAfterLoad(
        normalizeV10({
          ...(o as Partial<PlayerProfileSave> & Record<string, unknown>),
          schemaVersion: 9,
          purpleGearLockedInstanceIds: normalizeLockedIds(o.purpleGearLockedInstanceIds),
        } as unknown as Partial<PlayerProfileSave> & Record<string, unknown>),
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
  if (save.totalKills >= 50000) {
    u.add('kills_50000');
  }
  if (save.totalKills >= 100000) {
    u.add('kills_100000');
  }
  if (save.totalSessions >= 10) {
    u.add('sessions_10');
  }
  if (save.totalSessions >= 50) {
    u.add('sessions_50');
  }
  if (save.totalSessions >= 100) {
    u.add('sessions_100');
  }
  if (save.totalPlayTimeSec >= ACHIEVEMENT_TOTAL_PLAY_1H_SEC) {
    u.add('total_play_1h');
  }
  if (save.totalPlayTimeSec >= ACHIEVEMENT_TOTAL_PLAY_2H_SEC) {
    u.add('total_play_2h');
  }
  if (save.bestSurvivalSec >= ACHIEVEMENT_BEST_SURVIVAL_180_SEC) {
    u.add('best_survival_180');
  }
  if (save.bestSurvivalSec >= ACHIEVEMENT_BEST_SURVIVAL_600_SEC) {
    u.add('best_survival_600');
  }
  if (save.purpleGearStash.length >= 50) {
    u.add('purple_stash_50');
  }
  if (save.purpleGearStash.length >= 100) {
    u.add('purple_stash_100');
  }
  if (save.purpleGearStash.length >= 200) {
    u.add('purple_stash_200');
  }
  let nineEquipped = true;
  for (const row of GEAR_DROP_SLOT_ORDER) {
    if (!save.equippedPurpleBySlot[row.id]) {
      nineEquipped = false;
      break;
    }
  }
  if (nineEquipped) {
    u.add('nine_equipped');
  }
  if (save.purpleGearLockedInstanceIds.length >= 10) {
    u.add('lock_10');
  }
  if (save.deathCount >= 1) {
    u.add('die_once');
  }
  if (save.deathCount >= 20) {
    u.add('die_20');
  }
  return u;
}

/** 九部位已穿戴紫装件数 0～9 */
function countEquippedPurpleSlots(save: PlayerProfileSave): number {
  let n = 0;
  for (const row of GEAR_DROP_SLOT_ORDER) {
    if (save.equippedPurpleBySlot[row.id]) {
      n += 1;
    }
  }
  return n;
}

/** 成就页进度条与文案：由存档统计推导，与 `getUnlockedAchievementIds` 判定一致 */
export interface AchievementProgressDetail {
  /** 进度分子（真实累计值，可大于 target） */
  current: number;
  /** 目标分母 */
  target: number;
  /** 0～1，用于进度条宽度 */
  ratio: number;
  /** 行内短文案（中文 + 数字） */
  shortLabel: string;
}

/**
 * 单条成就的数值进度（与解锁条件同源）
 * @param save - 玩家档案
 * @param id - 成就 id
 */
export function getAchievementProgressDetail(
  save: PlayerProfileSave,
  id: AchievementId,
): AchievementProgressDetail {
  const clampR = (c: number, t: number): number =>
    t <= 0 ? 1 : Math.min(1, Math.max(0, c / t));

  switch (id) {
    case 'first_clear':
      return save.firstClearEver
        ? { current: 1, target: 1, ratio: 1, shortLabel: '已达成' }
        : { current: 0, target: 1, ratio: 0, shortLabel: '未达成' };
    case 'kills_100':
      return {
        current: save.totalKills,
        target: 100,
        ratio: clampR(save.totalKills, 100),
        shortLabel: `${save.totalKills}/100`,
      };
    case 'kills_1000':
      return {
        current: save.totalKills,
        target: 1000,
        ratio: clampR(save.totalKills, 1000),
        shortLabel: `${save.totalKills}/1000`,
      };
    case 'kills_10000':
      return {
        current: save.totalKills,
        target: 10000,
        ratio: clampR(save.totalKills, 10000),
        shortLabel: `${save.totalKills}/10000`,
      };
    case 'kills_50000':
      return {
        current: save.totalKills,
        target: 50000,
        ratio: clampR(save.totalKills, 50000),
        shortLabel: `${save.totalKills}/50000`,
      };
    case 'kills_100000':
      return {
        current: save.totalKills,
        target: 100000,
        ratio: clampR(save.totalKills, 100000),
        shortLabel: `${save.totalKills}/100000`,
      };
    case 'sessions_10':
      return {
        current: save.totalSessions,
        target: 10,
        ratio: clampR(save.totalSessions, 10),
        shortLabel: `${save.totalSessions}/10 局`,
      };
    case 'sessions_50':
      return {
        current: save.totalSessions,
        target: 50,
        ratio: clampR(save.totalSessions, 50),
        shortLabel: `${save.totalSessions}/50 局`,
      };
    case 'sessions_100':
      return {
        current: save.totalSessions,
        target: 100,
        ratio: clampR(save.totalSessions, 100),
        shortLabel: `${save.totalSessions}/100 局`,
      };
    case 'total_play_1h': {
      const c = save.totalPlayTimeSec;
      const t = ACHIEVEMENT_TOTAL_PLAY_1H_SEC;
      return {
        current: c,
        target: t,
        ratio: clampR(c, t),
        shortLabel: `${(c / 3600).toFixed(2)}h / 1h`,
      };
    }
    case 'total_play_2h': {
      const c = save.totalPlayTimeSec;
      const t = ACHIEVEMENT_TOTAL_PLAY_2H_SEC;
      return {
        current: c,
        target: t,
        ratio: clampR(c, t),
        shortLabel: `${(c / 3600).toFixed(2)}h / 2h`,
      };
    }
    case 'best_survival_180':
      return {
        current: save.bestSurvivalSec,
        target: ACHIEVEMENT_BEST_SURVIVAL_180_SEC,
        ratio: clampR(save.bestSurvivalSec, ACHIEVEMENT_BEST_SURVIVAL_180_SEC),
        shortLabel: `${Math.floor(save.bestSurvivalSec)}/${ACHIEVEMENT_BEST_SURVIVAL_180_SEC} 秒`,
      };
    case 'best_survival_600':
      return {
        current: save.bestSurvivalSec,
        target: ACHIEVEMENT_BEST_SURVIVAL_600_SEC,
        ratio: clampR(save.bestSurvivalSec, ACHIEVEMENT_BEST_SURVIVAL_600_SEC),
        shortLabel: `${Math.floor(save.bestSurvivalSec)}/${ACHIEVEMENT_BEST_SURVIVAL_600_SEC} 秒`,
      };
    case 'purple_stash_50':
      return {
        current: save.purpleGearStash.length,
        target: 50,
        ratio: clampR(save.purpleGearStash.length, 50),
        shortLabel: `${save.purpleGearStash.length}/50 件`,
      };
    case 'purple_stash_100':
      return {
        current: save.purpleGearStash.length,
        target: 100,
        ratio: clampR(save.purpleGearStash.length, 100),
        shortLabel: `${save.purpleGearStash.length}/100 件`,
      };
    case 'purple_stash_200':
      return {
        current: save.purpleGearStash.length,
        target: 200,
        ratio: clampR(save.purpleGearStash.length, 200),
        shortLabel: `${save.purpleGearStash.length}/200 件`,
      };
    case 'nine_equipped': {
      const n = countEquippedPurpleSlots(save);
      return {
        current: n,
        target: 9,
        ratio: clampR(n, 9),
        shortLabel: `${n}/9 部位`,
      };
    }
    case 'lock_10':
      return {
        current: save.purpleGearLockedInstanceIds.length,
        target: 10,
        ratio: clampR(save.purpleGearLockedInstanceIds.length, 10),
        shortLabel: `${save.purpleGearLockedInstanceIds.length}/10 件`,
      };
    case 'die_once':
      return {
        current: save.deathCount,
        target: 1,
        ratio: clampR(save.deathCount, 1),
        shortLabel: `${save.deathCount}/1 次`,
      };
    case 'die_20':
      return {
        current: save.deathCount,
        target: 20,
        ratio: clampR(save.deathCount, 20),
        shortLabel: `${save.deathCount}/20 次`,
      };
  }
}

/**
 * 本局结算可得金币（与 `recordRunEndForAchievements` 内加算规则一致，供局内结算展示）
 * @param params.killsThisRun - 本局击杀数
 * @param params.survivalSec - 本局存活秒数
 */
export function computeRunCoinReward(params: { killsThisRun: number; survivalSec: number }): number {
  const k = Math.max(0, Math.floor(params.killsThisRun));
  const surv = Math.max(0, Number(params.survivalSec) || 0);
  const base = 12;
  const perKill = 2;
  const perSec = 0.35;
  return Math.max(0, Math.floor(base + k * perKill + surv * perSec));
}

/**
 * 一局结束（通常阵亡回首页）时调用：击杀、死亡、通关判定，并累计时长与局数、金币（紫箱已在拾取时入库）
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
  const coinGain = computeRunCoinReward({ killsThisRun: k, survivalSec: surv });
  save.coins += coinGain;
  persist(save);
  return save;
}

/** 当前档案下 Q/E 可用主武器顺序（与 `PLAYER_WEAPON_ORDER` 一致，仅含已解锁） */
/** 燕双鹰：保证至少驳壳枪 + 快机手枪在 Q/E 池（未缴获也临时可用） */
const YAN_ENSURE_PISTOLS: readonly PlayerWeaponKind[] = ['mauser_c96', 'pistol_fast'];

/** 大刀队长：保证三种近战均在池内（未缴获也临时可用） */
const MELEE_ENSURE: readonly PlayerWeaponKind[] = ['dao_broadsword', 'spear_red_tassel', 'bayonet_spike'];

/** 神枪手：三八式 + 汉阳 + 骑步枪兜底 */
const PRECISION_ENSURE: readonly PlayerWeaponKind[] = ['type38', 'hanyang_88', 'mosin_style'];

function isPrecisionRifleKind(k: PlayerWeaponKind): boolean {
  const c = PLAYER_WEAPON_DEFS[k].category;
  return c === 'rifle' || c === 'marksman' || c === 'sniper';
}

export function getUnlockedWeaponKindsOrdered(save: PlayerProfileSave): PlayerWeaponKind[] {
  const base = [...save.unlockedWeaponKinds];
  const hid = save.selectedPlayableHeroId;
  if (hid === YAN_SHUANGYING_HERO_ID) {
    const pistolKinds = base.filter((k) => PLAYER_WEAPON_DEFS[k].category === 'pistol');
    const ordered: PlayerWeaponKind[] = [];
    for (const k of PLAYER_WEAPON_ORDER) {
      if (pistolKinds.includes(k)) {
        ordered.push(k);
      }
    }
    for (const k of YAN_ENSURE_PISTOLS) {
      if (!ordered.includes(k)) {
        ordered.push(k);
      }
    }
    return ordered;
  }
  if (hid === DADAO_LEADER_HERO_ID) {
    const melee = base.filter((k) => PLAYER_WEAPON_DEFS[k].category === 'melee');
    const ordered: PlayerWeaponKind[] = [];
    for (const k of PLAYER_WEAPON_ORDER) {
      if (melee.includes(k)) {
        ordered.push(k);
      }
    }
    for (const k of MELEE_ENSURE) {
      if (!ordered.includes(k)) {
        ordered.push(k);
      }
    }
    return ordered;
  }
  if (hid === SHARPSHOOTER_HERO_ID) {
    const prec = base.filter((k) => isPrecisionRifleKind(k));
    const ordered: PlayerWeaponKind[] = [];
    for (const k of PLAYER_WEAPON_ORDER) {
      if (prec.includes(k)) {
        ordered.push(k);
      }
    }
    for (const k of PRECISION_ENSURE) {
      if (!ordered.includes(k)) {
        ordered.push(k);
      }
    }
    return ordered;
  }
  return base;
}

/** 局内主角矢量配色（当前选用角色外观） */
export function getSelectedCharacterPalette(save: PlayerProfileSave): PlayerVectorPalette {
  const id = save.selectedCharacterId;
  const def = CHARACTER_SKIN_SHOP_DEFS.find((d) => d.id === id);
  return def?.palette ?? DEFAULT_PLAYER_VECTOR_PALETTE;
}

/** 局内配色：游击队员沿用外观皮肤；其余玩法角色用专属矢量色 */
export function getPaletteForActiveGame(save: PlayerProfileSave): PlayerVectorPalette {
  const hid = save.selectedPlayableHeroId;
  if (usesCharacterSkinPalette(hid)) {
    return getSelectedCharacterPalette(save);
  }
  return getPlayableHeroDef(hid)?.palette ?? getSelectedCharacterPalette(save);
}

/** 当前枪皮（木托/金属/可选弹色覆盖） */
export function getSelectedWeaponCosmetic(save: PlayerProfileSave): WeaponCosmeticShopDef {
  const id = save.selectedWeaponSkinId;
  const def = WEAPON_COSMETIC_SHOP_DEFS.find((d) => d.id === id);
  return def ?? WEAPON_COSMETIC_SHOP_DEFS[0]!;
}

/** 花费金币解锁角色外观；已拥有或余额不足则失败 */
export function tryPurchaseCharacterSkin(
  id: string,
): { ok: true } | { ok: false; reason: string } {
  const def = CHARACTER_SKIN_SHOP_DEFS.find((d) => d.id === id);
  if (!def) {
    return { ok: false, reason: '未知外观' };
  }
  if (def.costCoins <= 0) {
    return { ok: false, reason: '默认外观无需购买' };
  }
  const save = loadAchievementSave();
  if (save.unlockedCharacterIds.includes(id)) {
    return { ok: false, reason: '已拥有' };
  }
  if (save.coins < def.costCoins) {
    return { ok: false, reason: '金币不足' };
  }
  save.coins -= def.costCoins;
  save.unlockedCharacterIds.push(id);
  persist(save);
  return { ok: true };
}

/** 选用已解锁的角色外观 */
export function setSelectedCharacterSkin(
  id: string,
): { ok: true } | { ok: false; reason: string } {
  const save = loadAchievementSave();
  if (!save.unlockedCharacterIds.includes(id)) {
    return { ok: false, reason: '未解锁' };
  }
  save.selectedCharacterId = id;
  persist(save);
  return { ok: true };
}

/** 花费金币解锁枪皮 */
export function tryPurchaseWeaponCosmetic(
  id: string,
): { ok: true } | { ok: false; reason: string } {
  const def = WEAPON_COSMETIC_SHOP_DEFS.find((d) => d.id === id);
  if (!def) {
    return { ok: false, reason: '未知枪皮' };
  }
  if (def.costCoins <= 0) {
    return { ok: false, reason: '默认枪皮无需购买' };
  }
  const save = loadAchievementSave();
  if (save.unlockedWeaponSkinIds.includes(id)) {
    return { ok: false, reason: '已拥有' };
  }
  if (save.coins < def.costCoins) {
    return { ok: false, reason: '金币不足' };
  }
  save.coins -= def.costCoins;
  save.unlockedWeaponSkinIds.push(id);
  persist(save);
  return { ok: true };
}

/** 选用已解锁的枪皮 */
export function setSelectedWeaponCosmetic(
  id: string,
): { ok: true } | { ok: false; reason: string } {
  const save = loadAchievementSave();
  if (!save.unlockedWeaponSkinIds.includes(id)) {
    return { ok: false, reason: '未解锁' };
  }
  save.selectedWeaponSkinId = id;
  persist(save);
  return { ok: true };
}

/** 花费金币解锁玩法角色（默认可用项购买会失败） */
export function tryPurchasePlayableHero(
  id: PlayableHeroId,
): { ok: true } | { ok: false; reason: string } {
  const def = PLAYABLE_HERO_DEFS.find((d) => d.id === id);
  if (!def) {
    return { ok: false, reason: '未知角色' };
  }
  if (def.costCoins <= 0) {
    return { ok: false, reason: '默认可直接选用' };
  }
  const save = loadAchievementSave();
  if (save.unlockedPlayableHeroIds.includes(id)) {
    return { ok: false, reason: '已拥有' };
  }
  if (save.coins < def.costCoins) {
    return { ok: false, reason: '金币不足' };
  }
  save.coins -= def.costCoins;
  save.unlockedPlayableHeroIds = [...new Set([...save.unlockedPlayableHeroIds, id])];
  persist(save);
  return { ok: true };
}

/** 选用已解锁的玩法角色（影响开局武器池与被动） */
export function setSelectedPlayableHero(
  id: PlayableHeroId,
): { ok: true } | { ok: false; reason: string } {
  const save = loadAchievementSave();
  if (!save.unlockedPlayableHeroIds.includes(id)) {
    return { ok: false, reason: '未解锁' };
  }
  save.selectedPlayableHeroId = id;
  persist(save);
  return { ok: true };
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
  coins: number;
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
    coins: save.coins,
  };
}

/** 紫装仓库内单等等阶条（`count>0`，顺序与 `GEAR_GRADE_ORDER` 一致） */
export interface PlayerStatsPurpleGradeSlice {
  grade: GearGradeId;
  count: number;
  bgCss: string;
  tierName: string;
}

/** 供数据统计页：作战效率、成就计数、紫装分布与穿戴摘要（纯派生，不修改存档） */
export function getPlayerStatsDetailView(save = loadAchievementSave()): {
  snapshot: ReturnType<typeof getPlayerStatsSnapshot>;
  avgKillsPerSession: number;
  killsPerDeath: number | null;
  achievementUnlocked: number;
  achievementTotal: number;
  purpleStashCount: number;
  equippedSlotsFilled: number;
  lockedGearCount: number;
  purpleGradeSlices: PlayerStatsPurpleGradeSlice[];
  purpleGradeTotal: number;
  slotEquipped: readonly { id: GearDropSlotId; label: string; equipped: boolean }[];
} {
  const snapshot = getPlayerStatsSnapshot(save);
  const n = save.totalSessions;
  const avgKillsPerSession = n > 0 ? save.totalKills / n : 0;
  const killsPerDeath = save.deathCount > 0 ? save.totalKills / save.deathCount : null;
  const unlocked = getUnlockedAchievementIds(save);
  const achievementUnlocked = ACHIEVEMENT_DEFS.filter((d) => unlocked.has(d.id)).length;
  const achievementTotal = ACHIEVEMENT_DEFS.length;
  let equippedSlotsFilled = 0;
  const slotEquipped = GEAR_DROP_SLOT_ORDER.map((row) => {
    const equipped = Boolean(save.equippedPurpleBySlot[row.id]);
    if (equipped) {
      equippedSlotsFilled += 1;
    }
    return { id: row.id, label: row.label, equipped };
  });
  const lockedGearCount = save.purpleGearLockedInstanceIds.length;
  const byGrade: Record<GearGradeId, number> = {
    E: 0,
    D: 0,
    C: 0,
    B: 0,
    A: 0,
    S: 0,
    SS: 0,
    SSS: 0,
  };
  for (const p of save.purpleGearStash) {
    byGrade[p.grade] += 1;
  }
  const purpleGradeSlices: PlayerStatsPurpleGradeSlice[] = [];
  for (const g of GEAR_GRADE_ORDER) {
    const c = byGrade[g];
    if (c > 0) {
      const v = GEAR_GRADE_VISUAL[g];
      purpleGradeSlices.push({ grade: g, count: c, bgCss: v.bgCss, tierName: v.tierName });
    }
  }
  const purpleGradeTotal = save.purpleGearStash.length;
  return {
    snapshot,
    avgKillsPerSession,
    killsPerDeath,
    achievementUnlocked,
    achievementTotal,
    purpleStashCount: save.purpleGearStash.length,
    equippedSlotsFilled,
    lockedGearCount,
    purpleGradeSlices,
    purpleGradeTotal,
    slotEquipped,
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
 * 紫箱内独立判定：额外缴获一把尚未解锁的主武器；概率随怪等级略升、封顶，全解锁则不再出
 * @param save - 已加载档案（就地写入 `unlockedWeaponKinds`）
 * @param monsterLevel - 与装备掉落同源的怪等级
 */
function rollWeaponUnlockFromPurpleChest(save: PlayerProfileSave, monsterLevel: number): PlayerWeaponKind | null {
  const locked = PLAYER_WEAPON_ORDER.filter((k) => !save.unlockedWeaponKinds.includes(k));
  if (locked.length === 0) {
    return null;
  }
  const ml = Math.max(1, Math.floor(monsterLevel));
  // 约 10%～35%：低等级也有机会，高等级略高
  const p = Math.min(0.35, 0.1 + ml * 0.012);
  if (Math.random() >= p) {
    return null;
  }
  const kind = locked[Math.floor(Math.random() * locked.length)]!;
  const set = new Set(save.unlockedWeaponKinds);
  set.add(kind);
  save.unlockedWeaponKinds = PLAYER_WEAPON_ORDER.filter((k) => set.has(k));
  return kind;
}

/**
 * 局内紫箱拾取：按怪等级掉落 1～5 件并入仓库，并独立概率额外解锁一把主武器
 * @param monsterLevel - 被击杀敌人等级，影响件数与等阶权重
 */
export function applyPurpleChestLoot(monsterLevel: number): {
  bundle: PurpleChestBundle;
  toastFullText: string;
  weaponUnlocked: PlayerWeaponKind | null;
} {
  const save = loadAchievementSave();
  const bundle = rollPurpleChestBundle(monsterLevel);
  appendPiecesToPurpleStash(save, bundle.pieces);
  const weaponUnlocked = rollWeaponUnlockFromPurpleChest(save, monsterLevel);
  persist(save);
  let toastFullText = formatPurpleChestToast(bundle);
  if (weaponUnlocked) {
    toastFullText += `\n\n缴获主武器：${PLAYER_WEAPON_DEFS[weaponUnlocked].displayName}`;
  }
  return { bundle, toastFullText, weaponUnlocked };
}
