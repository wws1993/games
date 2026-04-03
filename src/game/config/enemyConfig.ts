/**
 * 敌人数值与刷怪策略配置：解锁时间、权重、每波数量、队形、移速/血量/接触伤与远程射程、攻速（冷却）等；改此文件即可调参
 */

/** 可参与加权的兵种键（与 `stats`、`spawnByKind` 必须一致） */
export type EnemyKind =
  | 'infantry'
  | 'puppet'
  | 'dog'
  | 'cavalry'
  | 'mg'
  | 'artillery'
  | 'officer'
  /** 陆军扩展 */
  | 'sniper'
  | 'grenadier'
  | 'engineer'
  | 'heavy_infantry'
  | 'scout_car'
  /** 空军扩展：飞行单位通常 `ignoresObstacles`，越障追击 */
  | 'recon_plane'
  | 'fighter_plane'
  | 'bomber_plane'
  | 'gunship'
  | 'paratrooper';

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
  /** 为 true 时移动不与矩形障碍碰撞（飞行等） */
  ignoresObstacles?: boolean;
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

/** 默认表：节奏偏快、兵种更丰富；空军较晚解锁 */
export const enemyGameConfig: EnemyGameConfig = {
  stats: {
    infantry: {
      radius: 12,
      baseHp: 30,
      speed: 82,
      contactDamage: 10,
      gemMultiplier: 1,
    },
    puppet: {
      radius: 11,
      baseHp: 16,
      speed: 56,
      contactDamage: 5,
      gemMultiplier: 0.85,
    },
    dog: {
      radius: 8,
      baseHp: 13,
      speed: 138,
      contactDamage: 8,
      gemMultiplier: 0.9,
    },
    cavalry: {
      radius: 14,
      baseHp: 40,
      speed: 112,
      contactDamage: 15,
      gemMultiplier: 1.1,
    },
    mg: {
      radius: 13,
      baseHp: 88,
      speed: 36,
      contactDamage: 8,
      gemMultiplier: 1.2,
      ranged: {
        type: 'mg',
        damage: 12,
        cooldownSec: 1.08,
        attackRange: 520,
        projSpeed: 340,
      },
    },
    artillery: {
      radius: 15,
      baseHp: 200,
      speed: 22,
      contactDamage: 6,
      gemMultiplier: 1.5,
      ranged: {
        type: 'shell',
        damage: 20,
        cooldownSec: 2.2,
        attackRange: 640,
        projSpeed: 155,
        shellBlastRadius: 56,
      },
    },
    officer: {
      radius: 14,
      baseHp: 280,
      speed: 74,
      contactDamage: 25,
      gemMultiplier: 10,
    },
    sniper: {
      radius: 11,
      baseHp: 44,
      speed: 60,
      contactDamage: 12,
      gemMultiplier: 1.12,
      ranged: {
        type: 'mg',
        damage: 17,
        cooldownSec: 1.45,
        attackRange: 600,
        projSpeed: 420,
      },
    },
    grenadier: {
      radius: 12,
      baseHp: 52,
      speed: 64,
      contactDamage: 14,
      gemMultiplier: 1.08,
      ranged: {
        type: 'shell',
        damage: 14,
        cooldownSec: 1.85,
        attackRange: 420,
        projSpeed: 140,
        shellBlastRadius: 40,
      },
    },
    engineer: {
      radius: 11,
      baseHp: 36,
      speed: 92,
      contactDamage: 11,
      gemMultiplier: 1,
    },
    heavy_infantry: {
      radius: 13,
      baseHp: 110,
      speed: 48,
      contactDamage: 18,
      gemMultiplier: 1.22,
    },
    scout_car: {
      radius: 16,
      baseHp: 140,
      speed: 102,
      contactDamage: 21,
      gemMultiplier: 1.32,
    },
    recon_plane: {
      radius: 10,
      baseHp: 26,
      speed: 152,
      contactDamage: 9,
      gemMultiplier: 0.92,
      ignoresObstacles: true,
    },
    fighter_plane: {
      radius: 11,
      baseHp: 50,
      speed: 132,
      contactDamage: 15,
      gemMultiplier: 1.18,
      ignoresObstacles: true,
      ranged: {
        type: 'mg',
        damage: 9,
        cooldownSec: 0.82,
        attackRange: 460,
        projSpeed: 380,
      },
    },
    bomber_plane: {
      radius: 13,
      baseHp: 180,
      speed: 58,
      contactDamage: 7,
      gemMultiplier: 1.38,
      ignoresObstacles: true,
      ranged: {
        type: 'shell',
        damage: 18,
        cooldownSec: 2.05,
        attackRange: 560,
        projSpeed: 148,
        shellBlastRadius: 50,
      },
    },
    gunship: {
      radius: 12,
      baseHp: 135,
      speed: 78,
      contactDamage: 12,
      gemMultiplier: 1.48,
      ignoresObstacles: true,
      ranged: {
        type: 'mg',
        damage: 13,
        cooldownSec: 0.58,
        attackRange: 440,
        projSpeed: 320,
      },
    },
    paratrooper: {
      radius: 11,
      baseHp: 34,
      speed: 118,
      contactDamage: 10,
      gemMultiplier: 1.02,
      ignoresObstacles: true,
    },
  },
  spawnByKind: {
    infantry: {
      unlockAfterSec: 0,
      spawnWeight: 3.2,
      batchSize: 3,
      formation: 'edge_random',
    },
    puppet: {
      unlockAfterSec: 0,
      spawnWeight: 2.4,
      batchSize: 2,
      formation: 'line_along_edge',
    },
    engineer: {
      unlockAfterSec: 0,
      spawnWeight: 2,
      batchSize: 2,
      formation: 'tight_cluster',
    },
    dog: {
      unlockAfterSec: 90,
      spawnWeight: 2.2,
      batchSize: 2,
      formation: 'tight_cluster',
    },
    sniper: {
      unlockAfterSec: 120,
      spawnWeight: 1.4,
      batchSize: 1,
      formation: 'edge_random',
    },
    grenadier: {
      unlockAfterSec: 150,
      spawnWeight: 1.3,
      batchSize: 1,
      formation: 'v_shape',
    },
    heavy_infantry: {
      unlockAfterSec: 200,
      spawnWeight: 1.5,
      batchSize: 2,
      formation: 'line_along_edge',
    },
    cavalry: {
      unlockAfterSec: 240,
      spawnWeight: 2,
      batchSize: 2,
      formation: 'v_shape',
    },
    scout_car: {
      unlockAfterSec: 270,
      spawnWeight: 1.2,
      batchSize: 1,
      formation: 'edge_random',
    },
    mg: {
      unlockAfterSec: 300,
      spawnWeight: 1.35,
      batchSize: 1,
      formation: 'edge_random',
    },
    recon_plane: {
      unlockAfterSec: 180,
      spawnWeight: 1.5,
      batchSize: 2,
      formation: 'tight_cluster',
    },
    fighter_plane: {
      unlockAfterSec: 330,
      spawnWeight: 1.25,
      batchSize: 1,
      formation: 'edge_random',
    },
    paratrooper: {
      unlockAfterSec: 210,
      spawnWeight: 1.6,
      batchSize: 2,
      formation: 'v_shape',
    },
    gunship: {
      unlockAfterSec: 390,
      spawnWeight: 0.95,
      batchSize: 1,
      formation: 'edge_random',
    },
    bomber_plane: {
      unlockAfterSec: 450,
      spawnWeight: 0.85,
      batchSize: 1,
      formation: 'edge_random',
    },
    officer: {
      unlockAfterSec: 360,
      spawnWeight: 0.6,
      batchSize: 1,
      formation: 'edge_random',
    },
    artillery: {
      unlockAfterSec: 420,
      spawnWeight: 0.72,
      batchSize: 1,
      formation: 'edge_random',
    },
  },
  curve: {
    rampSec: 300,
    intervalStartSec: 0.42,
    intervalEndSec: 0.055,
  },
};

/** `getSpawnWeights` 的稳定遍历顺序 */
export const ENEMY_KIND_ORDER: readonly EnemyKind[] = [
  'infantry',
  'puppet',
  'engineer',
  'dog',
  'sniper',
  'grenadier',
  'heavy_infantry',
  'cavalry',
  'scout_car',
  'mg',
  'recon_plane',
  'fighter_plane',
  'paratrooper',
  'gunship',
  'bomber_plane',
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
