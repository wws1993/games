import {
  CONTACT_DAMAGE_INTERVAL,
  GEM_RADIUS,
  GEM_XP_VALUE,
  PLAYER_BASE_MAX_HP,
  PLAYER_BASE_PICKUP_RADIUS,
  PLAYER_BASE_SPEED,
  PLAYER_MOVE_SCALE,
  PLAYER_RADIUS,
  RIFLE_BASE_DAMAGE,
  RIFLE_BULLET_RADIUS,
  RIFLE_BULLET_SPEED,
  RIFLE_COOLDOWN_SEC,
  SPAWN_INTERVAL_START_SEC,
  WORLD_OBSTACLE_COUNT,
  WORLD_SIZE,
  WORLD_SPAWN_CLEAR_RADIUS,
  xpToReachNextLevel,
} from './constants';
import { playerBulletBlockedByObstacles, resolveCircleWithObstacles } from './collision';
import { generateObstacles } from './obstacleGen';
import { difficultyMultiplier, ENEMY_DEFS, pickSpawnKind, spawnIntervalForTime } from './enemyDefs';
import type { EnemyKind } from './enemyDefs';
import type { Bullet, Enemy, EnemyProjectile, LevelUpChoiceId, MoveInput, Obstacle, XpGem } from './types';

/** 核心战斗与成长状态机：无 Pixi 依赖，供 `GameScreen` 每帧 `step` 驱动 */
export class SurvivorGameModel {
  /** 玩家世界坐标 X */
  public playerX = 0;

  /** 玩家世界坐标 Y */
  public playerY = 0;

  /** 当前生命 */
  public playerHp = PLAYER_BASE_MAX_HP;

  /** 最大生命 */
  public playerMaxHp = PLAYER_BASE_MAX_HP;

  /** 全局伤害倍率（升级 +10% 累乘） */
  public damageMultiplier = 1;

  /** 移速倍率（升级 +5% 累乘） */
  public moveSpeedMultiplier = 1;

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

  /** 是否已阵亡 */
  public gameOver = false;

  public readonly enemies: Enemy[] = [];

  public readonly bullets: Bullet[] = [];

  /** 敌机枪弹与炮弹 */
  public readonly enemyProjectiles: EnemyProjectile[] = [];

  public readonly gems: XpGem[] = [];

  /** 静态矩形障碍：挡人、挡怪、挡玩家普通子弹；不挡 `ignoresObstacles` 弹体 */
  public readonly obstacles: Obstacle[] = [];

  private _nextEnemyId = 1;

  /**
   * 重置新一局：地图中心出生、清空实体、时间归零
   */
  public reset(): void {
    const half = WORLD_SIZE * 0.5;
    this.playerX = half;
    this.playerY = half;
    this.playerHp = PLAYER_BASE_MAX_HP;
    this.playerMaxHp = PLAYER_BASE_MAX_HP;
    this.damageMultiplier = 1;
    this.moveSpeedMultiplier = 1;
    this.pickupRadius = PLAYER_BASE_PICKUP_RADIUS;
    this.level = 1;
    this.xp = 0;
    this.gameTime = 0;
    this.rifleCooldown = 0;
    this.spawnTimer = 0.5;
    this.spawnInterval = SPAWN_INTERVAL_START_SEC;
    this.paused = false;
    this.awaitingLevelUp = false;
    this.gameOver = false;
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.enemyProjectiles.length = 0;
    this.gems.length = 0;
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

    this.gameTime += dt;
    this.spawnInterval = spawnIntervalForTime(this.gameTime);

    this._spawnTick(dt);
    this._playerMove(dt, input);
    this._clampPlayerToMap();
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
    this._pickupGems();
    this._pruneOffMapBullets();
    this._pruneEnemyProjectiles();
  }

  /**
   * 应用三选一升级并关闭暂停；若经验仍够连续升级则再次进入弹窗
   * @param id - 选项类型
   */
  public applyLevelUpChoice(id: LevelUpChoiceId): void {
    if (!this.awaitingLevelUp) {
      return;
    }
    if (id === 'damage') {
      this.damageMultiplier *= 1.1;
    } else if (id === 'moveSpeed') {
      this.moveSpeedMultiplier *= 1.05;
    } else {
      this.playerMaxHp += 10;
      this.playerHp += 10;
    }
    this.awaitingLevelUp = false;
    this.paused = false;
    this._checkLevelUpFromXp();
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
    }
  }

  private _spawnTick(dt: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) {
      return;
    }
    this.spawnTimer += this.spawnInterval;
    const kind = pickSpawnKind(this.gameTime);
    this._spawnEnemyAtEdge(kind);
  }

  /** 在地图边界随机边生成指定兵种，属性乘当前难度倍率 */
  private _spawnEnemyAtEdge(kind: EnemyKind): void {
    const def = ENEMY_DEFS[kind];
    const mul = difficultyMultiplier(this.gameTime);
    const r = def.radius;
    const m = WORLD_SIZE;
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = Math.random() * m;
      y = -r;
    } else if (edge === 1) {
      x = m + r;
      y = Math.random() * m;
    } else if (edge === 2) {
      x = Math.random() * m;
      y = m + r;
    } else {
      x = -r;
      y = Math.random() * m;
    }

    const hp = def.baseHp * mul;
    const contactDamage = def.contactDamage * mul;
    const gemValue = Math.max(1, Math.round(GEM_XP_VALUE * def.gemMultiplier));

    let ranged: Enemy['ranged'];
    let rangedCd = 0;
    if (def.ranged) {
      const rd = def.ranged.damage * mul;
      ranged = {
        type: def.ranged.type,
        damage: rd,
        interval: def.ranged.cooldown,
        projSpeed: def.ranged.projSpeed,
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
      moveSpeed: def.speed,
      contactDamage,
      gemValue,
      lastHitPlayerAt: -1,
      rangedCd,
      ranged,
    });
  }

  /** 摇杆死区：低于此模长则改读键盘，避免漂移 */
  private static readonly _ANALOG_DEADZONE = 0.14;

  /** 八方向或模拟向量归一化后乘以设计移速与倍率 */
  private _playerMove(dt: number, input: MoveInput): void {
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
      return;
    }
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const speed = PLAYER_BASE_SPEED * PLAYER_MOVE_SCALE * this.moveSpeedMultiplier;
    this.playerX += dx * speed * dt;
    this.playerY += dy * speed * dt;
  }

  private _clampPlayerToMap(): void {
    const r = PLAYER_RADIUS;
    const m = WORLD_SIZE;
    this.playerX = Math.min(m - r, Math.max(r, this.playerX));
    this.playerY = Math.min(m - r, Math.max(r, this.playerY));
  }

  /** 玩家圆与障碍穿透分离 */
  private _resolvePlayerVsObstacles(): void {
    const p = resolveCircleWithObstacles(this.playerX, this.playerY, PLAYER_RADIUS, this.obstacles);
    this.playerX = p.x;
    this.playerY = p.y;
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

  /** 冷却结束则朝最近敌人发射一颗子弹 */
  private _rifleTick(dt: number): void {
    this.rifleCooldown -= dt;
    if (this.rifleCooldown > 0) {
      return;
    }
    let best: Enemy | undefined;
    let bestD2 = Infinity;
    for (const e of this.enemies) {
      const dx = e.x - this.playerX;
      const dy = e.y - this.playerY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    if (!best) {
      return;
    }
    const dx = best.x - this.playerX;
    const dy = best.y - this.playerY;
    const dist = Math.hypot(dx, dy) || 1;
    const vx = (dx / dist) * RIFLE_BULLET_SPEED;
    const vy = (dy / dist) * RIFLE_BULLET_SPEED;
    this.bullets.push({
      x: this.playerX,
      y: this.playerY,
      vx,
      vy,
      damage: RIFLE_BASE_DAMAGE * this.damageMultiplier,
    });
    this.rifleCooldown = RIFLE_COOLDOWN_SEC;
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
      e.x += (dx / dist) * e.moveSpeed * dt;
      e.y += (dy / dist) * e.moveSpeed * dt;
      const p = resolveCircleWithObstacles(e.x, e.y, e.radius, this.obstacles);
      e.x = p.x;
      e.y = p.y;
    }
  }

  /** 机枪兵 / 炮兵冷却结束向玩家方向开火 */
  private _enemyRangedTick(dt: number): void {
    for (const e of this.enemies) {
      if (!e.ranged) {
        continue;
      }
      e.rangedCd -= dt;
      if (e.rangedCd > 0) {
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

  /** 玩家步枪弹与敌人：半径按兵种 */
  private _bulletEnemyHits(): void {
    outer: for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!;
      for (const e of this.enemies) {
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.radius + RIFLE_BULLET_RADIUS;
        if (dx * dx + dy * dy <= rr * rr) {
          e.hp -= b.damage;
          this.bullets.splice(i, 1);
          if (e.hp <= 0) {
            this._onEnemyKilled(e);
          }
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
    this.gems.push({ x: e.x, y: e.y, value: e.gemValue });
  }

  /** 接触伤害：按兵种半径与伤害 */
  private _enemyPlayerContact(): void {
    for (const e of this.enemies) {
      const dx = e.x - this.playerX;
      const dy = e.y - this.playerY;
      const rr = e.radius + PLAYER_RADIUS;
      if (dx * dx + dy * dy > rr * rr) {
        continue;
      }
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
