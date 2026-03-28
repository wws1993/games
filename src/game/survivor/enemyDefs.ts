/**
 * 兵种与刷怪权重（阶段 2）：表数据来自 `config/enemyConfig.ts`，此处为运行时 `EnemyDef` 与加权随机
 */
import {
  ENEMY_KIND_ORDER,
  enemyGameConfig,
  type EnemyKind,
} from '../config/enemyConfig';

export type { EnemyKind } from '../config/enemyConfig';

/** 远程类型：机枪直线弹、炮弹落点爆炸 */
export type EnemyRangedType = 'mg' | 'shell';

/** 单兵种静态定义（血量/速度等为 0 分钟基准，局内按分钟 ×1.05 缩放） */
export interface EnemyDef {
  /** 碰撞半径 */
  radius: number;
  baseHp: number;
  speed: number;
  contactDamage: number;
  /** 相对 `GEM_XP_VALUE` 的倍率，军官为 10 */
  gemMultiplier: number;
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
  const out = {} as Record<EnemyKind, EnemyDef>;
  for (const k of ENEMY_KIND_ORDER) {
    const s = stats[k];
    out[k] = {
      radius: s.radius,
      baseHp: s.baseHp,
      speed: s.speed,
      contactDamage: s.contactDamage,
      gemMultiplier: s.gemMultiplier,
      ranged: s.ranged
        ? {
            type: s.ranged.type,
            damage: s.ranged.damage,
            cooldown: s.ranged.cooldownSec,
            projSpeed: s.ranged.projSpeed,
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
 * 每分钟全体怪物生命与伤害 ×1.05（从第 0 分钟起算层数）
 * @param gameTimeSec - 本局秒数
 */
export function difficultyMultiplier(gameTimeSec: number): number {
  const minute = Math.floor(gameTimeSec / 60);
  return Math.pow(1.05, minute);
}

/** 从开局间隔拉满到 `SPAWN_INTERVAL_END_SEC` 所用秒数（越短中期越密） */
export const SPAWN_RAMP_SEC = enemyGameConfig.curve.rampSec;

/** 开局约 1.4 只/秒（由 `intervalStartSec` 推导） */
export const SPAWN_INTERVAL_START_SEC = enemyGameConfig.curve.intervalStartSec;

/** 后期约 10 只/秒量级 */
export const SPAWN_INTERVAL_END_SEC = enemyGameConfig.curve.intervalEndSec;

/**
 * 刷怪间隔（秒）：开局偏密、较快拉满；`t` 在 `SPAWN_RAMP_SEC` 内从 `hi` 线性落到 `lo`
 * @param gameTimeSec - 本局秒数
 */
export function spawnIntervalForTime(gameTimeSec: number): number {
  const { rampSec, intervalStartSec: hi, intervalEndSec: lo } = enemyGameConfig.curve;
  const t = Math.min(1, gameTimeSec / rampSec);
  return hi + (lo - hi) * t;
}

/** 按当前时间权重随机一个可刷新兵种 */
export function pickSpawnKind(gameTimeSec: number): EnemyKind {
  const weights = getSpawnWeights(gameTimeSec);
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
