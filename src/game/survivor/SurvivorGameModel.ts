import {
  CONTACT_DAMAGE_INTERVAL,
  ENEMY_CONTACT_SEPARATION_PAD,
  CHEST_RADIUS,
  CHEST_SPAWN_INTERVAL_SEC,
  GEM_MAX_ON_FIELD,
  GEM_MERGE_RADIUS,
  GEM_RADIUS,
  GEM_XP_VALUE,
  PLAYER_BASE_MAX_HP,
  PLAYER_BASE_PICKUP_RADIUS,
  ENEMY_ANIM_PHASE_BASE,
  ENEMY_ANIM_PHASE_PER_MOVE_SPEED,
  PLAYER_BASE_SPEED,
  PLAYER_MOVE_SCALE,
  PLAYER_RADIUS,
  PLAYER_BASE_CRIT_CHANCE,
  OBSTACLE_PUSH_CHARGE_SEC,
  OBSTACLE_PUSH_SLIDE_SPEED,
  RIFLE_BASE_DAMAGE,
  RIFLE_CRIT_BASE_MULT,
  RIFLE_BULLET_RADIUS,
  RIFLE_BULLET_SPEED,
  RIFLE_COOLDOWN_SEC,
  ENEMY_SPAWN_RING_MAX_DIST,
  ENEMY_SPAWN_RING_MIN_DIST,
  WORLD_OBSTACLE_COUNT,
  WORLD_SIZE,
  WORLD_SPAWN_CLEAR_RADIUS,
  xpToReachNextLevel,
} from './constants';
import {
  circleAabbOverlap,
  obstaclePlacementValid,
  playerBulletBlockedByObstacles,
  pushCircleOutOfAabb,
  resolveCircleWithObstacles,
} from './collision';
import { generateObstacles } from './obstacleGen';
import { getSpawnBatchSize, getSpawnFormation, type EnemySpawnFormation } from '../config/enemyConfig';
import {
  LEVEL_UP_PUSH_CARD_ID,
  levelUpCardPool,
  levelUpPickCount,
  type LevelUpCardDef,
} from '../config/levelUpCardsConfig';
import { survivorBalance } from '../config/survivorBalance';
import { getDevBonusMaxHp, getDevBonusRifleAttackSpeed } from '../meta/devRuntime';
import {
  difficultyMultiplier,
  ENEMY_DEFS,
  pickSpawnKind,
  SPAWN_INTERVAL_START_SEC,
  spawnIntervalForTime,
} from './enemyDefs';
import type { EnemyKind } from './enemyDefs';
import type { Bullet, Enemy, EnemyProjectile, MoveInput, Obstacle, WorldChest, XpGem } from './types';

/** 核心战斗与成长状态机：无 Pixi 依赖，供 `GameScreen` 每帧 `step` 驱动 */
export class SurvivorGameModel {
  /** 玩家世界坐标 X */
  public playerX = 0;

  /** 玩家世界坐标 Y */
  public playerY = 0;

  /** 上一有效移动方向 X（归一化），供左右翻转；无移动时保持最后值 */
  public playerFacingX = 1;

  /** 上一有效移动方向 Y（归一化） */
  public playerFacingY = 0;

  /** 本帧是否产生位移输入（用于 walk / idle 表现） */
  public playerMoving = false;

  /** 当前生命 */
  public playerHp = PLAYER_BASE_MAX_HP;

  /** 最大生命 */
  public playerMaxHp = PLAYER_BASE_MAX_HP;

  /** 全局伤害倍率（升级 +10% 累乘） */
  public damageMultiplier = 1;

  /** 移速倍率（升级 +5% 累乘） */
  public moveSpeedMultiplier = 1;

  /** 步枪攻速倍率（越大射得越快，冷却除以该值） */
  public rifleAttackSpeedMult = 1;

  /** 步枪每轮发射子弹数（扇形散布） */
  public rifleBulletCount = 1;

  /** 步枪暴击几率 0～1：`PLAYER_BASE_CRIT_CHANCE` 与「暴击Ⅰ」等卡片累加后封顶 1 */
  public critChance = PLAYER_BASE_CRIT_CHANCE;

  /**
   * 暴击命中时在 `RIFLE_CRIT_BASE_MULT` 之后再乘的系数；默认 1，「皮鞭蘸碘伏…」等叠乘
   */
  public critOnHitDamageMult = 1;

  /** 为 true 时本帧位移可沿主轴推动矩形障碍（来自「推箱子」强化卡） */
  public canPushObstacles = false;

  /** 本帧玩家位移分量（世界单位），推箱子时与施力主轴一致 */
  private _playerMoveStepX = 0;
  private _playerMoveStepY = 0;

  /** 上一帧 `step` 的 dt，推箱子滑动步长用 */
  private _lastFrameDt = 0;

  /** 贴障碍同向蓄力秒数；换向或脱离障碍清零 */
  private _obstaclePushChargeT = 0;

  /** 与 `_obstaclePushChargeT` 对应的施力主轴键（如 `+x`、`-y`） */
  private _obstaclePushDomKey: string | null = null;

  /** 拾取范围（文档初始 50，阶段 1 仅用于宝石） */
  public pickupRadius = PLAYER_BASE_PICKUP_RADIUS;

  /** 当前等级（从 1 开始） */
  public level = 1;

  /** 当前经验（本级内已累积） */
  public xp = 0;

  /** 存活时间（秒） */
  public gameTime = 0;

  /** 步枪冷却剩余（秒） */
  public rifleCooldown = 0;

  /** 距离下次刷怪（秒） */
  public spawnTimer = 0;

  /** 刷怪间隔（秒），随时间缩短 */
  public spawnInterval = SPAWN_INTERVAL_START_SEC;

  /** 是否因升级弹窗暂停 */
  public paused = false;

  /** 是否等待玩家三选一 */
  public awaitingLevelUp = false;

  /** 当前弹窗展示的升级卡片（与 `levelUpCardsConfig` 中对象同一引用） */
  public readonly pendingLevelUpCards: LevelUpCardDef[] = [];

  /** 是否已阵亡 */
  public gameOver = false;

  /** 本局累计击杀（回首页结算成就时上报） */
  public sessionKills = 0;

  public readonly enemies: Enemy[] = [];

  public readonly bullets: Bullet[] = [];

  /** 敌机枪弹与炮弹 */
  public readonly enemyProjectiles: EnemyProjectile[] = [];

  public readonly gems: XpGem[] = [];

  /** 定时刷新的可拾取宝箱（阶段 4.3） */
  public readonly chests: WorldChest[] = [];

  /** 下次按 `gameTime` 触发刷箱的时刻（秒）；`reset` 时设为 `CHEST_SPAWN_INTERVAL_SEC` */
  private _nextChestSpawnGameTime = CHEST_SPAWN_INTERVAL_SEC;

  /** 开启宝箱后 HUD 简短提示文案；与 `chestToastRemain` 配对 */
  public chestToastTitle = '';

  /** 宝箱提示剩余显示时间（秒），由 `GameScreen` 每帧扣减 */
  public chestToastRemain = 0;

  /** 静态矩形障碍：挡人、挡怪、挡玩家普通子弹；不挡 `ignoresObstacles` 弹体 */
  public readonly obstacles: Obstacle[] = [];

  /** 障碍几何相对上一帧有变化，需重绘地图障碍层（推箱子时置位；静止时可跳过数千次 `stroke`） */
  public obstaclesDirty = true;

  /** 步枪弹-敌碰撞：均匀网格边长（世界单位），与 `WORLD_SIZE` 组合成固定桶数 */
  private static readonly _BULLET_HIT_GRID_CELL = 100;

  /** `ceil(WORLD_SIZE / _BULLET_HIT_GRID_CELL)` */
  private _bulletHitGridW = 0;

  /** 每格 `Enemy[]`，惰性分配；每帧清空 `_bulletHitGridUsed` 中索引对应桶 */
  private _bulletHitGridBuckets: Enemy[][] = [];

  /** 本帧哪些桶非空，供下一帧开头 O(用过桶数) 清空 */
  private readonly _bulletHitGridUsed: number[] = [];

  private _nextEnemyId = 1;

  /**
   * 重置新一局：地图中心出生、清空实体、时间归零
   */
  public reset(): void {
    const half = WORLD_SIZE * 0.5;
    this.playerX = half;
    this.playerY = half;
    this.playerFacingX = 1;
    this.playerFacingY = 0;
    this.playerMoving = false;
    const bonusHp = getDevBonusMaxHp();
    this.playerMaxHp = PLAYER_BASE_MAX_HP + bonusHp;
    this.playerHp = this.playerMaxHp;
    this.damageMultiplier = 1;
    this.moveSpeedMultiplier = 1;
    this.rifleAttackSpeedMult = 1 + getDevBonusRifleAttackSpeed();
    this.rifleBulletCount = 1;
    this.critChance = PLAYER_BASE_CRIT_CHANCE;
    this.critOnHitDamageMult = 1;
    this.canPushObstacles = false;
    this._playerMoveStepX = 0;
    this._playerMoveStepY = 0;
    this._lastFrameDt = 0;
    this._obstaclePushChargeT = 0;
    this._obstaclePushDomKey = null;
    this.pickupRadius = PLAYER_BASE_PICKUP_RADIUS;
    this.level = 1;
    this.xp = 0;
    this.gameTime = 0;
    this.rifleCooldown = 0;
    this.spawnTimer = 0.18;
    this.spawnInterval = SPAWN_INTERVAL_START_SEC;
    this.paused = false;
    this.awaitingLevelUp = false;
    this.pendingLevelUpCards.length = 0;
    this.gameOver = false;
    this.sessionKills = 0;
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.enemyProjectiles.length = 0;
    this.gems.length = 0;
    this.chests.length = 0;
    this._nextChestSpawnGameTime = CHEST_SPAWN_INTERVAL_SEC;
    this.chestToastTitle = '';
    this.chestToastRemain = 0;
    this._nextEnemyId = 1;
    this.obstacles.length = 0;
    this.obstacles.push(
      ...generateObstacles(
        WORLD_SIZE,
        this.playerX,
        this.playerY,
        WORLD_SPAWN_CLEAR_RADIUS,
        WORLD_OBSTACLE_COUNT,
      ),
    );
    this.obstaclesDirty = true;
  }

  /**
   * 单帧推进：输入移动、刷怪、索敌射击、弹道、碰撞、拾取与升级检测
   * @param dt - 帧间隔（秒）
   * @param input - 键盘合成方向
   */
  public step(dt: number, input: MoveInput): void {
    if (this.gameOver || this.paused) {
      return;
    }

    this._lastFrameDt = dt;
    this.gameTime += dt;
    const scale = survivorBalance.spawn.intervalScale;
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    this.spawnInterval = Math.max(0.04, spawnIntervalForTime(this.gameTime) * safeScale);

    this._spawnTick(dt);
    this._playerMove(dt, input);
    this._clampPlayerToMap();
    this._updateObstaclePushCharge(dt);
    this._resolvePlayerVsObstacles();
    this._rifleTick(dt);
    this._integrateBullets(dt);
    this._cullPlayerBulletsInObstacles();
    this._integrateEnemies(dt);
    this._enemyRangedTick(dt);
    this._integrateEnemyProjectiles(dt);
    this._enemyProjectileHits();
    this._bulletEnemyHits();
    this._enemyPlayerContact();
    this._chestSpawnTick();
    this._pickupGems();
    this._pickupChests();
    this._pruneOffMapBullets();
    this._pruneEnemyProjectiles();
  }

  /**
   * 应用所选升级卡片并关闭暂停；若经验仍够连续升级则再次进入弹窗
   * @param cardId - `LevelUpCardDef.id`
   */
  public applyLevelUpChoice(cardId: string): void {
    if (!this.awaitingLevelUp) {
      return;
    }
    const card = this.pendingLevelUpCards.find((c) => c.id === cardId);
    if (!card) {
      return;
    }
    this._applyLevelUpCardEffect(card);
    this.awaitingLevelUp = false;
    this.pendingLevelUpCards.length = 0;
    this.paused = false;
    this._checkLevelUpFromXp();
  }

  /** 将单张升级卡数值写入局内状态（升级三选一与宝箱共用，不触暂停） */
  private _applyLevelUpCardEffect(card: LevelUpCardDef): void {
    const ef = card.effect;
    if (ef.kind === 'damageMult') {
      this.damageMultiplier *= ef.factor;
    } else if (ef.kind === 'moveSpeedMult') {
      this.moveSpeedMultiplier *= ef.factor;
    } else if (ef.kind === 'maxHp') {
      this.playerMaxHp += ef.add;
      this.playerHp += ef.add;
    } else if (ef.kind === 'rifleAttackSpeedMult') {
      this.rifleAttackSpeedMult *= ef.factor;
    } else if (ef.kind === 'rifleBulletCount') {
      this.rifleBulletCount = Math.max(1, Math.floor(this.rifleBulletCount + ef.add));
    } else if (ef.kind === 'critChanceAdd') {
      this.critChance = Math.min(1, Math.max(0, this.critChance + ef.add));
    } else if (ef.kind === 'critOnHitDamageMult') {
      const f = ef.factor;
      this.critOnHitDamageMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'pushObstacles') {
      this.canPushObstacles = true;
    }
  }

  /** 与 `_rollLevelUpCards` 相同过滤规则（已持有推箱子则剔除该卡） */
  private _eligibleLevelUpPool(): LevelUpCardDef[] {
    return levelUpCardPool.filter(
      (c) => !(c.id === LEVEL_UP_PUSH_CARD_ID && this.canPushObstacles),
    );
  }

  /** 宝箱奖励：池中均匀随机一张 */
  private _pickRandomChestReward(): LevelUpCardDef | null {
    const pool = this._eligibleLevelUpPool();
    if (pool.length === 0) {
      return null;
    }
    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  /** 到达 `gameTime` 里程碑时尝试在障碍外、距玩家与已有宝箱足够远处刷一只；大 dt 时按间隔递进避免漏刷 */
  private _chestSpawnTick(): void {
    const margin = 130;
    const m = WORLD_SIZE;
    const minFromPlayerSq = 220 * 220;
    const minChestSepSq = 95 * 95;
    while (this.gameTime >= this._nextChestSpawnGameTime) {
      this._nextChestSpawnGameTime += CHEST_SPAWN_INTERVAL_SEC;
      for (let attempt = 0; attempt < 64; attempt++) {
        const rx = margin + Math.random() * (m - 2 * margin);
        const ry = margin + Math.random() * (m - 2 * margin);
        const sp = this._spawnPositionClearOfObstacles(rx, ry, CHEST_RADIUS);
        const dx = sp.x - this.playerX;
        const dy = sp.y - this.playerY;
        if (dx * dx + dy * dy < minFromPlayerSq) {
          continue;
        }
        let ok = true;
        for (const ch of this.chests) {
          const sx = sp.x - ch.x;
          const sy = sp.y - ch.y;
          if (sx * sx + sy * sy < minChestSepSq) {
            ok = false;
            break;
          }
        }
        if (!ok) {
          continue;
        }
        this.chests.push({ x: sp.x, y: sp.y });
        break;
      }
    }
  }

  /** 进入拾取范围则移除宝箱并立即应用随机强化（不弹三选一窗） */
  private _pickupChests(): void {
    const reach = this.pickupRadius + CHEST_RADIUS;
    const reachSq = reach * reach;
    for (let i = this.chests.length - 1; i >= 0; i--) {
      const ch = this.chests[i]!;
      const dx = ch.x - this.playerX;
      const dy = ch.y - this.playerY;
      if (dx * dx + dy * dy > reachSq) {
        continue;
      }
      this.chests.splice(i, 1);
      const card = this._pickRandomChestReward();
      if (card) {
        this._applyLevelUpCardEffect(card);
        this.chestToastTitle = card.title;
        this.chestToastRemain = 3.4;
      }
      this._checkLevelUpFromXp();
    }
  }

  /** 本级升到下一级所需经验 */
  public get xpToNext(): number {
    return xpToReachNextLevel(this.level);
  }

  /** 经验跨多级时仅弹一次窗，剩余经验保留至确认后再 `applyLevelUpChoice` 链式检测 */
  private _checkLevelUpFromXp(): void {
    if (this.awaitingLevelUp) {
      return;
    }
    const need = xpToReachNextLevel(this.level);
    if (this.xp >= need) {
      this.xp -= need;
      this.level += 1;
      this.paused = true;
      this.awaitingLevelUp = true;
      this._rollLevelUpCards();
    }
  }

  /**
   * 从配置池洗牌后取 `levelUpPickCount` 张不重复卡片写入 `pendingLevelUpCards`
   */
  private _rollLevelUpCards(): void {
    this.pendingLevelUpCards.length = 0;
    const pool = this._eligibleLevelUpPool();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const n = Math.min(levelUpPickCount, pool.length);
    for (let k = 0; k < n; k++) {
      this.pendingLevelUpCards.push(pool[k]!);
    }
  }

  private _spawnTick(dt: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) {
      return;
    }
    this.spawnTimer += this.spawnInterval;
    const kind = pickSpawnKind(this.gameTime);
    const batch = getSpawnBatchSize(kind);
    const formation = getSpawnFormation(kind);
    this._spawnEnemyGroup(kind, batch, formation);
  }

  /**
   * 按队形在玩家周围环带内生成一批同种敌人
   * @param kind - 兵种
   * @param count - 数量
   * @param formation - 队形策略
   */
  private _spawnEnemyGroup(kind: EnemyKind, count: number, formation: EnemySpawnFormation): void {
    if (count <= 0) {
      return;
    }
    if (formation === 'edge_random') {
      for (let i = 0; i < count; i++) {
        this._spawnEnemyAtEdgeRandom(kind);
      }
      return;
    }
    if (formation === 'line_along_edge') {
      this._spawnLineAlongEdge(kind, count);
      return;
    }
    if (formation === 'tight_cluster') {
      this._spawnTightCluster(kind, count);
      return;
    }
    this._spawnVShape(kind, count);
  }

  /** 将刷怪圆心夹在世界可碰撞矩形内（半径 `circleR`） */
  private _clampSpawnCenterToWorld(x: number, y: number, circleR: number): { x: number; y: number } {
    const m = WORLD_SIZE;
    return {
      x: Math.min(m - circleR, Math.max(circleR, x)),
      y: Math.min(m - circleR, Math.max(circleR, y)),
    };
  }

  /**
   * 在玩家周围环带内随机取一点（极坐标均匀），再夹在世界内；大地图下边刷改为相对玩家，避免初见在屏幕外过远
   * @param circleR - 敌人碰撞半径，用于边界夹取
   */
  private _randomSpawnOnRingAroundPlayer(circleR: number): { x: number; y: number } {
    const band = ENEMY_SPAWN_RING_MAX_DIST - ENEMY_SPAWN_RING_MIN_DIST;
    const d = ENEMY_SPAWN_RING_MIN_DIST + Math.random() * band;
    const ang = Math.random() * Math.PI * 2;
    const x = this.playerX + Math.cos(ang) * d;
    const y = this.playerY + Math.sin(ang) * d;
    return this._clampSpawnCenterToWorld(x, y, circleR);
  }

  /** 随机角度、随机环带半径（单只） */
  private _spawnEnemyAtEdgeRandom(kind: EnemyKind): void {
    const def = ENEMY_DEFS[kind];
    const p = this._randomSpawnOnRingAroundPlayer(def.radius);
    this._spawnEnemyAt(kind, p.x, p.y);
  }

  /** 环上一点为锚、沿切向排成线段，避免重叠过近 */
  private _spawnLineAlongEdge(kind: EnemyKind, count: number): void {
    const def = ENEMY_DEFS[kind];
    const r = def.radius;
    const band = ENEMY_SPAWN_RING_MAX_DIST - ENEMY_SPAWN_RING_MIN_DIST;
    const d = ENEMY_SPAWN_RING_MIN_DIST + (0.35 + Math.random() * 0.3) * band;
    const theta = Math.random() * Math.PI * 2;
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    const tx = -uy;
    const ty = ux;
    let cx = this.playerX + ux * d;
    let cy = this.playerY + uy * d;
    const c0 = this._clampSpawnCenterToWorld(cx, cy, r);
    cx = c0.x;
    cy = c0.y;
    const spacing = Math.max(r * 2.4, 30);
    const span = spacing * Math.max(0, count - 1);
    const baseOff = -span * 0.5 + (Math.random() - 0.5) * Math.min(spacing, 24);
    for (let i = 0; i < count; i++) {
      const off = baseOff + i * spacing;
      let x = cx + tx * off;
      let y = cy + ty * off;
      const c1 = this._clampSpawnCenterToWorld(x, y, r);
      this._spawnEnemyAt(kind, c1.x, c1.y);
    }
  }

  /** 同一锚点（环带内）附近小范围随机散布 */
  private _spawnTightCluster(kind: EnemyKind, count: number): void {
    const def = ENEMY_DEFS[kind];
    const r = def.radius;
    const anchor = this._randomSpawnOnRingAroundPlayer(r);
    const jitter = Math.max(18, r * 1.2);
    for (let i = 0; i < count; i++) {
      let x = anchor.x + (Math.random() - 0.5) * jitter * 2;
      let y = anchor.y + (Math.random() - 0.5) * jitter * 2;
      const c = this._clampSpawnCenterToWorld(x, y, r);
      this._spawnEnemyAt(kind, c.x, c.y);
    }
  }

  /** 朝向玩家张开的 V 字（先放「尖端」再两翼） */
  private _spawnVShape(kind: EnemyKind, count: number): void {
    const def = ENEMY_DEFS[kind];
    const r = def.radius;
    const anchor = this._randomSpawnOnRingAroundPlayer(r);
    const ax = anchor.x;
    const ay = anchor.y;
    let nx = this.playerX - ax;
    let ny = this.playerY - ay;
    const len = Math.hypot(nx, ny);
    if (len < 1e-3) {
      nx = 1;
      ny = 0;
    } else {
      nx /= len;
      ny /= len;
    }
    const tx = -ny;
    const ty = nx;
    const stepIn = r * 2.2;
    const stepSide = r * 2.0;
    for (let i = 0; i < count; i++) {
      let ox = 0;
      let oy = 0;
      if (i === 0) {
        ox = nx * stepIn * 0.35;
        oy = ny * stepIn * 0.35;
      } else {
        const leg = i % 2 === 1 ? 1 : -1;
        const row = Math.floor((i + 1) / 2);
        ox = nx * stepIn * (0.5 + row * 0.85) + tx * stepSide * leg * row;
        oy = ny * stepIn * (0.5 + row * 0.85) + ty * stepSide * leg * row;
      }
      const x = ax + ox;
      const y = ay + oy;
      const c = this._clampSpawnCenterToWorld(x, y, r);
      this._spawnEnemyAt(kind, c.x, c.y);
    }
  }

  /**
   * 刷怪点与矩形障碍分离：先 `resolveCircleWithObstacles`，仍穿透则向地图中心微移迭代（阶段 4.1 合法化）
   * @param x - 候选圆心 x（允许在地图外缘外，便于边刷）
   * @param y - 候选圆心 y
   * @param r - 敌人半径
   */
  private _spawnPositionClearOfObstacles(x: number, y: number, r: number): { x: number; y: number } {
    let cx = x;
    let cy = y;
    const m = WORLD_SIZE;
    const centerX = m * 0.5;
    const centerY = m * 0.5;
    const obs = this.obstacles;
    for (let it = 0; it < 14; it++) {
      const p = resolveCircleWithObstacles(cx, cy, r, obs);
      cx = p.x;
      cy = p.y;
      let blocked = false;
      for (let oi = 0; oi < obs.length; oi++) {
        if (circleAabbOverlap(cx, cy, r, obs[oi]!)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        return { x: cx, y: cy };
      }
      const dx = centerX - cx;
      const dy = centerY - cy;
      const dlen = Math.hypot(dx, dy) || 1;
      cx += (dx / dlen) * (r * 0.95);
      cy += (dy / dlen) * (r * 0.95);
    }
    const p = resolveCircleWithObstacles(cx, cy, r, obs);
    return { x: p.x, y: p.y };
  }

  /** 在指定世界坐标生成一只敌人（属性乘当前难度倍率） */
  private _spawnEnemyAt(kind: EnemyKind, x: number, y: number): void {
    const def = ENEMY_DEFS[kind];
    const mul = difficultyMultiplier(this.gameTime);
    const r = def.radius;
    const sp = this._spawnPositionClearOfObstacles(x, y, r);
    x = sp.x;
    y = sp.y;
    const esp = survivorBalance.enemy.moveSpeedScale;
    const enemySpeedMul = Number.isFinite(esp) && esp > 0 ? esp : 1;

    const hp = def.baseHp * mul;
    const contactDamage = def.contactDamage * mul;
    const gemValue = Math.max(1, Math.round(GEM_XP_VALUE * def.gemMultiplier));

    let fvx = this.playerX - x;
    let fvy = this.playerY - y;
    const fl = Math.hypot(fvx, fvy) || 1;
    fvx /= fl;
    fvy /= fl;

    let ranged: Enemy['ranged'];
    let rangedCd = 0;
    if (def.ranged) {
      const rd = def.ranged.damage * mul;
      ranged = {
        type: def.ranged.type,
        damage: rd,
        interval: def.ranged.cooldown,
        projSpeed: def.ranged.projSpeed,
        attackRange: def.ranged.attackRange,
        blastRadius: def.ranged.shellBlastRadius,
      };
      rangedCd = def.ranged.cooldown * (0.35 + Math.random() * 0.5);
    }

    this.enemies.push({
      id: this._nextEnemyId++,
      kind,
      x,
      y,
      hp,
      maxHp: hp,
      radius: r,
      moveSpeed: def.speed * enemySpeedMul,
      contactDamage,
      gemValue,
      lastHitPlayerAt: -1,
      facingX: fvx,
      facingY: fvy,
      animPhase: Math.random() * Math.PI * 2,
      rangedCd,
      ranged,
    });
  }

  /** 摇杆死区：低于此模长则改读键盘，避免漂移 */
  private static readonly _ANALOG_DEADZONE = 0.14;

  /** 八方向或模拟向量归一化后乘以设计移速与倍率 */
  private _playerMove(dt: number, input: MoveInput): void {
    this._playerMoveStepX = 0;
    this._playerMoveStepY = 0;
    let dx = 0;
    let dy = 0;
    const ax = input.analogX;
    const ay = input.analogY;
    if (ax !== undefined && ay !== undefined) {
      const mag = Math.hypot(ax, ay);
      if (mag > SurvivorGameModel._ANALOG_DEADZONE) {
        dx = ax / mag;
        dy = ay / mag;
      }
    }
    if (dx === 0 && dy === 0) {
      if (input.left) {
        dx -= 1;
      }
      if (input.right) {
        dx += 1;
      }
      if (input.up) {
        dy -= 1;
      }
      if (input.down) {
        dy += 1;
      }
    }
    if (dx === 0 && dy === 0) {
      this.playerMoving = false;
      return;
    }
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    this.playerFacingX = dx;
    this.playerFacingY = dy;
    this.playerMoving = true;
    const speed = PLAYER_BASE_SPEED * PLAYER_MOVE_SCALE * this.moveSpeedMultiplier;
    const stepX = dx * speed * dt;
    const stepY = dy * speed * dt;
    this.playerX += stepX;
    this.playerY += stepY;
    this._playerMoveStepX = stepX;
    this._playerMoveStepY = stepY;
  }

  private _clampPlayerToMap(): void {
    const r = PLAYER_RADIUS;
    const m = WORLD_SIZE;
    this.playerX = Math.min(m - r, Math.max(r, this.playerX));
    this.playerY = Math.min(m - r, Math.max(r, this.playerY));
  }

  /** 接触推开或刷怪后保证敌人圆心在地图内 */
  private _clampEnemyInWorld(e: Enemy): void {
    const r = e.radius;
    const m = WORLD_SIZE;
    e.x = Math.min(m - r, Math.max(r, e.x));
    e.y = Math.min(m - r, Math.max(r, e.y));
  }

  /** 惰性分配固定大小的步枪弹宽相检测网格（子弹多时避免 O(弹×敌)） */
  private _ensureBulletHitGrid(): void {
    if (this._bulletHitGridBuckets.length > 0) {
      return;
    }
    const cs = SurvivorGameModel._BULLET_HIT_GRID_CELL;
    const gw = Math.ceil(WORLD_SIZE / cs);
    this._bulletHitGridW = gw;
    const n = gw * gw;
    this._bulletHitGridBuckets = new Array(n);
    for (let i = 0; i < n; i++) {
      this._bulletHitGridBuckets[i] = [];
    }
  }

  /** 将本帧敌人按包围盒写入网格桶（大体型敌可跨多格） */
  private _fillBulletHitGrid(): void {
    const gw = this._bulletHitGridW;
    const cs = SurvivorGameModel._BULLET_HIT_GRID_CELL;
    const used = this._bulletHitGridUsed;
    const buckets = this._bulletHitGridBuckets;
    for (let u = 0; u < used.length; u++) {
      buckets[used[u]!]!.length = 0;
    }
    used.length = 0;
    for (const e of this.enemies) {
      const r = e.radius;
      const minCx = Math.max(0, Math.floor((e.x - r) / cs));
      const maxCx = Math.min(gw - 1, Math.floor((e.x + r) / cs));
      const minCy = Math.max(0, Math.floor((e.y - r) / cs));
      const maxCy = Math.min(gw - 1, Math.floor((e.y + r) / cs));
      for (let cy = minCy; cy <= maxCy; cy++) {
        const row = cy * gw;
        for (let cx = minCx; cx <= maxCx; cx++) {
          const idx = cx + row;
          const bucket = buckets[idx]!;
          if (bucket.length === 0) {
            used.push(idx);
          }
          bucket.push(e);
        }
      }
    }
  }

  /**
   * 由本帧位移得到施力主轴键；与上一帧键一致且贴箱时才累加 `_obstaclePushChargeT`
   * @param dt - 帧间隔（秒）
   */
  private _updateObstaclePushCharge(dt: number): void {
    if (!this.canPushObstacles) {
      this._obstaclePushChargeT = 0;
      this._obstaclePushDomKey = null;
      return;
    }
    const r = PLAYER_RADIUS;
    const touching = this.obstacles.some((o) => circleAabbOverlap(this.playerX, this.playerY, r, o));
    const key = SurvivorGameModel._dominantStepKey(this._playerMoveStepX, this._playerMoveStepY);
    if (!touching || key === null) {
      this._obstaclePushChargeT = 0;
      this._obstaclePushDomKey = null;
      return;
    }
    if (key !== this._obstaclePushDomKey) {
      this._obstaclePushDomKey = key;
      this._obstaclePushChargeT = 0;
    }
    this._obstaclePushChargeT += dt;
  }

  /** 位移较强轴对应的符号键；无位移返回 null */
  private static _dominantStepKey(sx: number, sy: number): string | null {
    const ax = Math.abs(sx);
    const ay = Math.abs(sy);
    if (ax < 1e-6 && ay < 1e-6) {
      return null;
    }
    if (ax >= ay) {
      return sx > 0 ? '+x' : '-x';
    }
    return sy > 0 ? '+y' : '-y';
  }

  /** 玩家圆与障碍穿透分离；持「推箱子」时尝试沿本帧位移主轴推动障碍 */
  private _resolvePlayerVsObstacles(): void {
    if (this.canPushObstacles) {
      this._resolvePlayerVsObstaclesWithPush();
      return;
    }
    const p = resolveCircleWithObstacles(this.playerX, this.playerY, PLAYER_RADIUS, this.obstacles);
    this.playerX = p.x;
    this.playerY = p.y;
    this._clampPlayerToMap();
  }

  /**
   * 蓄力未满时只做圆与矩形分离；已满则用低速沿施力轴滑动障碍，越界或与兄弟障碍相交则回退
   */
  private _resolvePlayerVsObstaclesWithPush(): void {
    const r = PLAYER_RADIUS;
    const mx = this._playerMoveStepX;
    const my = this._playerMoveStepY;
    const moveLen = Math.hypot(mx, my);
    const obs = this.obstacles;
    const ready = this._obstaclePushChargeT >= OBSTACLE_PUSH_CHARGE_SEC;
    const fdt = this._lastFrameDt;
    const safeDt = Number.isFinite(fdt) && fdt > 0 ? fdt : 1 / 60;
    if (moveLen < 1e-4 || !ready) {
      const p = resolveCircleWithObstacles(this.playerX, this.playerY, r, obs);
      this.playerX = p.x;
      this.playerY = p.y;
      this._clampPlayerToMap();
      return;
    }
    const slide = OBSTACLE_PUSH_SLIDE_SPEED * safeDt;
    const ax = Math.abs(mx);
    const ay = Math.abs(my);
    const px = ax >= ay ? Math.sign(mx) * slide : 0;
    const py = ax >= ay ? 0 : Math.sign(my) * slide;
    for (let it = 0; it < 10; it++) {
      let hit = false;
      for (let i = 0; i < obs.length; i++) {
        const o = obs[i]!;
        if (!circleAabbOverlap(this.playerX, this.playerY, r, o)) {
          continue;
        }
        hit = true;
        const ox0 = o.x;
        const oy0 = o.y;
        o.x += px;
        o.y += py;
        const ok = obstaclePlacementValid(o, WORLD_SIZE, obs, i);
        if (ok) {
          this.obstaclesDirty = true;
          const sep = pushCircleOutOfAabb(this.playerX, this.playerY, r, o);
          this.playerX = sep.x;
          this.playerY = sep.y;
        } else {
          o.x = ox0;
          o.y = oy0;
          const sep = pushCircleOutOfAabb(this.playerX, this.playerY, r, o);
          this.playerX = sep.x;
          this.playerY = sep.y;
        }
      }
      if (!hit) {
        break;
      }
      const p = resolveCircleWithObstacles(this.playerX, this.playerY, r, obs);
      this.playerX = p.x;
      this.playerY = p.y;
    }
    this._clampPlayerToMap();
  }

  /** 步枪等普通弹进入障碍体积则销毁；`ignoresObstacles` 弹体保留 */
  private _cullPlayerBulletsInObstacles(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!;
      if (
        playerBulletBlockedByObstacles(b.x, b.y, RIFLE_BULLET_RADIUS, b.ignoresObstacles, this.obstacles)
      ) {
        this.bullets.splice(i, 1);
      }
    }
  }

  /** 冷却结束则朝射程内最近敌人发射一颗子弹 */
  private _rifleTick(dt: number): void {
    this.rifleCooldown -= dt;
    if (this.rifleCooldown > 0) {
      return;
    }
    const maxR = survivorBalance.rifle.maxRange;
    const rangeSq = (Number.isFinite(maxR) && maxR > 0 ? maxR : 420) ** 2;
    let best: Enemy | undefined;
    let bestD2 = Infinity;
    for (const e of this.enemies) {
      const dx = e.x - this.playerX;
      const dy = e.y - this.playerY;
      const d2 = dx * dx + dy * dy;
      if (d2 > rangeSq) {
        continue;
      }
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    if (!best) {
      this.rifleCooldown = 0;
      return;
    }
    const dx0 = best.x - this.playerX;
    const dy0 = best.y - this.playerY;
    const baseAng = Math.atan2(dy0, dx0);
    const asp = this.rifleAttackSpeedMult;
    const safeAsp = Number.isFinite(asp) && asp > 0 ? asp : 1;
    const n = Math.max(1, Math.min(12, Math.floor(this.rifleBulletCount)));
    const spread = 0.11;
    for (let i = 0; i < n; i++) {
      const ang = baseAng + (i - (n - 1) * 0.5) * spread;
      const vx = Math.cos(ang) * RIFLE_BULLET_SPEED;
      const vy = Math.sin(ang) * RIFLE_BULLET_SPEED;
      this.bullets.push({
        x: this.playerX,
        y: this.playerY,
        vx,
        vy,
        damage: RIFLE_BASE_DAMAGE * this.damageMultiplier,
      });
    }
    this.rifleCooldown = RIFLE_COOLDOWN_SEC / safeAsp;
  }

  private _integrateBullets(dt: number): void {
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
  }

  /** 各敌人按其移速追玩家 */
  private _integrateEnemies(dt: number): void {
    for (const e of this.enemies) {
      const dx = this.playerX - e.x;
      const dy = this.playerY - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      if (Math.abs(nx) > 0.04 || Math.abs(ny) > 0.04) {
        e.facingX = nx;
        e.facingY = ny;
      }
      e.x += nx * e.moveSpeed * dt;
      e.y += ny * e.moveSpeed * dt;
      e.animPhase += dt * (ENEMY_ANIM_PHASE_BASE + e.moveSpeed * ENEMY_ANIM_PHASE_PER_MOVE_SPEED);
      const p = resolveCircleWithObstacles(e.x, e.y, e.radius, this.obstacles);
      e.x = p.x;
      e.y = p.y;
    }
  }

  /** 机枪兵 / 炮兵冷却结束且玩家在攻击距离内则向玩家方向开火 */
  private _enemyRangedTick(dt: number): void {
    for (const e of this.enemies) {
      if (!e.ranged) {
        continue;
      }
      e.rangedCd -= dt;
      if (e.rangedCd > 0) {
        continue;
      }
      const dxp = this.playerX - e.x;
      const dyp = this.playerY - e.y;
      const dist = Math.hypot(dxp, dyp);
      const maxR = e.ranged.attackRange;
      if (!Number.isFinite(maxR) || maxR <= 0 || dist > maxR) {
        e.rangedCd = 0;
        continue;
      }
      e.rangedCd = e.ranged.interval;
      if (e.ranged.type === 'mg') {
        this._fireMgShot(e);
      } else {
        this._fireShell(e);
      }
    }
  }

  /** 直线机枪弹，朝当前玩家位置 */
  private _fireMgShot(e: Enemy): void {
    const rg = e.ranged!;
    const dx = this.playerX - e.x;
    const dy = this.playerY - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const sp = rg.projSpeed;
    this.enemyProjectiles.push({
      x: e.x,
      y: e.y,
      vx: (dx / dist) * sp,
      vy: (dy / dist) * sp,
      damage: rg.damage,
      projKind: 'mg',
      hitRadius: 5,
    });
  }

  /** 炮弹飞向开火时玩家位置，抵达落点半径内爆炸，对玩家范围伤害 */
  private _fireShell(e: Enemy): void {
    const rg = e.ranged!;
    const tx = this.playerX;
    const ty = this.playerY;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const sp = rg.projSpeed;
    const br = rg.blastRadius ?? 52;
    this.enemyProjectiles.push({
      x: e.x,
      y: e.y,
      vx: (dx / dist) * sp,
      vy: (dy / dist) * sp,
      damage: rg.damage,
      projKind: 'shell',
      hitRadius: 8,
      targetX: tx,
      targetY: ty,
      blastRadius: br,
    });
  }

  private _integrateEnemyProjectiles(dt: number): void {
    for (const p of this.enemyProjectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  /** 敌弹命中：机枪弹碰玩家；炮弹抵落点 AoE */
  private _enemyProjectileHits(): void {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i]!;
      if (p.projKind === 'mg') {
        const dx = p.x - this.playerX;
        const dy = p.y - this.playerY;
        const rr = p.hitRadius + PLAYER_RADIUS;
        if (dx * dx + dy * dy <= rr * rr) {
          this._applyProjectileDamageToPlayer(p.damage);
          this.enemyProjectiles.splice(i, 1);
        }
      } else {
        const tx = p.targetX ?? p.x;
        const ty = p.targetY ?? p.y;
        const ddx = p.x - tx;
        const ddy = p.y - ty;
        if (ddx * ddx + ddy * ddy <= 18 * 18) {
          const br = p.blastRadius ?? 52;
          const px = this.playerX - tx;
          const py = this.playerY - ty;
          if (px * px + py * py <= br * br) {
            this._applyProjectileDamageToPlayer(p.damage);
          }
          this.enemyProjectiles.splice(i, 1);
        }
      }
    }
  }

  /** 弹伤不额外分段，直接扣血；归零则结束 */
  private _applyProjectileDamageToPlayer(amount: number): void {
    this.playerHp -= amount;
    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.gameOver = true;
      this.paused = true;
    }
  }

  /** 玩家步枪弹与敌人：半径按兵种；空间网格缩小弹道+1 后的邻域检测量 */
  private _bulletEnemyHits(): void {
    const bullets = this.bullets;
    const enemies = this.enemies;
    if (bullets.length === 0 || enemies.length === 0) {
      return;
    }
    this._ensureBulletHitGrid();
    this._fillBulletHitGrid();
    const gw = this._bulletHitGridW;
    const cs = SurvivorGameModel._BULLET_HIT_GRID_CELL;
    const buckets = this._bulletHitGridBuckets;

    outer: for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]!;
      const bx = b.x;
      const by = b.y;
      const cx = Math.floor(bx / cs);
      const cy = Math.floor(by / cs);

      const hitEnemy = (e: Enemy): void => {
        let dmg = b.damage;
        const cc = Math.min(1, Math.max(0, this.critChance));
        if (cc > 0 && Math.random() < cc) {
          dmg *= RIFLE_CRIT_BASE_MULT;
          const ex = this.critOnHitDamageMult;
          dmg *= Number.isFinite(ex) && ex > 0 ? ex : 1;
        }
        e.hp -= dmg;
        bullets.splice(i, 1);
        if (e.hp <= 0) {
          this._onEnemyKilled(e);
        }
      };

      const testEnemy = (e: Enemy): boolean => {
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.radius + RIFLE_BULLET_RADIUS;
        if (dx * dx + dy * dy > rr * rr) {
          return false;
        }
        hitEnemy(e);
        return true;
      };

      if (cx >= 0 && cx < gw && cy >= 0 && cy < gw) {
        for (let oy = -1; oy <= 1; oy++) {
          const ncy = cy + oy;
          if (ncy < 0 || ncy >= gw) {
            continue;
          }
          const row = ncy * gw;
          for (let ox = -1; ox <= 1; ox++) {
            const ncx = cx + ox;
            if (ncx < 0 || ncx >= gw) {
              continue;
            }
            const bucket = buckets[ncx + row]!;
            for (let k = 0; k < bucket.length; k++) {
              if (testEnemy(bucket[k]!)) {
                continue outer;
              }
            }
          }
        }
        continue;
      }
      for (let j = 0; j < enemies.length; j++) {
        if (testEnemy(enemies[j]!)) {
          continue outer;
        }
      }
    }
  }

  private _onEnemyKilled(e: Enemy): void {
    const idx = this.enemies.indexOf(e);
    if (idx >= 0) {
      this.enemies.splice(idx, 1);
    }
    this.sessionKills += 1;
    this._dropXpGem(e.x, e.y, e.gemValue);
  }

  /** 在死亡点投放经验：优先并入合并半径内最近的一枚宝石；否则在未满上限时新建；满员则并入全图距该点最近的宝石 */
  private _dropXpGem(x: number, y: number, value: number): void {
    const gems = this.gems;
    const mergeR2 = GEM_MERGE_RADIUS * GEM_MERGE_RADIUS;
    let mergeIdx = -1;
    let mergeBestD2 = Infinity;
    for (let i = 0; i < gems.length; i++) {
      const g = gems[i]!;
      const dx = g.x - x;
      const dy = g.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= mergeR2 && d2 < mergeBestD2) {
        mergeBestD2 = d2;
        mergeIdx = i;
      }
    }
    if (mergeIdx >= 0) {
      const g = gems[mergeIdx]!;
      g.value += value;
      const pull = 0.15;
      g.x += (x - g.x) * pull;
      g.y += (y - g.y) * pull;
      return;
    }
    if (gems.length < GEM_MAX_ON_FIELD) {
      gems.push({ x, y, value });
      return;
    }
    let nearIdx = 0;
    let nearD2 = Infinity;
    for (let i = 0; i < gems.length; i++) {
      const g = gems[i]!;
      const dx = g.x - x;
      const dy = g.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearD2) {
        nearD2 = d2;
        nearIdx = i;
      }
    }
    const sink = gems[nearIdx]!;
    sink.value += value;
    const pullCap = 0.12;
    sink.x += (x - sink.x) * pullCap;
    sink.y += (y - sink.y) * pullCap;
  }

  /** 接触伤害：重叠时先把怪沿径向推开，再按间隔扣血，避免贴脸叠层连续受伤 */
  private _enemyPlayerContact(): void {
    for (const e of this.enemies) {
      const dx = e.x - this.playerX;
      const dy = e.y - this.playerY;
      const distSq = dx * dx + dy * dy;
      const rr = e.radius + PLAYER_RADIUS;
      const rrSq = rr * rr;
      if (distSq > rrSq) {
        continue;
      }
      const dist = Math.sqrt(distSq);
      let nx: number;
      let ny: number;
      if (dist > 1e-4) {
        nx = dx / dist;
        ny = dy / dist;
      } else {
        nx = -e.facingX;
        ny = -e.facingY;
        const nlen = Math.hypot(nx, ny) || 1;
        nx /= nlen;
        ny /= nlen;
      }
      const overlap = rr - dist;
      const push = overlap + ENEMY_CONTACT_SEPARATION_PAD;
      e.x += nx * push;
      e.y += ny * push;
      const resolved = resolveCircleWithObstacles(e.x, e.y, e.radius, this.obstacles);
      e.x = resolved.x;
      e.y = resolved.y;
      this._clampEnemyInWorld(e);

      if (this.gameTime - e.lastHitPlayerAt < CONTACT_DAMAGE_INTERVAL) {
        continue;
      }
      e.lastHitPlayerAt = this.gameTime;
      this.playerHp -= e.contactDamage;
      if (this.playerHp <= 0) {
        this.playerHp = 0;
        this.gameOver = true;
        this.paused = true;
        return;
      }
    }
  }

  /** 距离小于拾取半径则吸收经验并可能触发升级 */
  private _pickupGems(): void {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i]!;
      const dx = g.x - this.playerX;
      const dy = g.y - this.playerY;
      const reach = this.pickupRadius + GEM_RADIUS;
      if (dx * dx + dy * dy <= reach * reach) {
        this.xp += g.value;
        this.gems.splice(i, 1);
        this._checkLevelUpFromXp();
      }
    }
  }

  /** 飞出地图较大边距的子弹删除，避免数组无限增长 */
  private _pruneOffMapBullets(): void {
    const margin = 80;
    const m = WORLD_SIZE;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!;
      if (b.x < -margin || b.y < -margin || b.x > m + margin || b.y > m + margin) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private _pruneEnemyProjectiles(): void {
    const margin = 120;
    const m = WORLD_SIZE;
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i]!;
      if (p.x < -margin || p.y < -margin || p.x > m + margin || p.y > m + margin) {
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }
}
