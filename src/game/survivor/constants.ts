/**
 * 阶段 1 数值常量：与 `docs/敌后幸存者-游戏分步开发设计文档.md` 对齐；设计稿「3 单位/秒」在 800 世界内过慢，故用 `MOVE_SCALE` 做可玩性缩放，便于后续改回纯表驱动。
 */
/** 方形无缝大世界边长（逻辑单位）；相机跟随玩家，边缘仍软边界防止飞出 */
export const WORLD_SIZE = 6000;

/** 障碍矩形数量目标（随机放置，可能略少） */
export const WORLD_OBSTACLE_COUNT = 72;

/** 出生点周围不刷障碍的半径 */
export const WORLD_SPAWN_CLEAR_RADIUS = 280;

/**
 * 相机视口：屏幕「较短边」对应的世界单位长度；数值越大越「拉高」、可见范围越大（略增以降低过近感）
 */
export const CAMERA_VIEW_WORLD_ON_SHORT_SIDE = 505;

/** 设计移速 3 u/s × 缩放 ≈ 局内手感（像素级世界坐标） */
export const PLAYER_MOVE_SCALE = 55;

/** 玩家基础移速（文档 3.0 单位/秒） */
export const PLAYER_BASE_SPEED = 3;

/** 玩家碰撞半径（世界单位） */
export const PLAYER_RADIUS = 14;

/** 敌人 `animPhase` 每秒基础增量，与移速项相加 */
export const ENEMY_ANIM_PHASE_BASE = 6;

/** 敌人 `animPhase` 随 `moveSpeed` 的系数，移速越快步频越快 */
export const ENEMY_ANIM_PHASE_PER_MOVE_SPEED = 0.085;

/** 初始生命、拾取范围（文档） */
export const PLAYER_BASE_MAX_HP = 100;

export const PLAYER_BASE_PICKUP_RADIUS = 50;

/** 三八式步枪：射速与子弹 */
export const RIFLE_COOLDOWN_SEC = 0.38;

export const RIFLE_BULLET_SPEED = 420;

export const RIFLE_BULLET_RADIUS = 4;

export const RIFLE_BASE_DAMAGE = 12;

/**
 * 步枪子弹判定为暴击时的基础伤害倍率（与 `critOnHitDamageMult` 叠乘）
 */
export const RIFLE_CRIT_BASE_MULT = 2;

/** 人物初始步枪暴击几率（0～1）；局内由强化卡在此基础上累加，封顶 1 */
export const PLAYER_BASE_CRIT_CHANCE = 0.05;

/** 推箱子：贴障碍且同向移动蓄满后才开始推动（秒） */
export const OBSTACLE_PUSH_CHARGE_SEC = 1;

/** 推箱子：蓄力完成后障碍沿施力轴滑动的速度（世界单位/秒，低于人物移速） */
export const OBSTACLE_PUSH_SLIDE_SPEED = 52;

/** 接触伤害最小间隔（秒），避免每帧多段伤害 */
export const CONTACT_DAMAGE_INTERVAL = 0.45;

/** 经验宝石 */
export const GEM_RADIUS = 7;

export const GEM_XP_VALUE = 6;

/** 新掉落宝石与已有宝石中心距小于此则合并为一条 `XpGem`，减少同堆实体数 */
export const GEM_MERGE_RADIUS = 38;

/** 场上 `gems` 数组长度硬上限；超出时将经验并入距掉落点最近的宝石，避免数组与绘制无限增长 */
export const GEM_MAX_ON_FIELD = 200;

/** 升级所需经验：线性增长，后续可换表 */
export function xpToReachNextLevel(level: number): number {
  return 18 + level * 12;
}

