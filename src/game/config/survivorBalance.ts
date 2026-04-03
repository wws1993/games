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
  };
}

/** 默认平衡表；调参时主要改此对象 */
export const survivorBalance: SurvivorBalanceConfig = {
  rifle: {
    maxRange: 420,
  },
  spawn: {
    /** 在表基准上再放慢约 30% 刷怪（原 1.5 × 1/0.7） */
    intervalScale: 1.5 / 0.7,
  },
  enemy: {
    /** 在表基准上再 ×0.7 怪物地面移速（原 0.65 × 0.7） */
    moveSpeedScale: 0.65 * 0.7,
    projectileSpeedScale: 0.72,
  },
};
