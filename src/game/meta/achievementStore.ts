/**
 * 玩家档案：成就 + 累计统计；本地持久化与单局结算写入
 */
import { ACHIEVEMENT_FIRST_CLEAR_SURVIVAL_SEC, type AchievementId } from './achievementDefs';

const STORAGE_KEY = 'app_game_achievements_v1';

/** 当前存档结构（schema 2 在 v1 基础上增加时长与局数） */
export interface PlayerProfileSave {
  schemaVersion: 2;
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
}

/** @deprecated 与 `PlayerProfileSave` 同义，成就页历史引用 */
export type AchievementSaveV1 = PlayerProfileSave;

const defaultSave = (): PlayerProfileSave => ({
  schemaVersion: 2,
  totalKills: 0,
  deathCount: 0,
  firstClearEver: false,
  totalPlayTimeSec: 0,
  totalSessions: 0,
  bestSurvivalSec: 0,
});

function normalizeV2(o: Partial<PlayerProfileSave>): PlayerProfileSave {
  return {
    schemaVersion: 2,
    totalKills: Math.max(0, Math.floor(Number(o.totalKills) || 0)),
    deathCount: Math.max(0, Math.floor(Number(o.deathCount) || 0)),
    firstClearEver: Boolean(o.firstClearEver),
    totalPlayTimeSec: Math.max(0, Number(o.totalPlayTimeSec) || 0),
    totalSessions: Math.max(0, Math.floor(Number(o.totalSessions) || 0)),
    bestSurvivalSec: Math.max(0, Number(o.bestSurvivalSec) || 0),
  };
}

/** 读取存档；v1 仅含成就字段时升级为 v2 并写回 */
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
    if (ver === 2) {
      return normalizeV2(o as Partial<PlayerProfileSave>);
    }
    if (ver === 1) {
      const migrated: PlayerProfileSave = {
        schemaVersion: 2,
        totalKills: Math.max(0, Math.floor(Number(o.totalKills) || 0)),
        deathCount: Math.max(0, Math.floor(Number(o.deathCount) || 0)),
        firstClearEver: Boolean(o.firstClearEver),
        totalPlayTimeSec: 0,
        totalSessions: 0,
        bestSurvivalSec: 0,
      };
      persist(migrated);
      return migrated;
    }
    return defaultSave();
  } catch {
    return defaultSave();
  }
}

function persist(save: PlayerProfileSave): void {
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
 * 一局结束（通常阵亡回首页）时调用：击杀、死亡、通关判定，并累计时长与局数
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
