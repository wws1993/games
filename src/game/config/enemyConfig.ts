/**
 * 敌人数值与刷怪策略配置：解锁时间、权重、每波数量、队形、移速/血量/接触伤与远程射程、攻速（冷却）等；改此文件即可调参
 */

/** 可参与加权的兵种键（与 `stats`、`spawnByKind` 必须一致） */
export type EnemyKind = 'infantry' | 'puppet' | 'dog' | 'cavalry' | 'mg' | 'artillery' | 'officer';

/**
 * 同种一批的站位策略：均在玩家周围环带内生成（见 `ENEMY_SPAWN_RING_*`），敌人仍朝玩家推进
 * - `edge_random`：每只独立随机角度与距离
 * - `line_along_edge`：环上一切向线段排成一条线
 * - `tight_cluster`：同一锚点附近小范围散布
 * - `v_shape`：锚点 + 朝向玩家的 V 字展开（适合 3 只及以上）
 */
export type EnemySpawnFormation = 'edge_random' | 'line_along_edge' | 'tight_cluster' | 'v_shape';

/** 单兵种战斗数值（血量为 0 分钟基准，局内仍乘 `difficultyMultiplier`） */
export interface EnemyStatConfig {
  /** 碰撞半径 */
  radius: number;
  baseHp: number;
  /** 移动速度（世界单位/秒） */
  speed: number;
  contactDamage: number;
  /** 相对 `GEM_XP_VALUE` 的倍率 */
  gemMultiplier: number;
  ranged?: {
    type: 'mg' | 'shell';
    damage: number;
    /** 攻击间隔（秒），越小攻速越快 */
    cooldownSec: number;
    /** 超过此距离则不开火（冷却仍可走满，就绪后等进入射程再射） */
    attackRange: number;
    projSpeed: number;
    shellBlastRadius?: number;
  };
}

/** 单兵种刷新策略：出现时间、一批几只、队形 */
export interface EnemySpawnPolicyConfig {
  /** 从开局满多少秒起进入权重池（未到时完全不刷该种） */
  unlockAfterSec: number;
  spawnWeight: number;
  /** 每次时钟触发时同种连续生成数量 */
  batchSize: number;
  formation: EnemySpawnFormation;
}

/** 全局刷怪间隔曲线：时间越短刷得越密 */
export interface EnemySpawnCurveConfig {
  /** 从开局到拉满 `intervalEndSec` 所经历秒数 */
  rampSec: number;
  intervalStartSec: number;
  intervalEndSec: number;
}

/** 整表：数值 + 按种的刷新策略 + 间隔曲线 */
export interface EnemyGameConfig {
  stats: Record<EnemyKind, EnemyStatConfig>;
  spawnByKind: Record<EnemyKind, EnemySpawnPolicyConfig>;
  curve: EnemySpawnCurveConfig;
}

/** 默认表：与设计文档时间轴 0–3、3–5… 分钟解锁一致，远程补全 `attackRange` */
export const enemyGameConfig: EnemyGameConfig = {
  stats: {
    infantry: {
      radius: 12,
      baseHp: 32,
      speed: 78,
      contactDamage: 10,
      gemMultiplier: 1,
    },
    puppet: {
      radius: 11,
      baseHp: 18,
      speed: 52,
      contactDamage: 5,
      gemMultiplier: 0.85,
    },
    dog: {
      radius: 8,
      baseHp: 14,
      speed: 132,
      contactDamage: 8,
      gemMultiplier: 0.9,
    },
    cavalry: {
      radius: 14,
      baseHp: 42,
      speed: 108,
      contactDamage: 15,
      gemMultiplier: 1.1,
    },
    mg: {
      radius: 13,
      baseHp: 95,
      speed: 34,
      contactDamage: 8,
      gemMultiplier: 1.2,
      ranged: {
        type: 'mg',
        damage: 12,
        cooldownSec: 1.12,
        attackRange: 520,
        projSpeed: 340,
      },
    },
    artillery: {
      radius: 15,
      baseHp: 220,
      speed: 20,
      contactDamage: 6,
      gemMultiplier: 1.5,
      ranged: {
        type: 'shell',
        damage: 20,
        cooldownSec: 2.35,
        attackRange: 640,
        projSpeed: 155,
        shellBlastRadius: 56,
      },
    },
    officer: {
      radius: 14,
      baseHp: 300,
      speed: 70,
      contactDamage: 25,
      gemMultiplier: 10,
    },
  },
  spawnByKind: {
    infantry: {
      unlockAfterSec: 0,
      spawnWeight: 3,
      batchSize: 2,
      formation: 'edge_random',
    },
    puppet: {
      unlockAfterSec: 0,
      spawnWeight: 2,
      batchSize: 2,
      formation: 'line_along_edge',
    },
    dog: {
      unlockAfterSec: 180,
      spawnWeight: 2,
      batchSize: 2,
      formation: 'tight_cluster',
    },
    cavalry: {
      unlockAfterSec: 300,
      spawnWeight: 2,
      batchSize: 2,
      formation: 'v_shape',
    },
    mg: {
      unlockAfterSec: 420,
      spawnWeight: 1.2,
      batchSize: 1,
      formation: 'edge_random',
    },
    officer: {
      unlockAfterSec: 480,
      spawnWeight: 0.55,
      batchSize: 1,
      formation: 'edge_random',
    },
    artillery: {
      unlockAfterSec: 600,
      spawnWeight: 0.65,
      batchSize: 1,
      formation: 'edge_random',
    },
  },
  curve: {
    rampSec: 540,
    intervalStartSec: 0.72,
    intervalEndSec: 0.1,
  },
};

/** `getSpawnWeights` 的稳定遍历顺序 */
export const ENEMY_KIND_ORDER: readonly EnemyKind[] = [
  'infantry',
  'puppet',
  'dog',
  'cavalry',
  'mg',
  'officer',
  'artillery',
];

/**
 * 读取某兵种本波应生成数量（配置非法时兜底为 1）
 * @param kind - 兵种
 */
export function getSpawnBatchSize(kind: EnemyKind): number {
  const raw = enemyGameConfig.spawnByKind[kind]?.batchSize;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * 读取某兵种本波队形
 * @param kind - 兵种
 */
export function getSpawnFormation(kind: EnemyKind): EnemySpawnFormation {
  return enemyGameConfig.spawnByKind[kind]?.formation ?? 'edge_random';
}
