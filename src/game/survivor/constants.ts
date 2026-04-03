/**
 * 阶段 1 数值常量：与 `docs/敌后幸存者-游戏分步开发设计文档.md` 对齐；设计稿「3 单位/秒」在 800 世界内过慢，故用 `MOVE_SCALE` 做可玩性缩放，便于后续改回纯表驱动。
 */
/** 方形无缝大世界边长（逻辑单位）；相机跟随玩家，边缘仍软边界防止飞出 */
export const WORLD_SIZE = 6000;

/**
 * 刷怪距玩家的环带（世界单位）：过小易贴脸，过大则像地图边刷一样久看不到怪；`CAMERA_VIEW_WORLD_ON_SHORT_SIDE` 约 505，环带略超出屏幕边缘以保持压境感
 */
export const ENEMY_SPAWN_RING_MIN_DIST = 300;

/** 与 `ENEMY_SPAWN_RING_MIN_DIST` 配对，随机落点在该距离区间内 */
export const ENEMY_SPAWN_RING_MAX_DIST = 560;

/** 障碍矩形数量目标（随机放置，可能略少） */
export const WORLD_OBSTACLE_COUNT = 72;

/** 出生点周围不刷障碍的半径 */
export const WORLD_SPAWN_CLEAR_RADIUS = 280;

/**
 * 相机视口：屏幕「较短边」对应的世界单位长度；数值越大越「拉高」、可见范围越大（略增以降低过近感）
 */
export const CAMERA_VIEW_WORLD_ON_SHORT_SIDE = 505;

/**
 * 场上存活敌数量不低于此值时，局内对单敌改用极简矢量剪影，避免每怪每帧大量 `Graphics.clear` + 复杂路径（怪海时主要瓶颈之一）
 */
export const ENEMY_VISUAL_LOD_COUNT = 52;

/** 设计移速 3 u/s × 缩放 ≈ 局内手感（像素级世界坐标） */
export const PLAYER_MOVE_SCALE = 55;

/** 冲刺冷却基准（秒），再乘升级卡 `dashCooldownMult`（小于 1 为缩短） */
export const PLAYER_DASH_BASE_COOLDOWN_SEC = 2.35;

/** 冲刺位移持续（秒），此段内以冲刺速度积分，再乘升级卡 `dashSpeedMult` 为有效冲刺速度 */
export const PLAYER_DASH_BASE_DURATION_SEC = 0.125;

/**
 * 冲刺相对普通行走的速度倍率（与 `PLAYER_BASE_SPEED * PLAYER_MOVE_SCALE * 移速倍率` 相乘后再乘 `dashSpeedMult`）
 */
export const PLAYER_DASH_REL_SPEED = 3.35;

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

/**
 * 受击后短无敌窗口（秒）基准值；由升级卡 `hurtInvincibleMult` 叠乘；与 `CONTACT_DAMAGE_INTERVAL` 独立（弹伤/接触均走此窗口）
 */
export const PLAYER_HURT_INVINCIBLE_BASE_SEC = 0.32;

/** 与玩家重叠时沿「玩家→敌」方向额外推开的距离（世界单位），避免怪贴脸叠在一起 */
export const ENEMY_CONTACT_SEPARATION_PAD = 5;

/** 经验宝石 */
export const GEM_RADIUS = 7;

export const GEM_XP_VALUE = 6;

/** 新掉落宝石与已有宝石中心距小于此则合并为一条 `XpGem`，减少同堆实体数 */
export const GEM_MERGE_RADIUS = 38;

/** 场上 `gems` 数组长度硬上限；超出时将经验并入距掉落点最近的宝石，避免数组与绘制无限增长 */
export const GEM_MAX_ON_FIELD = 200;

/** 宝箱：与玩家拾取圆叠加判定的半径（世界单位） */
export const CHEST_RADIUS = 18;

/** 角色附近周期性宝箱刷新间隔（局内秒） */
export const CHEST_SPAWN_INTERVAL_SEC = 30;

/** 宝箱生成后未拾取的存在时间（局内秒），超时消失 */
export const CHEST_LIFETIME_SEC = 20;

/** 击杀敌人时基础掉落装备宝箱概率；随 `monsterLevel` 略升（见 `SurvivorGameModel`） */
export const GEAR_CHEST_DROP_BASE_CHANCE = 0.042;

/** 地道入口：碰撞/绘制用半径（世界单位） */
export const TUNNEL_ENTRANCE_RADIUS = 20;

/** 设计文档：进入地道后隐身秒数；期间敌人不追击且不对玩家造成接触/远程伤害 */
export const TUNNEL_STEALTH_SEC = 3;

/** 首只地道入口在局内第几秒可生成（逻辑秒） */
export const TUNNEL_FIRST_SPAWN_SEC = 96;

/** 使用入口后，下一只入口最早出现的间隔（逻辑秒）；入口单次使用即消失 */
export const TUNNEL_RESPAWN_AFTER_USE_SEC = 200;

/** 升级所需经验：线性增长，后续可换表 */
export function xpToReachNextLevel(level: number): number {
  return 18 + level * 12;
}

