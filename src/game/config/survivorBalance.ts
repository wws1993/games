/**
 * 局内平衡调参入口（步枪等）；刷怪批次与队形见 `enemyConfig.ts`
 */
export interface SurvivorBalanceConfig {
  /** 三八式步枪：仅当最近敌人在此距离内才发射（世界单位，与 `WORLD_SIZE` 同坐标系） */
  rifle: { maxRange: number };
  /**
   * 刷怪：`spawnIntervalForTime` 乘以此系数，越大整体越慢（批次与队形在 `enemyGameConfig.spawnByKind`）
   */
  spawn: {
    intervalScale: number;
  };
  /**
   * 怪物：`enemyGameConfig.stats.*.speed` 生成时乘以此系数（图鉴展示与局内一致）
   */
  enemy: {
    moveSpeedScale: number;
    /** 敌机枪弹 / 炮弹飞行速度 ×（表内 `projSpeed` 基准再乘此项，便于整体降弹速） */
    projectileSpeedScale: number;
    /**
     * 敌人生成时生命、接触伤害、远程子弹/炮弹伤害均乘 `pow(difficultyPerMinuteFactor, gameTimeSec/60)`，随局内秒数连续增长（非整分钟阶跃）
     */
    difficultyPerMinuteFactor: number;
    /** 随机精英小怪：生成概率与相对普通怪的血量/攻击倍率；击杀必掉紫箱 */
    elite: {
      spawnChance: number;
      hpMult: number;
      attackMult: number;
    };
  };
}

/** 默认平衡表；调参时主要改此对象 */
export const survivorBalance: SurvivorBalanceConfig = {
  rifle: {
    maxRange: 420,
  },
  spawn: {
    /** 在表基准上再放慢：`(1.5/0.7)×1.25`，相对此前配置再拉长约 25% 刷怪间隔 */
    intervalScale: (1.5 / 0.7) * 1.25,
  },
  enemy: {
    /** 在表基准上再 ×0.7 怪物地面移速（原 0.65 × 0.7） */
    moveSpeedScale: 0.65 * 0.7,
    projectileSpeedScale: 0.372,
    /** 每经过约 60 秒敌血与攻×1.05；改大则后期更陡（如 1.06） */
    difficultyPerMinuteFactor: 1.05,
    elite: {
      spawnChance: 0.01,
      hpMult: 5,
      attackMult: 3,
    },
  },
};
