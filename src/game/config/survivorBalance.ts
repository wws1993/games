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
  };
}

/** 默认平衡表；调参时主要改此对象 */
export const survivorBalance: SurvivorBalanceConfig = {
  rifle: {
    maxRange: 420,
  },
  spawn: {
    intervalScale: 1,
  },
  enemy: {
    moveSpeedScale: 0.85,
  },
};
