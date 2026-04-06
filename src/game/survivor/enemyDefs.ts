/**
 * 兵种与刷怪权重（阶段 2）：表数据来自 `config/enemyConfig.ts`，此处为运行时 `EnemyDef` 与加权随机
 */
import {
  ENEMY_KIND_ORDER,
  enemyGameConfig,
  type EnemyKind,
} from '../config/enemyConfig';
import { survivorBalance } from '../config/survivorBalance';
import { GAME_MODE_BY_ID, type GameModeId } from '../config/gameModeConfig';

export type { EnemyKind } from '../config/enemyConfig';

/** 远程类型：机枪直线弹、炮弹落点爆炸 */
export type EnemyRangedType = 'mg' | 'shell';

/** 单兵种静态定义（血量/速度等为开局 0 秒基准，局内乘 `difficultyMultiplier(gameTime)` 连续增长） */
export interface EnemyDef {
  /** 碰撞半径 */
  radius: number;
  baseHp: number;
  speed: number;
  contactDamage: number;
  /** 相对 `GEM_XP_VALUE` 的倍率，军官为 10 */
  gemMultiplier: number;
  /** 飞行等：直线追击时不与障碍圆碰撞解析 */
  ignoresObstacles?: boolean;
  ranged?: {
    type: EnemyRangedType;
    damage: number;
    cooldown: number;
    projSpeed: number;
    /** 超过此距离开火逻辑不发射（见 `SurvivorGameModel._enemyRangedTick`） */
    attackRange: number;
    shellBlastRadius?: number;
  };
}

function buildEnemyDefs(): Record<EnemyKind, EnemyDef> {
  const { stats } = enemyGameConfig;
  const ps = survivorBalance.enemy.projectileSpeedScale;
  const psm = Number.isFinite(ps) && ps > 0 ? ps : 1;
  const out = {} as Record<EnemyKind, EnemyDef>;
  for (const k of ENEMY_KIND_ORDER) {
    const s = stats[k];
    out[k] = {
      radius: s.radius,
      baseHp: s.baseHp,
      speed: s.speed,
      contactDamage: s.contactDamage,
      gemMultiplier: s.gemMultiplier,
      ignoresObstacles: s.ignoresObstacles,
      ranged: s.ranged
        ? {
            type: s.ranged.type,
            damage: s.ranged.damage,
            cooldown: s.ranged.cooldownSec,
            projSpeed: s.ranged.projSpeed * psm,
            attackRange: s.ranged.attackRange,
            shellBlastRadius: s.ranged.shellBlastRadius,
          }
        : undefined,
    };
  }
  return out;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = buildEnemyDefs();

export interface SpawnWeight {
  kind: EnemyKind;
  weight: number;
}

/**
 * 按存活秒数返回当前可刷新的兵种及权重（解锁时间由 `enemyGameConfig.spawnByKind` 配置）
 * @param gameTimeSec - 本局已进行秒数
 */
export function getSpawnWeights(gameTimeSec: number): SpawnWeight[] {
  const w: SpawnWeight[] = [];
  for (const kind of ENEMY_KIND_ORDER) {
    const p = enemyGameConfig.spawnByKind[kind];
    if (gameTimeSec >= p.unlockAfterSec && p.spawnWeight > 0) {
      w.push({ kind, weight: p.spawnWeight });
    }
  }
  return w;
}

/**
 * 在基础权重上叠乘模式系数（见 `GAME_MODE_BY_ID`）；用于 `pickSpawnKind`
 * @param gameTimeSec - 本局已进行秒数
 * @param mode - 开局所选模式
 */
export function getSpawnWeightsForMode(gameTimeSec: number, mode: GameModeId): SpawnWeight[] {
  const base = getSpawnWeights(gameTimeSec);
  const multTable = GAME_MODE_BY_ID[mode].spawnWeightMult;
  const out: SpawnWeight[] = [];
  for (const row of base) {
    const m = multTable[row.kind] ?? 1;
    const w = row.weight * m;
    if (w > 0) {
      out.push({ kind: row.kind, weight: w });
    }
  }
  return out;
}

/**
 * 敌血量与攻击随局内时间连续增长：`pow(f, gameTimeSec/60)`，其中 f 为 `survivorBalance.enemy.difficultyPerMinuteFactor`（与「每整分钟 ×f」在整分处同值，秒间平滑上升）
 * @param gameTimeSec - 本局秒数
 */
export function difficultyMultiplier(gameTimeSec: number): number {
  const g = Math.max(0, gameTimeSec);
  const f = survivorBalance.enemy.difficultyPerMinuteFactor;
  const factor = Number.isFinite(f) && f > 0 ? f : 1.05;
  return Math.pow(factor, g / 60);
}

/** 从开局间隔拉满到 `SPAWN_INTERVAL_END_SEC` 所用秒数（越短中期越密） */
export const SPAWN_RAMP_SEC = enemyGameConfig.curve.rampSec;

/** 开局约 1.4 只/秒（由 `intervalStartSec` 推导） */
export const SPAWN_INTERVAL_START_SEC = enemyGameConfig.curve.intervalStartSec;

/** 后期约 10 只/秒量级 */
export const SPAWN_INTERVAL_END_SEC = enemyGameConfig.curve.intervalEndSec;

/**
 * 刷怪间隔（秒）：前 `rampSec` 内从 `hi` 线性落到 `lo`；之后仍随现实时间略降，避免「满 5 分钟即封顶」的时长天花板
 * @param gameTimeSec - 本局秒数
 */
export function spawnIntervalForTime(gameTimeSec: number): number {
  const { rampSec, intervalStartSec: hi, intervalEndSec: lo } = enemyGameConfig.curve;
  const g = Math.max(0, gameTimeSec);
  if (g <= rampSec) {
    const t = g / rampSec;
    return hi + (lo - hi) * t;
  }
  const overMin = (g - rampSec) / 60;
  return Math.max(0.028, lo * Math.pow(0.985, overMin));
}

/** 按当前时间权重随机一个可刷新兵种（可选模式乘子） */
export function pickSpawnKind(gameTimeSec: number, mode: GameModeId = 'standard'): EnemyKind {
  const weights = getSpawnWeightsForMode(gameTimeSec, mode);
  if (weights.length === 0) {
    return 'infantry';
  }
  let sum = 0;
  for (const w of weights) {
    sum += w.weight;
  }
  let r = Math.random() * sum;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) {
      return w.kind;
    }
  }
  return weights[weights.length - 1]!.kind;
}
