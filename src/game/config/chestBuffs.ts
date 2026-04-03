/**
 * 地图宝箱随机道具：限时增益，与升级卡池独立；同种再次拾取刷新持续时间
 */

/** 宝箱道具种类键 */
export type ChestBuffKind =
  | 'jumbo_shells'
  | 'growth_spurt'
  | 'wind_runner'
  | 'iron_turtle'
  | 'lucky_eye'
  | 'loot_magnet'
  | 'hair_trigger'
  | 'glass_cannon'
  | 'field_bandage'
  | 'xp_rush'
  | 'bloodthirst'
  | 'ghost_step';

/** 单条宝箱增益定义：缺省乘子为 1、加成为 0 */
export interface ChestBuffDef {
  kind: ChestBuffKind;
  /** HUD 与拾取提示 */
  title: string;
  /** 秒；到期后效果移除 */
  durationSec: number;
  /** 步枪弹碰撞半径 × */
  bulletRadiusMult?: number;
  /** 主角矢量缩放 ×（仅表现，碰撞半径不变） */
  playerScaleMult?: number;
  /** 叠在 `moveSpeedMultiplier` 之上再乘 */
  moveSpeedMult?: number;
  /** 受击乘算：<1 减伤 */
  damageTakenMult?: number;
  /** 叠在 `critChance` 上，仍封顶 1 */
  critChanceAdd?: number;
  /** 拾取圈半径 + */
  pickupRadiusAdd?: number;
  /** 步枪冷却 ×：<1 射更快 */
  rifleCooldownMult?: number;
  /** 步枪单发伤害 ×（叠在 `damageMultiplier` 上） */
  damageDealtMult?: number;
  /** 每秒回复生命 */
  hpRegenPerSec?: number;
  /** 吸收经验宝石时 value × */
  xpGainMult?: number;
  /** 击杀敌人时按伤害比例回复生命（系数 × 伤害） */
  lifestealRatio?: number;
}

/** 全表：趣味与风险并存 */
export const CHEST_BUFF_DEFS: Record<ChestBuffKind, ChestBuffDef> = {
  jumbo_shells: {
    kind: 'jumbo_shells',
    title: '粗弹头',
    durationSec: 18,
    bulletRadiusMult: 1.55,
  },
  growth_spurt: {
    kind: 'growth_spurt',
    title: '巨人豆',
    durationSec: 16,
    playerScaleMult: 1.24,
  },
  wind_runner: {
    kind: 'wind_runner',
    title: '神行靴',
    durationSec: 18,
    moveSpeedMult: 1.26,
  },
  iron_turtle: {
    kind: 'iron_turtle',
    title: '铁王八壳',
    durationSec: 20,
    moveSpeedMult: 0.8,
    damageTakenMult: 0.7,
  },
  lucky_eye: {
    kind: 'lucky_eye',
    title: '瞄准镜',
    durationSec: 18,
    critChanceAdd: 0.14,
  },
  loot_magnet: {
    kind: 'loot_magnet',
    title: '吸宝袋',
    durationSec: 18,
    pickupRadiusAdd: 48,
  },
  hair_trigger: {
    kind: 'hair_trigger',
    title: '扳机簧',
    durationSec: 16,
    rifleCooldownMult: 0.68,
  },
  glass_cannon: {
    kind: 'glass_cannon',
    title: '玻璃大炮',
    durationSec: 15,
    damageDealtMult: 1.38,
    damageTakenMult: 1.15,
  },
  field_bandage: {
    kind: 'field_bandage',
    title: '野战绷带',
    durationSec: 20,
    hpRegenPerSec: 3.2,
  },
  xp_rush: {
    kind: 'xp_rush',
    title: '识字班笔记',
    durationSec: 22,
    xpGainMult: 1.65,
  },
  bloodthirst: {
    kind: 'bloodthirst',
    title: '以战养战',
    durationSec: 14,
    lifestealRatio: 0.06,
  },
  ghost_step: {
    kind: 'ghost_step',
    title: '草上飞',
    durationSec: 12,
    moveSpeedMult: 1.45,
    damageTakenMult: 1.08,
  },
};

/** 均匀随机用遍历顺序 */
export const CHEST_BUFF_KIND_ORDER: readonly ChestBuffKind[] = [
  'jumbo_shells',
  'growth_spurt',
  'wind_runner',
  'iron_turtle',
  'lucky_eye',
  'loot_magnet',
  'hair_trigger',
  'glass_cannon',
  'field_bandage',
  'xp_rush',
  'bloodthirst',
  'ghost_step',
];

/** 均匀随机一种宝箱道具 */
export function pickRandomChestBuffKind(): ChestBuffKind {
  const a = CHEST_BUFF_KIND_ORDER;
  return a[Math.floor(Math.random() * a.length)]!;
}
