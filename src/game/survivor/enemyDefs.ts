/**
 * 兵种与刷怪权重（阶段 2）：数值贴合 `docs/敌后幸存者-游戏分步开发设计文档.md`，可在表中再调
 */
export type EnemyKind = 'infantry' | 'puppet' | 'dog' | 'cavalry' | 'mg' | 'artillery' | 'officer';

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
    shellBlastRadius?: number;
  };
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  infantry: { radius: 12, baseHp: 32, speed: 78, contactDamage: 10, gemMultiplier: 1 },
  puppet: { radius: 11, baseHp: 18, speed: 52, contactDamage: 5, gemMultiplier: 0.85 },
  dog: { radius: 8, baseHp: 14, speed: 132, contactDamage: 8, gemMultiplier: 0.9 },
  cavalry: { radius: 14, baseHp: 42, speed: 108, contactDamage: 15, gemMultiplier: 1.1 },
  mg: {
    radius: 13,
    baseHp: 95,
    speed: 34,
    contactDamage: 8,
    gemMultiplier: 1.2,
    ranged: { type: 'mg', damage: 12, cooldown: 1.12, projSpeed: 340 },
  },
  artillery: {
    radius: 15,
    baseHp: 220,
    speed: 20,
    contactDamage: 6,
    gemMultiplier: 1.5,
    ranged: { type: 'shell', damage: 20, cooldown: 2.35, projSpeed: 155, shellBlastRadius: 56 },
  },
  officer: { radius: 14, baseHp: 300, speed: 70, contactDamage: 25, gemMultiplier: 10 },
};

export interface SpawnWeight {
  kind: EnemyKind;
  weight: number;
}

/**
 * 按存活秒数返回当前可刷新的兵种及权重（时间轴与设计文档 0–3、3–5… 分钟一致）
 * @param gameTimeSec - 本局已进行秒数
 */
export function getSpawnWeights(gameTimeSec: number): SpawnWeight[] {
  const w: SpawnWeight[] = [
    { kind: 'infantry', weight: 3 },
    { kind: 'puppet', weight: 2 },
  ];
  if (gameTimeSec >= 180) {
    w.push({ kind: 'dog', weight: 2 });
  }
  if (gameTimeSec >= 300) {
    w.push({ kind: 'cavalry', weight: 2 });
  }
  if (gameTimeSec >= 420) {
    w.push({ kind: 'mg', weight: 1.2 });
  }
  if (gameTimeSec >= 480) {
    w.push({ kind: 'officer', weight: 0.55 });
  }
  if (gameTimeSec >= 600) {
    w.push({ kind: 'artillery', weight: 0.65 });
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

/** 刷怪间隔：约 1 只/秒 逐步过渡到约 5 只/秒（15 分钟局用 900s 拉满） */
export function spawnIntervalForTime(gameTimeSec: number): number {
  const t = Math.min(1, gameTimeSec / 900);
  const hi = 2.15;
  const lo = 0.22;
  return hi + (lo - hi) * t;
}

/** 按当前时间权重随机一个可刷新兵种 */
export function pickSpawnKind(gameTimeSec: number): EnemyKind {
  const weights = getSpawnWeights(gameTimeSec);
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
