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
  /** 本帧是否请求冲刺（空格按下沿 / 冲刺键点按，仅一帧为 true） */
  dash?: boolean;
}

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
  /** 追玩家朝向 X（归一化），供左右翻转 */
  facingX: number;
  /** 追玩家朝向 Y（归一化） */
  facingY: number;
  /** 走路动画相位（弧度），由模型每帧累加 */
  animPhase: number;
  /** 远程射击剩余冷却（秒），无远程则为 0 */
  rangedCd: number;
  /** 远程参数快照；无远程为 undefined */
  ranged?: {
    type: EnemyRangedType;
    damage: number;
    interval: number;
    projSpeed: number;
    /** 远程开火最大距离（来自 `enemyGameConfig`） */
    attackRange: number;
    blastRadius?: number;
  };
  /** 与 `EnemyStatConfig.ignoresObstacles` 一致；飞行单位越障移动 */
  ignoresObstacles?: boolean;
  /**
   * 生成时的怪物等级（与玩家等级无关）：用于击杀掉落装备箱的池上限
   * 取 `floor(本局 gameTime/60)+1`，随分钟数无限增长（无 99 封顶）
   */
  level: number;
}

/** 纹理变体：砖纹横砌 / 木板竖纹 / 斜纹 / 碎石噪点 */
export type ObstacleTextureVariant = 0 | 1 | 2 | 3;

/** 轴对齐矩形障碍（土房等），阻挡移动与普通弹体；`fillColor` 等仅用于地图绘制 */
export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 墙面主色（RGB） */
  fillColor: number;
  /** 勾边与深缝色 */
  strokeColor: number;
  /** 程序化纹理种类 */
  textureVariant: ObstacleTextureVariant;
  /** 0～1，影响纹理相位与砖行高，使相邻障碍不对齐 */
  textureSeed: number;
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
  /** 命中与障碍判定半径；步枪省略则用 `RIFLE_BULLET_RADIUS` */
  hitRadius?: number;
  /** 还可命中的敌人数；首中后若 >0 弹体不销毁（穿透） */
  hitsRemaining?: number;
  /** 本弹已结算过伤害的敌人 `id`，避免重复命中 */
  hitEnemyIds?: number[];
  /** 世界层绘制色；省略则用默认金黄 */
  displayColor?: number;
  /** 撞土房障碍时剩余可反弹次数；由 `SurvivorGameModel.projectileBounceAdd` 在发射时写入，每反弹一次减 1，为 0 则穿障时销毁 */
  obstacleBouncesRemaining?: number;
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

/** 地图可拾取宝箱：靠近判定；限时增益箱或击杀掉落的装备箱 */
export interface WorldChest {
  x: number;
  y: number;
  /** `gameTime` 达到后未拾取则移除 */
  despawnAt: number;
  /**
   * 省略或 `buff`：随机限时增益（与 `chestBuffs`）；`gear`：紫箱，拾取时按 `monsterLevel` 随机九部位装备词条并入库（`gearAffixConfig` / `applyPurpleChestLoot`）
   */
  chestKind?: 'buff' | 'gear';
  /** 装备箱：被击杀敌人等级，影响开箱件数（1～5）与等阶（见 `gearAffixConfig`） */
  monsterLevel?: number;
}
