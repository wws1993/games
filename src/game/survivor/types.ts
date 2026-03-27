import type { EnemyKind, EnemyRangedType } from './enemyDefs';

/** 水平垂直输入：虚拟摇杆模拟量优先于键盘布尔量（均为世界坐标：+X 向右，+Y 向下） */
export interface MoveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  /** 摇杆 / 触摸方向 -1~1，未使用摇杆时不传 */
  analogX?: number;
  analogY?: number;
}

/** 升级三选一（阶段 1 固定三种） */
export type LevelUpChoiceId = 'damage' | 'moveSpeed' | 'maxHp';

/** 敌人实例：字段在刷新时从表拷贝并已乘难度倍率 */
export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  moveSpeed: number;
  contactDamage: number;
  /** 死亡掉落经验宝石数值 */
  gemValue: number;
  /** 上次对玩家造成接触伤害的时间戳（秒，gameTime） */
  lastHitPlayerAt: number;
  /** 远程射击剩余冷却（秒），无远程则为 0 */
  rangedCd: number;
  /** 远程参数快照；无远程为 undefined */
  ranged?: {
    type: EnemyRangedType;
    damage: number;
    interval: number;
    projSpeed: number;
    blastRadius?: number;
  };
}

/** 轴对齐矩形障碍（土房等），阻挡移动与普通弹体 */
export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  /**
   * 为 true 时不与障碍做阻挡判定（手榴弹、土炮抛物等）；步枪等普通弹体省略或 false
   */
  ignoresObstacles?: boolean;
}

/** 敌弹：机枪弹直线命中玩家；炮弹飞至落点后范围伤害 */
export interface EnemyProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  projKind: 'mg' | 'shell';
  hitRadius: number;
  targetX?: number;
  targetY?: number;
  blastRadius?: number;
}

export interface XpGem {
  x: number;
  y: number;
  value: number;
}
