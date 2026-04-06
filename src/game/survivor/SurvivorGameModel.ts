import {
  CONTACT_DAMAGE_INTERVAL,
  ENEMY_CONTACT_SEPARATION_PAD,
  PLAYER_HURT_INVINCIBLE_BASE_SEC,
  CHEST_RADIUS,
  CHEST_LIFETIME_SEC,
  CHEST_SPAWN_INTERVAL_SEC,
  GEAR_CHEST_DROP_BASE_CHANCE,
  GEAR_CHEST_DROP_LEVEL_COEFF,
  GEAR_CHEST_DROP_MAX_CHANCE,
  GEM_MAX_ON_FIELD,
  GEM_MERGE_RADIUS,
  GEM_RADIUS,
  GEM_XP_VALUE,
  luckCritChanceBonusFromLuckMult,
  PLAYER_BASE_MAX_HP,
  PLAYER_BASE_PICKUP_RADIUS,
  ENEMY_ANIM_PHASE_BASE,
  ENEMY_ANIM_PHASE_PER_MOVE_SPEED,
  PLAYER_BASE_SPEED,
  PLAYER_MOVE_SCALE,
  PLAYER_DASH_BASE_COOLDOWN_SEC,
  PLAYER_DASH_BASE_DURATION_SEC,
  PLAYER_DASH_REL_SPEED,
  MELEE_SWING_VISUAL_SEC,
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
  PLAYER_MAX_LEVEL,
  xpToReachNextLevel,
} from './constants';
import {
  circleAabbOverlap,
  obstaclePlacementValid,
  resolveBulletEnemyCircleBounce,
  resolveBulletObstacleBounce,
  pushCircleOutOfAabb,
  resolveCircleWithObstacles,
} from './collision';
import { generateObstacles } from './obstacleGen';
import { getSpawnBatchSize, getSpawnFormation, type EnemySpawnFormation } from '../config/enemyConfig';
import {
  CHEST_BUFF_DEFS,
  pickRandomChestBuffKind,
  type ChestBuffKind,
} from '../config/chestBuffs';
import type { PurpleChestBundle } from '../config/gearAffixConfig';
import {
  aggregatePurpleProfileBonuses,
  emptyPurpleProfileBonuses,
  type PurpleProfileBonuses,
} from '../config/purpleGearBonuses';
import { DEFAULT_PLAYER_WEAPON_KIND } from '../config/playerWeaponsConfig';
import {
  playChestPickupSfx,
  playGemPickupSfx,
  playMeleeSwingSfx,
  playPlayerHurtSfx,
  playRifleShootSfx,
} from '../audio/gameAudio';
import {
  applyPurpleChestLoot,
  getEquippedPurplePiecesOrdered,
  getSelectedWeaponCosmetic,
  getUnlockedWeaponKindsOrdered,
  loadAchievementSave,
} from '../meta/achievementStore';
import {
  PLAYER_WEAPON_DEFS,
  PLAYER_WEAPON_ORDER,
  type PlayerWeaponDef,
  type PlayerWeaponKind,
} from '../config/playerWeaponsConfig';
import {
  LEVEL_UP_PUSH_CARD_ID,
  LEVEL_UP_REVIVE_CARD_ID,
  levelUpCardTemplates,
  levelUpPickCount,
  levelUpTemplateMatchesWeaponCategory,
  materializeLevelUpCard,
  type LevelUpCardDef,
  type LevelUpCardTemplate,
} from '../config/levelUpCardsConfig';
import type { GameModeId } from '../config/gameModeConfig';
import { survivorBalance } from '../config/survivorBalance';
import { getDevBonusMaxHp, getDevBonusRifleAttackSpeed } from '../meta/devRuntime';
import {
  DEFAULT_PLAYABLE_HERO_ID,
  getPlayableHeroWeaponPassive,
  type PlayableHeroId,
  type PlayableHeroWeaponPassive,
} from '../meta/playableHeroConfig';
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

  /** 上一有效移动方向 X（归一化），供躯干左右镜像；无移动时保持最后值 */
  public playerFacingX = 1;

  /** 上一有效移动方向 Y（归一化） */
  public playerFacingY = 0;

  /** 步枪指向 X（归一化）：每帧朝射程内最近敌人；无目标时与 `playerFacing` 一致 */
  public playerAimX = 1;

  /** 步枪指向 Y（归一化） */
  public playerAimY = 0;

  /** 本帧是否产生位移输入（用于 walk / idle 表现） */
  public playerMoving = false;

  /** 冲刺冷却剩余（秒）；为 0 时可再次冲刺 */
  public dashCooldownLeft = 0;

  /** 当前是否处于冲刺位移段（用于表现等） */
  public get playerDashing(): boolean {
    return this._dashBurstLeft > 1e-6;
  }

  /** 冲刺剩余时间（秒） */
  private _dashBurstLeft = 0;

  /** 冲刺方向单位向量 */
  private _dashDirX = 1;

  private _dashDirY = 0;

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

  /** `PLAYER_WEAPON_ORDER` 全局下标，与 `equippedWeaponKind` 一致；Q/E 在 `_ownedWeaponsOrdered` 内循环时同步为对应全局下标 */
  public playerWeaponIndex = 0;

  /** 当前局玩法角色 id（`syncWeaponLoadoutFromProfile` 从档案写入） */
  public playableHeroId: PlayableHeroId = DEFAULT_PLAYABLE_HERO_ID;

  /** 局外枪皮可选覆盖弹丸着色；null 时用当前武器表 `bulletColor` */
  public cosmeticBulletColor: number | null = null;

  /** 当前武器键（与 `PLAYER_WEAPON_DEFS` 一致） */
  public get equippedWeaponKind(): PlayerWeaponKind {
    return PLAYER_WEAPON_ORDER[this.playerWeaponIndex]!;
  }

  /** 当前局内可用主武器种类数（仅大于 1 时显示切枪触摸键） */
  public get ownedWeaponCount(): number {
    return this._ownedWeaponsOrdered.length;
  }

  /** 当前武器弹匣内剩余弹量（一发对应一次齐射） */
  public get rifleMagAmmo(): number {
    return this._weaponMagAmmo[this.equippedWeaponKind] ?? 0;
  }

  /** 当前武器弹匣容量 */
  public get rifleMagazineSize(): number {
    return PLAYER_WEAPON_DEFS[this.equippedWeaponKind].magazineSize;
  }

  /** 步枪暴击率加算池（基础+装备+被动等，**可>1** 供溢出转攻）；命中时再与宝箱/步枪加算/运气/铁血 */
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

  /** 档案九部位紫装词条提供的承伤乘子，与 `chestBuffDamageTakenMult` 相乘后结算弹伤与接触伤 */
  public profileDamageTakenMult = 1;

  /** 升级卡护甲加算：最终承伤再乘 `100/(100+armor)` */
  public armorAdd = 0;

  /** 经验倍率：升级卡、紫装词条等叠乘在 `chestBuffXpGainMult` 上 */
  public expMult = 1;

  /** 影响装备箱额外掉落概率等，乘性并设上限避免爆炸；升级卡「金币」亦叠乘在此 */
  public luckMult = 1;

  /** 拾取距离倍率：`(pickupRadius + 宝箱加算 + 判定半径) * 倍率` */
  public pickupRangeMult = 1;

  /** 步枪吸血加算，与 `chestBuffLifestealRatio` 相加后对命中伤害转治疗 */
  public lifestealAdd = 0;

  /** 闪避率加算 0～1，受击前判定；成功则免伤且不进入无敌帧 */
  public dodgeChanceAdd = 0;

  /** 本局仍拥有一次复活（选过「复活」卡且未消耗） */
  public hasRevive = false;

  /** 已获得「复活」卡时本局三选一池不再出现该模板 */
  private _reviveOfferTaken = false;

  /** 步枪穿透额外次数（加在武器表 `pierceExtra` 上） */
  public projectilePierceAdd = 0;

  /** 接触推开敌人距离倍率 */
  public knockbackMult = 1;

  /** 升级卡秒回，与 `chestBuffHpRegenPerSec` 并行 */
  public regenAdd = 0;

  /**
   * 反伤倍率叠乘；反射量 = 实际掉血 × max(0, thornsDamageMult - 1)；无卡时为 1 不反伤
   */
  public thornsDamageMult = 1;

  /** 步枪子弹速度倍率（叠在武器 `bulletSpeedMult` 上） */
  public rifleBulletSpeedMult = 1;

  /** 击杀敌人固定回血 */
  public killHealAdd = 0;

  /** 弹幕套：步枪齐射额外弹丸（与 `rifleBulletCount`、二连发层数相加） */
  public profileDanmuBulletAdd = 0;

  /** 血契 9 件：击杀回复 = `killHealAdd` + 最大生命 × 本比例 */
  public profileKillHealMaxHpPct = 0;

  /** 冲刺冷却倍率（小于 1 缩短冷却）；冲刺系统接入后读取 */
  public dashCooldownMult = 1;

  /** 子弹反弹次数加算；撞土房或穿透用尽时撞敌人反弹均消耗，见 `Bullet.obstacleBouncesRemaining` */
  public projectileBounceAdd = 0;

  /** 步枪伤害倍率（叠在全局 `damageMultiplier` 与宝箱伤增上） */
  public rifleDamageMult = 1;

  /** 档案紫装词条提供的弹径乘子，叠在武器与金色宝箱上 */
  public profileBulletRadiusMult = 1;

  /** 步枪暴击率加算，与全局暴击率、宝箱暴击加算后封顶 1 */
  public rifleCritChanceAdd = 0;

  /** 步枪换弹速度倍率（越大冷却越短），叠在 `rifleAttackSpeedMult` 上 */
  public rifleReloadSpeedMult = 1;

  /** 冲刺位移速度倍率（冲刺系统接入后读取） */
  public dashSpeedMult = 1;

  /** 受伤后短无敌时长倍率，叠在 `PLAYER_HURT_INVINCIBLE_BASE_SEC` 上 */
  public hurtInvincibleMult = 1;

  /** 玩家生命 ≤30% 时步枪伤害倍率 */
  public lowHpDamageMult = 1;

  /** 暴击命中时额外吸血率（加在基础吸血上） */
  public critLifestealAdd = 0;

  /** 受击无敌截止 `gameTime` */
  private _playerHurtInvincibleUntil = 0;

  /** 当前等级（从 1 开始） */
  public level = 1;

  /** 当前经验（本级内已累积） */
  public xp = 0;

  /** 存活时间（秒） */
  public gameTime = 0;

  /** 步枪冷却剩余（秒）；换弹进行中时不递减 */
  public rifleCooldown = 0;

  /**
   * 当前武器换弹剩余时间（秒）。>0 时不能射击；结束后将当前武器弹匣压满
   */
  public rifleReloadRemaining = 0;

  /** 当前换弹段总时长（秒），与 `rifleReloadRemaining` 同起点；用于 HUD 换弹条进度 */
  public rifleReloadTotalSec = 0;

  /** 近战挥击扇形表现剩余时间（秒）；>0 时 `PlayerWorldVisual` 绘制挥舞扇形 */
  public meleeSwingVisualRemain = 0;

  /** 本次挥击的扇形半角（弧度），与 `_performMeleeSwing` 内 `halfArc` 一致 */
  public meleeSwingArcHalfRad = 0;

  /** 本次挥击的扇形外缘半径（世界单位），与命中用 `mr` 一致 */
  public meleeSwingRangePx = 0;

  /** 各主武器弹匣剩余弹量（与 `PLAYER_WEAPON_ORDER` 键一致） */
  private _weaponMagAmmo: Record<PlayerWeaponKind, number> = {} as Record<PlayerWeaponKind, number>;

  /** 距离下次刷怪（秒） */
  public spawnTimer = 0;

  /** 刷怪间隔（秒），随时间缩短 */
  public spawnInterval = SPAWN_INTERVAL_START_SEC;

  /** 是否因升级弹窗暂停 */
  public paused = false;

  /** 是否因局内打开装备整备层而暂停（与升级弹窗互斥） */
  public manualPaused = false;

  /** 是否等待玩家三选一 */
  public awaitingLevelUp = false;

  /** 当前弹窗展示的升级卡片（由 `materializeLevelUpCard` 按本局等级生成） */
  public readonly pendingLevelUpCards: LevelUpCardDef[] = [];

  /** 是否已阵亡 */
  public gameOver = false;

  /** 本局累计击杀（回首页结算成就时上报） */
  public sessionKills = 0;

  /** 开局由 `GameScreen` 写入，影响 `pickSpawnKind` 权重 */
  public gameMode: GameModeId = 'standard';

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

  /** 最近一次拾取紫箱的九件随机装备（供 HUD 多行或将来详情 UI；新局 `reset` 清空） */
  public lastPurpleChestBundle: PurpleChestBundle | null = null;

  /** 本局每次拾取紫箱的完整掉落（阵亡结算仅用于结算界面统计；装备已在拾取时入库） */
  public readonly sessionPurpleChestBundles: PurpleChestBundle[] = [];

  /** 当前帧宝箱限时增益聚合：由 `_tickChestBuffs` / `_applyChestBuff` 刷新 */
  public chestBuffBulletRadiusMult = 1;

  /** 主角矢量缩放乘子（仅表现） */
  public chestBuffPlayerScaleMult = 1;

  /** 叠在 `moveSpeedMultiplier` 上再乘 */
  public chestBuffMoveSpeedMult = 1;

  /** 受击伤害再乘算 */
  public chestBuffDamageTakenMult = 1;

  /** 叠在暴击率上，与运气/被动等相加；总和可超 1，溢出转攻（见 `_applyPrimaryWeaponDamageToEnemy`） */
  public chestBuffCritChanceBonus = 0;

  /** 拾取圈半径加算 */
  public chestBuffPickupRadiusAdd = 0;

  /** 步枪冷却时间再乘算 */
  public chestBuffRifleCooldownMult = 1;

  /** 步枪单发基础伤害再乘算（叠在 `damageMultiplier` 上） */
  public chestBuffDamageDealtMult = 1;

  /** 秒回复生命 */
  public chestBuffHpRegenPerSec = 0;

  /** 吸收经验宝石时再乘 */
  public chestBuffXpGainMult = 1;

  /** 步枪命中伤害转化为治疗的比例 */
  public chestBuffLifestealRatio = 0;

  /** 未过期的宝箱道具；同 `kind` 再次拾取只刷新 `until` */
  private readonly _activeChestBuffs: { kind: ChestBuffKind; until: number }[] = [];

  /** 宝箱增益列表本帧是否发生变更；仅变更时重算聚合，避免每帧全量遍历 */
  private _chestBuffAggregateDirty = true;

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

  /** 本帧已计算的步枪索敌结果，供瞄准与开火复用，避免同帧重复全量扫描敌人 */
  private _rifleFocusTargetCache: Enemy | undefined = undefined;

  /** `_rifleFocusTargetCache` 是否已在本帧求值（包括求值结果为 `undefined`） */
  private _rifleFocusTargetCached = false;

  private _nextEnemyId = 1;

  /** 局内主武器列表；Q/E 在此列表循环 */
  private _ownedWeaponsOrdered: PlayerWeaponKind[] = [DEFAULT_PLAYER_WEAPON_KIND];

  /** 本局已叠乘的紫装词条聚合，供 `syncGearLoadoutFromProfileMidRun` 卸装 */
  private _appliedPurpleBonuses: PurpleProfileBonuses | null = null;

  /** 档案紫装提供的步枪索敌射程加算（世界单位） */
  public profileRifleRangeAdd = 0;
  /** 紫装穿透几率加总；齐射时一次判定 */
  public profilePierceChanceAdd = 0;
  /** 紫装「低血伤害」乘子，与升级卡 `lowHpDamageMult` 相乘 */
  public profileLowHpDamageMult = 1;
  /** 紫装吸血加算（稀有），与升级卡相加 */
  public profileLifestealAdd = 0;
  /** 宝箱限时增益时长乘子 */
  public profileChestBuffDurationMult = 1;
  /** 幻影：首次受伤抵消比例 */
  public profilePhantomMitigatePct = 0;
  /** 守护者：当前可吸收剩余量 */
  public profileGuardianShield = 0;
  /** 守护者：上限（随装备刷新） */
  public profileGuardianShieldMax = 0;
  /** 二连发层数 */
  public profileDoubleTapStacks = 0;
  /** 击杀溅射层数 */
  public profileShrapnelStacks = 0;
  /** 铁血 9：低血额外暴击率 */
  public profileSetTiexueLowCritAdd = 0;
  /** 首次抵消是否已消耗 */
  private _phantomMitigationUsed = false;

  /**
   * 从本地档案同步拥有列表与当前装备（`GameScreen.prepare` 在 `reset` 后调用）
   */
  public syncWeaponLoadoutFromProfile(): void {
    const save = loadAchievementSave();
    this.playableHeroId = save.selectedPlayableHeroId;
    const kinds = getUnlockedWeaponKindsOrdered(save);
    this._ownedWeaponsOrdered = kinds.length > 0 ? kinds : [DEFAULT_PLAYER_WEAPON_KIND];
    const first = this._ownedWeaponsOrdered[0]!;
    const gi = PLAYER_WEAPON_ORDER.indexOf(first);
    this.playerWeaponIndex = gi >= 0 ? gi : 0;
    const cos = getSelectedWeaponCosmetic(save);
    this.cosmeticBulletColor = cos.bulletColor;
    this._fillWeaponMagsFull();
    this.rifleReloadRemaining = 0;
    this.rifleReloadTotalSec = 0;
  }

  /**
   * 将档案中九部位紫装词条加成写入本局（在 `reset` 与 `syncWeaponLoadoutFromProfile` 之后调用）
   */
  public syncGearLoadoutFromProfile(): void {
    const b = aggregatePurpleProfileBonuses(getEquippedPurplePiecesOrdered());
    this.profileDamageTakenMult = b.damageTakenMult;
    if (b.maxHpAdd > 0) {
      this.playerMaxHp += b.maxHpAdd;
      this.playerHp += b.maxHpAdd;
    }
    this.moveSpeedMultiplier *= b.moveSpeedMult;
    this.critChance = Math.max(0, this.critChance + b.critChanceAdd + b.focusCritChanceAdd);
    this.pickupRadius += b.pickupRadiusAdd;
    this.rifleAttackSpeedMult *= b.rifleAttackSpeedMult;
    this.rifleDamageMult *= b.rifleDamageMult;
    this.profileBulletRadiusMult *= b.bulletRadiusMult;
    this.regenAdd += b.regenAdd;
    this.expMult *= b.expMult;
    this.profileRifleRangeAdd += b.rifleRangeAdd;
    this.luckMult *= b.luckMult;
    this.critOnHitDamageMult *= b.setYexiCritDamageMult;
    this.profilePierceChanceAdd = b.pierceChanceAdd;
    this.profileLowHpDamageMult = b.profileLowHpDamageMult;
    this.lifestealAdd += b.profileLifestealAdd;
    this.profileLifestealAdd = b.profileLifestealAdd;
    this.profileChestBuffDurationMult = b.chestBuffDurationMult;
    this.profilePhantomMitigatePct = b.phantomMitigatePct;
    this.profileGuardianShieldMax = Math.max(0, b.guardianStacks * 22);
    this.profileGuardianShield = this.profileGuardianShieldMax;
    this.profileDoubleTapStacks = b.doubleTapStacks;
    this.profileShrapnelStacks = b.shrapnelStacks;
    this.profileSetTiexueLowCritAdd = b.setTiexueNineLowCritAdd;
    this.thornsDamageMult *= b.profileThornsDamageMult;
    this.profileDanmuBulletAdd = b.profileDanmuBulletAdd;
    this.profileKillHealMaxHpPct = b.profileKillHealMaxHpPct;
    this._appliedPurpleBonuses = { ...b };
  }

  /**
   * 局内整备后重算紫装：先卸旧词条再叠新（与升级卡、宝箱乘子共存）
   */
  public syncGearLoadoutFromProfileMidRun(): void {
    const old = this._appliedPurpleBonuses ?? emptyPurpleProfileBonuses();
    const neu = aggregatePurpleProfileBonuses(getEquippedPurplePiecesOrdered());
    const safeDiv = (cur: number, d: number): number => (Number.isFinite(d) && d > 1e-9 ? cur / d : cur);
    this.profileDamageTakenMult = safeDiv(this.profileDamageTakenMult, old.damageTakenMult) * neu.damageTakenMult;
    const hpOld = old.maxHpAdd;
    if (hpOld > 0) {
      this.playerMaxHp -= hpOld;
      this.playerHp -= hpOld;
    }
    const hpNew = neu.maxHpAdd;
    if (hpNew > 0) {
      this.playerMaxHp += hpNew;
      this.playerHp += hpNew;
    }
    this.playerHp = Math.min(this.playerHp, this.playerMaxHp);
    this.playerHp = Math.max(0, this.playerHp);
    this.moveSpeedMultiplier = safeDiv(this.moveSpeedMultiplier, old.moveSpeedMult) * neu.moveSpeedMult;
    this.critChance -= old.critChanceAdd + old.focusCritChanceAdd;
    this.critChance = Math.max(0, this.critChance + neu.critChanceAdd + neu.focusCritChanceAdd);
    this.pickupRadius -= old.pickupRadiusAdd;
    this.pickupRadius += neu.pickupRadiusAdd;
    this.rifleAttackSpeedMult = safeDiv(this.rifleAttackSpeedMult, old.rifleAttackSpeedMult) * neu.rifleAttackSpeedMult;
    this.rifleDamageMult = safeDiv(this.rifleDamageMult, old.rifleDamageMult) * neu.rifleDamageMult;
    this.profileBulletRadiusMult = safeDiv(this.profileBulletRadiusMult, old.bulletRadiusMult) * neu.bulletRadiusMult;
    this.regenAdd -= old.regenAdd;
    this.regenAdd += neu.regenAdd;
    this.expMult = safeDiv(this.expMult, old.expMult) * neu.expMult;
    this.profileRifleRangeAdd -= old.rifleRangeAdd;
    this.profileRifleRangeAdd += neu.rifleRangeAdd;
    this.luckMult = safeDiv(this.luckMult, old.luckMult) * neu.luckMult;
    this.critOnHitDamageMult = safeDiv(this.critOnHitDamageMult, old.setYexiCritDamageMult) * neu.setYexiCritDamageMult;
    this.profilePierceChanceAdd = neu.pierceChanceAdd;
    this.profileLowHpDamageMult = neu.profileLowHpDamageMult;
    this.lifestealAdd -= old.profileLifestealAdd;
    this.lifestealAdd += neu.profileLifestealAdd;
    this.profileLifestealAdd = neu.profileLifestealAdd;
    this.profileChestBuffDurationMult = neu.chestBuffDurationMult;
    this.profilePhantomMitigatePct = neu.phantomMitigatePct;
    const oldG = Math.max(0, old.guardianStacks * 22);
    const newG = Math.max(0, neu.guardianStacks * 22);
    this.profileGuardianShieldMax = newG;
    this.profileGuardianShield = Math.min(
      newG,
      this.profileGuardianShield + Math.max(0, newG - oldG),
    );
    this.profileDoubleTapStacks = neu.doubleTapStacks;
    this.profileShrapnelStacks = neu.shrapnelStacks;
    this.profileSetTiexueLowCritAdd = neu.setTiexueNineLowCritAdd;
    this.thornsDamageMult = safeDiv(this.thornsDamageMult, old.profileThornsDamageMult) * neu.profileThornsDamageMult;
    this.profileDanmuBulletAdd = neu.profileDanmuBulletAdd;
    this.profileKillHealMaxHpPct = neu.profileKillHealMaxHpPct;
    this._appliedPurpleBonuses = { ...neu };
  }

  /**
   * 重置新一局：地图中心出生、清空实体、时间归零
   */
  public reset(): void {
    const half = WORLD_SIZE * 0.5;
    this.playerX = half;
    this.playerY = half;
    this.playerFacingX = 1;
    this.playerFacingY = 0;
    this.playerAimX = 1;
    this.playerAimY = 0;
    this.playerMoving = false;
    const bonusHp = getDevBonusMaxHp();
    this.playerMaxHp = PLAYER_BASE_MAX_HP + bonusHp;
    this.playerHp = this.playerMaxHp;
    this.damageMultiplier = 1;
    this.moveSpeedMultiplier = 1;
    this.rifleAttackSpeedMult = 1 + getDevBonusRifleAttackSpeed();
    this.rifleBulletCount = 1;
    this.playableHeroId = DEFAULT_PLAYABLE_HERO_ID;
    this._ownedWeaponsOrdered = [DEFAULT_PLAYER_WEAPON_KIND];
    this.playerWeaponIndex = 0;
    this.cosmeticBulletColor = null;
    this.critChance = PLAYER_BASE_CRIT_CHANCE;
    this.critOnHitDamageMult = 1;
    this.canPushObstacles = false;
    this._playerMoveStepX = 0;
    this._playerMoveStepY = 0;
    this._lastFrameDt = 0;
    this._obstaclePushChargeT = 0;
    this._obstaclePushDomKey = null;
    this.pickupRadius = PLAYER_BASE_PICKUP_RADIUS;
    this.profileDamageTakenMult = 1;
    this.armorAdd = 0;
    this.expMult = 1;
    this.luckMult = 1;
    this.pickupRangeMult = 1;
    this.lifestealAdd = 0;
    this.dodgeChanceAdd = 0;
    this.hasRevive = false;
    this._reviveOfferTaken = false;
    this.projectilePierceAdd = 0;
    this.knockbackMult = 1;
    this.regenAdd = 0;
    this.thornsDamageMult = 1;
    this.rifleBulletSpeedMult = 1;
    this.killHealAdd = 0;
    this.profileDanmuBulletAdd = 0;
    this.profileKillHealMaxHpPct = 0;
    this.dashCooldownMult = 1;
    this.projectileBounceAdd = 0;
    this.rifleDamageMult = 1;
    this.profileBulletRadiusMult = 1;
    this.profileRifleRangeAdd = 0;
    this.profilePierceChanceAdd = 0;
    this.profileLowHpDamageMult = 1;
    this.profileLifestealAdd = 0;
    this.profileChestBuffDurationMult = 1;
    this.profilePhantomMitigatePct = 0;
    this.profileGuardianShield = 0;
    this.profileGuardianShieldMax = 0;
    this.profileDoubleTapStacks = 0;
    this.profileShrapnelStacks = 0;
    this.profileSetTiexueLowCritAdd = 0;
    this._phantomMitigationUsed = false;
    this._appliedPurpleBonuses = null;
    this.rifleCritChanceAdd = 0;
    this.rifleReloadSpeedMult = 1;
    this.dashSpeedMult = 1;
    this.hurtInvincibleMult = 1;
    this.lowHpDamageMult = 1;
    this.critLifestealAdd = 0;
    this._playerHurtInvincibleUntil = 0;
    this.dashCooldownLeft = 0;
    this._dashBurstLeft = 0;
    this._dashDirX = 1;
    this._dashDirY = 0;
    this.level = 1;
    this.xp = 0;
    this.gameTime = 0;
    this.rifleCooldown = 0;
    this.rifleReloadRemaining = 0;
    this.rifleReloadTotalSec = 0;
    this.meleeSwingVisualRemain = 0;
    this.meleeSwingArcHalfRad = 0;
    this.meleeSwingRangePx = 0;
    this._fillWeaponMagsFull();
    this.spawnTimer = 0.18;
    this.spawnInterval = SPAWN_INTERVAL_START_SEC;
    this.paused = false;
    this.manualPaused = false;
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
    this.lastPurpleChestBundle = null;
    this.sessionPurpleChestBundles.length = 0;
    this._activeChestBuffs.length = 0;
    this._chestBuffAggregateDirty = true;
    this._recomputeChestBuffAggregates();
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
   * 循环切换主武器（触摸键）；阵亡、暂停、升级三选一时不切换
   * @param delta - -1 上一把、+1 下一把
   */
  public cycleWeapon(delta: number): void {
    if (delta === 0 || this.gameOver || this.paused || this.manualPaused || this.awaitingLevelUp) {
      return;
    }
    this.rifleReloadRemaining = 0;
    this.rifleReloadTotalSec = 0;
    const list = this._ownedWeaponsOrdered;
    if (list.length <= 1) {
      return;
    }
    const cur = this.equippedWeaponKind;
    let i = list.indexOf(cur);
    if (i < 0) {
      i = 0;
    }
    const n = list.length;
    const nextKind = list[(i + delta + n) % n]!;
    const gi = PLAYER_WEAPON_ORDER.indexOf(nextKind);
    this.playerWeaponIndex = gi >= 0 ? gi : 0;
  }

  /**
   * 手动换弹（触摸「换弹」）；未满匣或打空后均可，战术换弹时长按缺弹比例折算
   */
  public requestWeaponReload(): void {
    if (this.gameOver || this.paused || this.manualPaused || this.awaitingLevelUp) {
      return;
    }
    if (PLAYER_WEAPON_DEFS[this.equippedWeaponKind].category === 'melee') {
      return;
    }
    if (this.rifleReloadRemaining > 0) {
      return;
    }
    const w = PLAYER_WEAPON_DEFS[this.equippedWeaponKind];
    const cur = this._weaponMagAmmo[this.equippedWeaponKind] ?? 0;
    if (cur >= w.magazineSize) {
      return;
    }
    this._startMagReloadForEquipped();
  }

  /** 将全表武器弹匣压满（新局 / 档案同步） */
  private _fillWeaponMagsFull(): void {
    for (const k of PLAYER_WEAPON_ORDER) {
      this._weaponMagAmmo[k] = PLAYER_WEAPON_DEFS[k].magazineSize;
    }
  }

  /** 按当前武器缺弹比例开始换弹，乘 `rifleReloadSpeedMult`；近战无读条，仅瞬间满弹 */
  private _startMagReloadForEquipped(): void {
    const w = PLAYER_WEAPON_DEFS[this.equippedWeaponKind];
    if (w.category === 'melee') {
      this._weaponMagAmmo[this.equippedWeaponKind] = w.magazineSize;
      this.rifleReloadRemaining = 0;
      this.rifleReloadTotalSec = 0;
      return;
    }
    const cur = this._weaponMagAmmo[this.equippedWeaponKind] ?? 0;
    if (cur >= w.magazineSize) {
      return;
    }
    const miss = w.magazineSize - cur;
    const frac = miss / w.magazineSize;
    const hp = this._heroWeaponPassive();
    const rlm =
      (Number.isFinite(this.rifleReloadSpeedMult) && this.rifleReloadSpeedMult > 0 ? this.rifleReloadSpeedMult : 1) *
      hp.reloadSpeedMul;
    this.rifleReloadRemaining = (w.reloadSec * frac) / rlm;
    this.rifleReloadTotalSec = this.rifleReloadRemaining;
  }

  /**
   * 单帧推进：输入移动、刷怪、索敌射击、弹道、碰撞、拾取与升级检测
   * @param dt - 帧间隔（秒）
   * @param input - 键盘合成方向
   */
  public step(dt: number, input: MoveInput): void {
    if (this.gameOver || this.paused || this.manualPaused) {
      return;
    }

    this._rifleFocusTargetCache = undefined;
    this._rifleFocusTargetCached = false;
    this._lastFrameDt = dt;
    this.gameTime += dt;
    if (this.meleeSwingVisualRemain > 0) {
      this.meleeSwingVisualRemain = Math.max(0, this.meleeSwingVisualRemain - dt);
    }
    this._pruneWorldChestsExpired();
    this._tickChestBuffs();
    const scale = survivorBalance.spawn.intervalScale;
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    this.spawnInterval = Math.max(0.04, spawnIntervalForTime(this.gameTime) * safeScale);

    this._spawnTick(dt);
    this._playerMove(dt, input);
    this._clampPlayerToMap();
    this._updateObstaclePushCharge(dt);
    this._resolvePlayerVsObstacles();
    this._updatePlayerAimDirection();
    this._rifleTick(dt);
    this._integrateBullets(dt);
    this._cullPlayerBulletsInObstacles();
    this._integrateEnemies(dt);
    this._enemyRangedTick(dt);
    this._integrateEnemyProjectiles(dt);
    this._enemyProjectileHits();
    this._bulletEnemyHits();
    this._enemyPlayerContact();
    this._applyChestBuffHpRegen(dt);
    this._applyLevelUpCardRegen(dt);
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

  /** 将单张升级卡数值写入局内状态（升级三选一；不触暂停） */
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
    } else if (ef.kind === 'critOnHitDamageMult') {
      const f = ef.factor;
      this.critOnHitDamageMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'pushObstacles') {
      this.canPushObstacles = true;
    } else if (ef.kind === 'armorAdd') {
      this.armorAdd += ef.add;
    } else if (ef.kind === 'expMult') {
      const f = ef.factor;
      this.expMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'coinMult') {
      const f = ef.factor;
      this.luckMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'luckMult') {
      const f = ef.factor;
      this.luckMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'pickupRangeMult') {
      const f = ef.factor;
      this.pickupRangeMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'lifestealAdd') {
      this.lifestealAdd += ef.add;
    } else if (ef.kind === 'dodgeChanceAdd') {
      this.dodgeChanceAdd = Math.min(1, Math.max(0, this.dodgeChanceAdd + ef.add));
    } else if (ef.kind === 'revive') {
      this.hasRevive = true;
      this._reviveOfferTaken = true;
    } else if (ef.kind === 'projectilePierceAdd') {
      this.projectilePierceAdd += ef.add;
    } else if (ef.kind === 'knockbackMult') {
      const f = ef.factor;
      this.knockbackMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'regenAdd') {
      this.regenAdd += ef.add;
    } else if (ef.kind === 'thornsDamageMult') {
      const f = ef.factor;
      this.thornsDamageMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'rifleBulletSpeedMult') {
      const f = ef.factor;
      this.rifleBulletSpeedMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'killHealAdd') {
      this.killHealAdd += ef.add;
    } else if (ef.kind === 'dashCooldownMult') {
      const f = ef.factor;
      this.dashCooldownMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'projectileBounceAdd') {
      this.projectileBounceAdd += ef.add;
    } else if (ef.kind === 'rifleDamageMult') {
      const f = ef.factor;
      this.rifleDamageMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'rifleReloadSpeedMult') {
      const f = ef.factor;
      this.rifleReloadSpeedMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'dashSpeedMult') {
      const f = ef.factor;
      this.dashSpeedMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'hurtInvincibleMult') {
      const f = ef.factor;
      this.hurtInvincibleMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'lowHpDamageMult') {
      const f = ef.factor;
      this.lowHpDamageMult *= Number.isFinite(f) && f > 0 ? f : 1;
    } else if (ef.kind === 'critLifestealAdd') {
      this.critLifestealAdd += ef.add;
    }
  }

  /** 与 `_rollLevelUpCards` 相同过滤规则（推箱子/复活一次、按主武器近战/射击池互斥，见 `levelUpTemplateMatchesWeaponCategory`） */
  private _eligibleLevelUpPool(): LevelUpCardTemplate[] {
    const weaponCat =
      PLAYER_WEAPON_DEFS[this.equippedWeaponKind].category === 'melee' ? 'melee' : 'ranged';
    return levelUpCardTemplates.filter((c) => {
      if (c.id === LEVEL_UP_PUSH_CARD_ID && this.canPushObstacles) {
        return false;
      }
      if (c.id === LEVEL_UP_REVIVE_CARD_ID && this._reviveOfferTaken) {
        return false;
      }
      if (!levelUpTemplateMatchesWeaponCategory(c, weaponCat)) {
        return false;
      }
      return true;
    });
  }

  /** `despawnAt` 到期的地图宝箱移除 */
  private _pruneWorldChestsExpired(): void {
    const t = this.gameTime;
    for (let i = this.chests.length - 1; i >= 0; i--) {
      if (t >= this.chests[i]!.despawnAt) {
        this.chests.splice(i, 1);
      }
    }
  }

  /** 移除过期宝箱增益并刷新聚合字段 */
  private _tickChestBuffs(): void {
    const t = this.gameTime;
    const arr = this._activeChestBuffs;
    let removed = false;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i]!.until <= t) {
        arr.splice(i, 1);
        removed = true;
      }
    }
    if (removed) {
      this._chestBuffAggregateDirty = true;
    }
    if (this._chestBuffAggregateDirty) {
      this._recomputeChestBuffAggregates();
      this._chestBuffAggregateDirty = false;
    }
  }

  /** 由 `_activeChestBuffs` 重算本帧可用的乘子与加算 */
  private _recomputeChestBuffAggregates(): void {
    let bulletM = 1;
    let playerSc = 1;
    let moveM = 1;
    let dmgTakenM = 1;
    let critAdd = 0;
    let pickupAdd = 0;
    let rifleCdM = 1;
    let dmgDealM = 1;
    let regen = 0;
    let xpM = 1;
    let lifeSteal = 0;
    for (const row of this._activeChestBuffs) {
      const d = CHEST_BUFF_DEFS[row.kind];
      if (d.bulletRadiusMult != null) {
        bulletM *= d.bulletRadiusMult;
      }
      if (d.playerScaleMult != null) {
        playerSc *= d.playerScaleMult;
      }
      if (d.moveSpeedMult != null) {
        moveM *= d.moveSpeedMult;
      }
      if (d.damageTakenMult != null) {
        dmgTakenM *= d.damageTakenMult;
      }
      if (d.critChanceAdd != null) {
        critAdd += d.critChanceAdd;
      }
      if (d.pickupRadiusAdd != null) {
        pickupAdd += d.pickupRadiusAdd;
      }
      if (d.rifleCooldownMult != null) {
        rifleCdM *= d.rifleCooldownMult;
      }
      if (d.damageDealtMult != null) {
        dmgDealM *= d.damageDealtMult;
      }
      if (d.hpRegenPerSec != null) {
        regen += d.hpRegenPerSec;
      }
      if (d.xpGainMult != null) {
        xpM *= d.xpGainMult;
      }
      if (d.lifestealRatio != null) {
        lifeSteal += d.lifestealRatio;
      }
    }
    const pos = (x: number, fb: number): number =>
      Number.isFinite(x) && x > 0 ? x : fb;
    this.chestBuffBulletRadiusMult = pos(bulletM, 1);
    this.chestBuffPlayerScaleMult = pos(playerSc, 1);
    this.chestBuffMoveSpeedMult = pos(moveM, 1);
    this.chestBuffDamageTakenMult = pos(dmgTakenM, 1);
    this.chestBuffCritChanceBonus = Number.isFinite(critAdd) ? Math.max(0, critAdd) : 0;
    this.chestBuffPickupRadiusAdd = Number.isFinite(pickupAdd) ? Math.max(0, pickupAdd) : 0;
    this.chestBuffRifleCooldownMult = pos(rifleCdM, 1);
    this.chestBuffDamageDealtMult = pos(dmgDealM, 1);
    this.chestBuffHpRegenPerSec = Number.isFinite(regen) ? Math.max(0, regen) : 0;
    this.chestBuffXpGainMult = pos(xpM, 1);
    this.chestBuffLifestealRatio = Number.isFinite(lifeSteal) ? Math.max(0, lifeSteal) : 0;
  }

  /** 拾取宝箱道具：同种刷新持续时间 */
  private _applyChestBuff(kind: ChestBuffKind): void {
    const def = CHEST_BUFF_DEFS[kind];
    const durM =
      Number.isFinite(this.profileChestBuffDurationMult) && this.profileChestBuffDurationMult > 0
        ? this.profileChestBuffDurationMult
        : 1;
    const until = this.gameTime + def.durationSec * durM;
    const arr = this._activeChestBuffs;
    const idx = arr.findIndex((r) => r.kind === kind);
    if (idx >= 0) {
      arr[idx]!.until = until;
    } else {
      arr.push({ kind, until });
    }
    this._chestBuffAggregateDirty = true;
    this._recomputeChestBuffAggregates();
    this._chestBuffAggregateDirty = false;
  }

  /** 野战绷带等持续回复 */
  private _applyChestBuffHpRegen(dt: number): void {
    const r = this.chestBuffHpRegenPerSec;
    if (r <= 0 || !Number.isFinite(r)) {
      return;
    }
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + r * dt);
  }

  /** 升级卡「慢慢回血」等：与宝箱秒回并行；`regenAdd` 为各卡数值之和（秒），多张叠加由 `levelUpCardsConfig` 控上限 */
  private _applyLevelUpCardRegen(dt: number): void {
    const r = this.regenAdd;
    if (r <= 0 || !Number.isFinite(r)) {
      return;
    }
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + r * dt);
  }

  /** 拾取圈 + 宝石/箱判定半径，乘 `pickupRangeMult` */
  private _pickupInteractionReach(extra: number): number {
    const base = this.pickupRadius + this.chestBuffPickupRadiusAdd + extra;
    const m = Number.isFinite(this.pickupRangeMult) && this.pickupRangeMult > 0 ? this.pickupRangeMult : 1;
    return base * m;
  }

  /** 到达 `gameTime` 里程碑时在玩家附近环带刷一只限时宝箱；大 dt 按间隔递进避免漏刷 */
  private _chestSpawnTick(): void {
    const m = WORLD_SIZE;
    const margin = CHEST_RADIUS + 8;
    const minChestSepSq = 95 * 95;
    const ringMin = 72;
    const ringMax = 145;
    while (this.gameTime >= this._nextChestSpawnGameTime) {
      this._nextChestSpawnGameTime += CHEST_SPAWN_INTERVAL_SEC;
      for (let attempt = 0; attempt < 72; attempt++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = ringMin + Math.random() * (ringMax - ringMin);
        let rx = this.playerX + Math.cos(ang) * dist;
        let ry = this.playerY + Math.sin(ang) * dist;
        rx = Math.min(m - margin, Math.max(margin, rx));
        ry = Math.min(m - margin, Math.max(margin, ry));
        const sp = this._spawnPositionClearOfObstacles(rx, ry, CHEST_RADIUS);
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
        this.chests.push({
          x: sp.x,
          y: sp.y,
          despawnAt: this.gameTime + CHEST_LIFETIME_SEC,
          chestKind: 'buff',
        });
        break;
      }
    }
  }

  /** 进入拾取范围则移除宝箱并应用随机限时道具（不弹三选一） */
  private _pickupChests(): void {
    const reach = this._pickupInteractionReach(CHEST_RADIUS);
    const reachSq = reach * reach;
    for (let i = this.chests.length - 1; i >= 0; i--) {
      const ch = this.chests[i]!;
      const dx = ch.x - this.playerX;
      const dy = ch.y - this.playerY;
      if (dx * dx + dy * dy > reachSq) {
        continue;
      }
      this.chests.splice(i, 1);
      playChestPickupSfx();
      if (ch.chestKind === 'gear') {
        const lv = ch.monsterLevel ?? 1;
        const r = applyPurpleChestLoot(lv);
        this.lastPurpleChestBundle = r.bundle;
        this.sessionPurpleChestBundles.push(r.bundle);
        this.chestToastTitle = r.toastFullText;
        this.chestToastRemain = 6;
      } else {
        const kind = pickRandomChestBuffKind();
        const def = CHEST_BUFF_DEFS[kind];
        this._applyChestBuff(kind);
        this.chestToastTitle = `${def.title} · ${def.durationSec}s`;
        this.chestToastRemain = 3.4;
      }
      this._checkLevelUpFromXp();
    }
  }

  /** 本级升到下一级所需经验；已达 `PLAYER_MAX_LEVEL` 时为 0 */
  public get xpToNext(): number {
    return xpToReachNextLevel(this.level);
  }

  /** 经验跨多级时仅弹一次窗，剩余经验保留至确认后再 `applyLevelUpChoice` 链式检测 */
  private _checkLevelUpFromXp(): void {
    if (this.awaitingLevelUp) {
      return;
    }
    if (this.level >= PLAYER_MAX_LEVEL) {
      return;
    }
    const need = xpToReachNextLevel(this.level);
    if (need <= 0) {
      return;
    }
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
    const templates = this._eligibleLevelUpPool();
    for (let i = templates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [templates[i], templates[j]] = [templates[j]!, templates[i]!];
    }
    const lv = Math.max(1, this.level);
    const n = Math.min(levelUpPickCount, templates.length);
    for (let k = 0; k < n; k++) {
      this.pendingLevelUpCards.push(materializeLevelUpCard(templates[k]!, lv));
    }
  }

  private _spawnTick(dt: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) {
      return;
    }
    this.spawnTimer += this.spawnInterval;
    const kind = pickSpawnKind(this.gameTime, this.gameMode);
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

    const eliteCfg = survivorBalance.enemy.elite;
    const isElite =
      Number.isFinite(eliteCfg.spawnChance) &&
      eliteCfg.spawnChance > 0 &&
      Math.random() < eliteCfg.spawnChance;
    const hpMul = isElite && Number.isFinite(eliteCfg.hpMult) && eliteCfg.hpMult > 0 ? eliteCfg.hpMult : 1;
    const atkMul =
      isElite && Number.isFinite(eliteCfg.attackMult) && eliteCfg.attackMult > 0 ? eliteCfg.attackMult : 1;

    let hp = def.baseHp * mul * hpMul;
    let contactDamage = def.contactDamage * mul * atkMul;
    const gemValue = Math.max(1, Math.round(GEM_XP_VALUE * def.gemMultiplier));

    let fvx = this.playerX - x;
    let fvy = this.playerY - y;
    const fl = Math.hypot(fvx, fvy) || 1;
    fvx /= fl;
    fvy /= fl;

    let ranged: Enemy['ranged'];
    let rangedCd = 0;
    if (def.ranged) {
      const rd = def.ranged.damage * mul * atkMul;
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

    const enemyLevel = Math.max(1, Math.floor(this.gameTime / 60) + 1);

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
      ignoresObstacles: def.ignoresObstacles === true,
      level: enemyLevel,
      isElite: isElite ? true : undefined,
    });
  }

  /** 摇杆死区：低于此模长则改读键盘，避免漂移 */
  private static readonly _ANALOG_DEADZONE = 0.14;

  /** 摇杆/键盘合成归一化方向；无有效输入返回 null */
  private _normalizedMoveDirFromInput(input: MoveInput): { x: number; y: number } | null {
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
      return null;
    }
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len };
  }

  /** 当前玩法角色与主武器绑定的被动乘区（攻速/换弹/移速/伤害/暴击） */
  private _heroWeaponPassive(): PlayableHeroWeaponPassive {
    return getPlayableHeroWeaponPassive(this.playableHeroId, this.equippedWeaponKind);
  }

  /** 普通行走世界速度（单位/秒） */
  private _walkSpeedWorldPerSec(): number {
    const hp = this._heroWeaponPassive();
    return (
      PLAYER_BASE_SPEED *
      PLAYER_MOVE_SCALE *
      this.moveSpeedMultiplier *
      this.chestBuffMoveSpeedMult *
      hp.moveSpeedMul
    );
  }

  /**
   * 本帧开始冲刺：方向优先当前输入，否则用 `playerFacing`；并写入冷却与持续时间
   */
  private _tryStartDash(input: MoveInput): void {
    const dir = this._normalizedMoveDirFromInput(input);
    let nx: number;
    let ny: number;
    if (dir) {
      nx = dir.x;
      ny = dir.y;
    } else {
      const fx = this.playerFacingX;
      const fy = this.playerFacingY;
      const fl = Math.hypot(fx, fy);
      if (fl > 1e-4) {
        nx = fx / fl;
        ny = fy / fl;
      } else {
        nx = 1;
        ny = 0;
      }
    }
    this._dashDirX = nx;
    this._dashDirY = ny;
    const dcm = Number.isFinite(this.dashCooldownMult) && this.dashCooldownMult > 0 ? this.dashCooldownMult : 1;
    this.dashCooldownLeft = PLAYER_DASH_BASE_COOLDOWN_SEC * dcm;
    this._dashBurstLeft = PLAYER_DASH_BASE_DURATION_SEC;
  }

  /** 八方向或模拟向量归一化后乘以设计移速；冲刺段覆盖普通行走并积分位移 */
  private _playerMove(dt: number, input: MoveInput): void {
    this._playerMoveStepX = 0;
    this._playerMoveStepY = 0;
    const walk = this._walkSpeedWorldPerSec();

    if (this._dashBurstLeft <= 1e-6 && input.dash && this.dashCooldownLeft <= 0) {
      this._tryStartDash(input);
    }

    if (this._dashBurstLeft > 1e-6) {
      const stepDt = Math.min(dt, this._dashBurstLeft);
      const dsm = Number.isFinite(this.dashSpeedMult) && this.dashSpeedMult > 0 ? this.dashSpeedMult : 1;
      const spd = walk * PLAYER_DASH_REL_SPEED * dsm;
      const sx = this._dashDirX * spd * stepDt;
      const sy = this._dashDirY * spd * stepDt;
      this.playerX += sx;
      this.playerY += sy;
      this._playerMoveStepX = sx;
      this._playerMoveStepY = sy;
      this.playerFacingX = this._dashDirX;
      this.playerFacingY = this._dashDirY;
      this.playerMoving = true;
      this._dashBurstLeft -= dt;
      if (this._dashBurstLeft < 0) {
        this._dashBurstLeft = 0;
      }
      return;
    }

    if (this.dashCooldownLeft > 0) {
      this.dashCooldownLeft -= dt;
      if (this.dashCooldownLeft < 0) {
        this.dashCooldownLeft = 0;
      }
    }

    const nd = this._normalizedMoveDirFromInput(input);
    if (!nd) {
      this.playerMoving = false;
      return;
    }
    const dx = nd.x;
    const dy = nd.y;
    this.playerFacingX = dx;
    this.playerFacingY = dy;
    this.playerMoving = true;
    const stepX = dx * walk * dt;
    const stepY = dy * walk * dt;
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

  /**
   * 步枪等普通弹与土房障碍：有剩余反弹次数则镜面反弹并推出障碍外，否则销毁；`ignoresObstacles` 弹体不穿障判定
   */
  private _cullPlayerBulletsInObstacles(): void {
    const obs = this.obstacles;
    outer: for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!;
      if (b.ignoresObstacles) {
        continue;
      }
      const br = b.hitRadius ?? RIFLE_BULLET_RADIUS;
      for (let guard = 0; guard < 5; guard++) {
        let hit: Obstacle | undefined;
        for (const o of obs) {
          if (circleAabbOverlap(b.x, b.y, br, o)) {
            hit = o;
            break;
          }
        }
        if (!hit) {
          continue outer;
        }
        const remaining = Math.max(0, Math.floor(b.obstacleBouncesRemaining ?? 0));
        if (remaining <= 0) {
          this.bullets.splice(i, 1);
          continue outer;
        }
        const res = resolveBulletObstacleBounce(b.x, b.y, br, b.vx, b.vy, hit);
        if (!res) {
          this.bullets.splice(i, 1);
          continue outer;
        }
        b.x = res.x;
        b.y = res.y;
        b.vx = res.vx;
        b.vy = res.vy;
        b.obstacleBouncesRemaining = remaining - 1;
      }
    }
  }

  /** 步枪射程内距离玩家最近的敌人；与 `_rifleTick`、瞄准表现共用；射程取自当前武器 `focusRangePx` 与升级加算 */
  private _pickRifleFocusTarget(): Enemy | undefined {
    if (this._rifleFocusTargetCached) {
      return this._rifleFocusTargetCache;
    }
    const w = PLAYER_WEAPON_DEFS[this.equippedWeaponKind];
    const baseR = w.focusRangePx;
    const maxR =
      (Number.isFinite(baseR) && baseR > 0 ? baseR : 420) +
      (Number.isFinite(this.profileRifleRangeAdd) ? this.profileRifleRangeAdd : 0);
    const rangeSq = maxR ** 2;
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
    this._rifleFocusTargetCached = true;
    this._rifleFocusTargetCache = best;
    return best;
  }

  /**
   * 步枪/近战共用的单次命中结算：暴击、低血加成、吸血、扣血与击杀（不含弹体穿透/反弹）
   * @param e - 受击敌人
   * @param baseDamage - 未暴击前的伤害（已含武器倍率与全局乘子）
   * @param projectileHeroCritAdd - 子弹命中时传入发射快照（`Bullet.heroCritChanceAdd`）；省略则近战，使用当前主武器被动暴击加算
   */
  private _applyPrimaryWeaponDamageToEnemy(e: Enemy, baseDamage: number, projectileHeroCritAdd?: number): void {
    let dmg = baseDamage;
    const lowFrac = this.playerMaxHp > 1e-6 ? this.playerHp / this.playerMaxHp : 1;
    const tiexLowCrit =
      lowFrac <= 0.3 ? Math.min(1, Math.max(0, this.profileSetTiexueLowCritAdd)) : 0;
    const heroCritPortion =
      projectileHeroCritAdd !== undefined ? projectileHeroCritAdd : this._heroWeaponPassive().critChanceAdd;
    const luckCrit = luckCritChanceBonusFromLuckMult(this.luckMult);
    const rawCrit =
      this.critChance +
      this.chestBuffCritChanceBonus +
      this.rifleCritChanceAdd +
      tiexLowCrit +
      heroCritPortion +
      luckCrit;
    const effCrit = Math.min(1, Math.max(0, rawCrit));
    const critOverflow = Math.max(0, rawCrit - 1);
    dmg *= 1 + critOverflow;
    const isCrit = effCrit > 0 && Math.random() < effCrit;
    if (isCrit) {
      dmg *= RIFLE_CRIT_BASE_MULT;
      const ex = this.critOnHitDamageMult;
      dmg *= Number.isFinite(ex) && ex > 0 ? ex : 1;
    }
    if (lowFrac <= 0.3) {
      const lm = this.lowHpDamageMult;
      if (Number.isFinite(lm) && lm > 0) {
        dmg *= lm;
      }
      const plm = this.profileLowHpDamageMult;
      if (Number.isFinite(plm) && plm > 0) {
        dmg *= plm;
      }
    }
    e.hp -= dmg;
    let ls = this.chestBuffLifestealRatio + this.lifestealAdd;
    if (isCrit) {
      ls += this.critLifestealAdd;
    }
    if (ls > 0 && Number.isFinite(ls)) {
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + dmg * ls);
    }
    if (e.hp <= 0) {
      this._onEnemyKilled(e);
    }
  }

  /**
   * 近战挥击：以索敌方向为扇心，`meleeRangePx` 与 `meleeArcHalfRad` 内由近及远对扇区内每名敌人各造成一次伤害（近战穿透：不受子弹穿透数值限制）
   * @param bonusPellets - 升级「散射」加宽扇面；`dtap` 为连发叠层额外加宽
   */
  private _performMeleeSwing(
    w: PlayerWeaponDef,
    focusTarget: Enemy,
    dmgPer: number,
    bonusPellets: number,
    dtap: number,
  ): void {
    const px = this.playerX;
    const py = this.playerY;
    const dx0 = focusTarget.x - px;
    const dy0 = focusTarget.y - py;
    const aimAng = Math.atan2(dy0, dx0);
    const halfBase = w.meleeArcHalfRad ?? Math.PI / 3;
    const halfArc = halfBase + bonusPellets * 0.035 + dtap * 0.04;
    const mr =
      Number.isFinite(w.meleeRangePx) && (w.meleeRangePx ?? 0) > 0 ? (w.meleeRangePx as number) : 90;
    const candidates: { e: Enemy; d2: number }[] = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) {
        continue;
      }
      const dx = e.x - px;
      const dy = e.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist > mr + e.radius) {
        continue;
      }
      const ea = Math.atan2(dy, dx);
      let ad = ea - aimAng;
      while (ad > Math.PI) {
        ad -= Math.PI * 2;
      }
      while (ad < -Math.PI) {
        ad += Math.PI * 2;
      }
      if (Math.abs(ad) > halfArc) {
        continue;
      }
      candidates.push({ e, d2: dist * dist });
    }
    candidates.sort((a, b) => a.d2 - b.d2);
    for (const { e } of candidates) {
      if (e.hp <= 0) {
        continue;
      }
      this._applyPrimaryWeaponDamageToEnemy(e, dmgPer);
    }
    this.meleeSwingVisualRemain = MELEE_SWING_VISUAL_SEC;
    this.meleeSwingArcHalfRad = halfArc;
    this.meleeSwingRangePx = mr;
  }

  /** 每帧刷新 `playerAim`：有索敌目标则指向目标，否则回退为移动朝向 */
  private _updatePlayerAimDirection(): void {
    const best = this._pickRifleFocusTarget();
    if (best) {
      const dx0 = best.x - this.playerX;
      const dy0 = best.y - this.playerY;
      const len = Math.hypot(dx0, dy0);
      if (len > 1e-4) {
        this.playerAimX = dx0 / len;
        this.playerAimY = dy0 / len;
        return;
      }
    }
    let ax = this.playerFacingX;
    let ay = this.playerFacingY;
    const m = Math.hypot(ax, ay);
    if (m > 1e-4) {
      ax /= m;
      ay /= m;
    } else {
      ax = 1;
      ay = 0;
    }
    this.playerAimX = ax;
    this.playerAimY = ay;
  }

  /** 换弹计时、弹匣扣发与射击间隔；近战不扣弹、无换弹段，挥击间隔只吃射速（不吃换弹速度） */
  private _rifleTick(dt: number): void {
    if (this.rifleReloadRemaining > 0) {
      this.rifleReloadRemaining -= dt;
      if (this.rifleReloadRemaining <= 0) {
        this.rifleReloadRemaining = 0;
        this.rifleReloadTotalSec = 0;
        const k = this.equippedWeaponKind;
        this._weaponMagAmmo[k] = PLAYER_WEAPON_DEFS[k].magazineSize;
      }
      if (this.rifleReloadRemaining > 0) {
        return;
      }
    }

    const wPre = PLAYER_WEAPON_DEFS[this.equippedWeaponKind];
    if (wPre.category === 'melee') {
      this._weaponMagAmmo[this.equippedWeaponKind] = wPre.magazineSize;
      this.rifleReloadRemaining = 0;
      this.rifleReloadTotalSec = 0;
    }

    this.rifleCooldown -= dt;
    if (this.rifleCooldown > 0) {
      return;
    }

    const w = PLAYER_WEAPON_DEFS[this.equippedWeaponKind];
    const ammo = this._weaponMagAmmo[this.equippedWeaponKind] ?? 0;

    const best = this._pickRifleFocusTarget();
    if (!best) {
      this.rifleCooldown = 0;
      if (ammo <= 0 && this.rifleReloadRemaining <= 0) {
        this._startMagReloadForEquipped();
      }
      return;
    }

    if (ammo <= 0) {
      if (this.rifleReloadRemaining <= 0) {
        this._startMagReloadForEquipped();
      }
      return;
    }

    if (w.category !== 'melee') {
      this._weaponMagAmmo[this.equippedWeaponKind] = ammo - 1;
    }

    const asp = this.rifleAttackSpeedMult;
    const safeAsp = Number.isFinite(asp) && asp > 0 ? asp : 1;
    const bonusPellets = Math.max(0, Math.floor(this.rifleBulletCount) - 1);
    const dtap = Math.max(0, Math.floor(this.profileDoubleTapStacks));
    const danmu = Math.max(0, Math.floor(this.profileDanmuBulletAdd));
    const pierce =
      Math.max(0, Math.floor(w.pierceExtra)) + Math.max(0, Math.floor(this.projectilePierceAdd));
    const pc = Math.min(1, Math.max(0, this.profilePierceChanceAdd));
    const pierceRoll = pc > 0 && Math.random() < pc ? 1 : 0;
    const hits0 = 1 + pierce + pierceRoll;
    const rdm = Number.isFinite(this.rifleDamageMult) && this.rifleDamageMult > 0 ? this.rifleDamageMult : 1;
    const hp = this._heroWeaponPassive();
    const dmgPer =
      RIFLE_BASE_DAMAGE *
      w.damageMult *
      this.damageMultiplier *
      this.chestBuffDamageDealtMult *
      rdm *
      hp.damageMul;
    const cdScale = Number.isFinite(w.cooldownScale) && w.cooldownScale > 0 ? w.cooldownScale : 1;
    const rlm = Number.isFinite(this.rifleReloadSpeedMult) && this.rifleReloadSpeedMult > 0 ? this.rifleReloadSpeedMult : 1;
    const aspEff = safeAsp * hp.attackSpeedMul;
    const rlmEff = rlm * hp.reloadSpeedMul;

    if (w.category === 'melee') {
      this._performMeleeSwing(w, best, dmgPer, bonusPellets, dtap);
      playMeleeSwingSfx();
      this.rifleCooldown =
        (RIFLE_COOLDOWN_SEC * cdScale * this.chestBuffRifleCooldownMult) / aspEff;
      return;
    }

    const dx0 = best.x - this.playerX;
    const dy0 = best.y - this.playerY;
    const baseAng = Math.atan2(dy0, dx0);
    const n = Math.max(
      1,
      Math.min(12, Math.floor(w.baseBulletCount + bonusPellets + dtap + danmu)),
    );
    const spread = n <= 1 ? 0 : w.spreadRad;
    const bsm = Number.isFinite(this.rifleBulletSpeedMult) && this.rifleBulletSpeedMult > 0 ? this.rifleBulletSpeedMult : 1;
    const spd = RIFLE_BULLET_SPEED * w.bulletSpeedMult * bsm;
    const pbr = Number.isFinite(this.profileBulletRadiusMult) && this.profileBulletRadiusMult > 0 ? this.profileBulletRadiusMult : 1;
    const hitR =
      RIFLE_BULLET_RADIUS * w.bulletRadiusMult * this.chestBuffBulletRadiusMult * pbr;
    const bounce0 = Math.max(0, Math.floor(this.projectileBounceAdd));
    for (let i = 0; i < n; i++) {
      const ang = baseAng + (i - (n - 1) * 0.5) * spread;
      const vx = Math.cos(ang) * spd;
      const vy = Math.sin(ang) * spd;
      this.bullets.push({
        x: this.playerX,
        y: this.playerY,
        vx,
        vy,
        damage: dmgPer,
        hitRadius: hitR,
        hitsRemaining: hits0,
        hitEnemyIds: [],
        displayColor: this.cosmeticBulletColor ?? w.bulletColor,
        obstacleBouncesRemaining: bounce0,
        heroCritChanceAdd: hp.critChanceAdd,
      });
    }
    playRifleShootSfx();
    this.rifleCooldown =
      (RIFLE_COOLDOWN_SEC * cdScale * this.chestBuffRifleCooldownMult) / (aspEff * rlmEff);
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
      if (!e.ignoresObstacles) {
        const p = resolveCircleWithObstacles(e.x, e.y, e.radius, this.obstacles);
        e.x = p.x;
        e.y = p.y;
      }
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

  /**
   * 敌弹/爆炸基础伤害（未计护甲前由乘子缩放）；接触伤走 `_applyDamageToPlayer` 并传入反伤目标
   * @param thornsTarget - 接触伤时传入该敌；弹伤无明确目标时反伤最近敌人
   */
  private _applyDamageToPlayer(raw: number, thornsTarget?: Enemy): void {
    if (raw <= 0 || !Number.isFinite(raw)) {
      return;
    }
    if (this.gameTime < this._playerHurtInvincibleUntil) {
      return;
    }
    const dodgeCap = Math.min(1, Math.max(0, this.dodgeChanceAdd));
    if (dodgeCap > 0 && Math.random() < dodgeCap) {
      return;
    }
    let dmg = raw * this.chestBuffDamageTakenMult * this.profileDamageTakenMult;
    if (!this._phantomMitigationUsed && this.profilePhantomMitigatePct > 0) {
      const ph = Math.min(0.95, Math.max(0, this.profilePhantomMitigatePct));
      dmg *= 1 - ph;
      this._phantomMitigationUsed = true;
    }
    if (this.profileGuardianShield > 0 && dmg > 0) {
      const abs = Math.min(dmg, this.profileGuardianShield);
      this.profileGuardianShield -= abs;
      dmg -= abs;
    }
    const ar = this.armorAdd;
    if (ar > 0 && Number.isFinite(ar)) {
      dmg *= 100 / (100 + ar);
    }
    if (!Number.isFinite(dmg) || dmg <= 0) {
      return;
    }
    const hpBefore = this.playerHp;
    this.playerHp -= dmg;
    const actualLoss = hpBefore - this.playerHp;
    if (actualLoss > 1e-6) {
      playPlayerHurtSfx();
    }
    const invBase = PLAYER_HURT_INVINCIBLE_BASE_SEC;
    const invMult =
      Number.isFinite(this.hurtInvincibleMult) && this.hurtInvincibleMult > 0 ? this.hurtInvincibleMult : 1;
    this._playerHurtInvincibleUntil = this.gameTime + invBase * invMult;
    this._applyThornsReflect(actualLoss, thornsTarget);
    if (this.playerHp <= 0) {
      if (this.hasRevive) {
        this.hasRevive = false;
        this.playerHp = this.playerMaxHp;
        this._playerHurtInvincibleUntil = this.gameTime + Math.max(invBase * invMult * 2.2, 1.25);
        return;
      }
      this.playerHp = 0;
      this.gameOver = true;
      this.paused = true;
    }
  }

  /** 弹伤入口：无明确反伤目标时按最近敌反伤 */
  private _applyProjectileDamageToPlayer(amount: number): void {
    this._applyDamageToPlayer(amount, undefined);
  }

  /** 反伤：叠乘 `thornsDamageMult`，反射量 = 实际掉血 × max(0, mult - 1) */
  private _applyThornsReflect(hpLoss: number, target?: Enemy): void {
    const th = this.thornsDamageMult;
    if (th <= 1 || hpLoss <= 0 || !Number.isFinite(hpLoss)) {
      return;
    }
    const reflect = hpLoss * (th - 1);
    if (reflect <= 0 || !Number.isFinite(reflect)) {
      return;
    }
    let e = target;
    if (!e || e.hp <= 0) {
      e = this._nearestEnemyWithin(this.playerX, this.playerY, 540);
    }
    if (!e || e.hp <= 0) {
      return;
    }
    e.hp -= reflect;
    if (e.hp <= 0) {
      this._onEnemyKilled(e);
    }
  }

  /** 用于反伤弹伤：取距点最近且仍在场的敌人 */
  private _nearestEnemyWithin(cx: number, cy: number, maxDist: number): Enemy | undefined {
    const maxSq = maxDist * maxDist;
    let best: Enemy | undefined;
    let bestD2 = maxSq;
    for (const e of this.enemies) {
      const dx = e.x - cx;
      const dy = e.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
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
        this._applyPrimaryWeaponDamageToEnemy(e, b.damage, b.heroCritChanceAdd ?? 0);
        const ids = b.hitEnemyIds ?? (b.hitEnemyIds = []);
        ids.push(e.id);
        let hr = b.hitsRemaining ?? 1;
        hr -= 1;
        b.hitsRemaining = hr;
        if (hr <= 0) {
          const bounceRem = Math.max(0, Math.floor(b.obstacleBouncesRemaining ?? 0));
          if (bounceRem > 0) {
            const br = b.hitRadius ?? RIFLE_BULLET_RADIUS;
            const res = resolveBulletEnemyCircleBounce(
              b.x,
              b.y,
              br,
              b.vx,
              b.vy,
              e.x,
              e.y,
              e.radius,
            );
            if (res) {
              b.x = res.x;
              b.y = res.y;
              b.vx = res.vx;
              b.vy = res.vy;
              b.obstacleBouncesRemaining = bounceRem - 1;
              b.hitsRemaining = 1;
            } else {
              bullets.splice(i, 1);
            }
          } else {
            bullets.splice(i, 1);
          }
        }
        if (e.hp <= 0) {
          this._onEnemyKilled(e);
        }
      };

      const testEnemy = (e: Enemy): boolean => {
        if (b.hitEnemyIds?.includes(e.id)) {
          return false;
        }
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const brad = b.hitRadius ?? RIFLE_BULLET_RADIUS;
        const rr = e.radius + brad;
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

  /** 击杀结算：移出数组、掉落与溅射；若目标已不在数组则直接返回，避免溅射递归缩短数组时仍用旧下标访问 */
  private _onEnemyKilled(e: Enemy): void {
    const idx = this.enemies.indexOf(e);
    if (idx < 0) {
      return;
    }
    const kx = e.x;
    const ky = e.y;
    this.enemies.splice(idx, 1);
    this.sessionKills += 1;
    const khFlat = this.killHealAdd;
    const khPct =
      Number.isFinite(this.playerMaxHp) && this.playerMaxHp > 0
        ? this.playerMaxHp * this.profileKillHealMaxHpPct
        : 0;
    const kh = khFlat + khPct;
    if (kh > 0 && Number.isFinite(kh)) {
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + kh);
    }
    this._dropXpGem(e.x, e.y, e.gemValue);
    if (e.isElite) {
      this._trySpawnGearChestNear(e.x, e.y, e.level);
    } else {
      const luck = Number.isFinite(this.luckMult) && this.luckMult > 0 ? Math.min(1.75, this.luckMult) : 1;
      const p = Math.min(
        GEAR_CHEST_DROP_MAX_CHANCE,
        GEAR_CHEST_DROP_BASE_CHANCE * (1 + Math.min(24, e.level) * GEAR_CHEST_DROP_LEVEL_COEFF) * luck,
      );
      if (Math.random() < p) {
        this._trySpawnGearChestNear(e.x, e.y, e.level);
      }
    }
    const shr = Math.max(0, Math.floor(this.profileShrapnelStacks));
    if (shr > 0) {
      const rSplash = 95;
      const r2 = rSplash * rSplash;
      const rdm = Number.isFinite(this.rifleDamageMult) && this.rifleDamageMult > 0 ? this.rifleDamageMult : 1;
      const splash =
        RIFLE_BASE_DAMAGE *
        0.18 *
        shr *
        this.damageMultiplier *
        this.chestBuffDamageDealtMult *
        rdm;
      const splashKills: Enemy[] = [];
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const o = this.enemies[j];
        if (!o) {
          continue;
        }
        const dx = o.x - kx;
        const dy = o.y - ky;
        if (dx * dx + dy * dy > r2) {
          continue;
        }
        o.hp -= splash;
        if (o.hp <= 0) {
          splashKills.push(o);
        }
      }
      for (const dead of splashKills) {
        this._onEnemyKilled(dead);
      }
    }
  }

  /** 击杀点旁尝试投放一只装备箱（与周期增益箱错开间距） */
  private _trySpawnGearChestNear(x: number, y: number, monsterLevel: number): void {
    const m = WORLD_SIZE;
    const margin = CHEST_RADIUS + 8;
    const minChestSepSq = 95 * 95;
    for (let attempt = 0; attempt < 16; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const d = 24 + Math.random() * 40;
      let rx = x + Math.cos(ang) * d;
      let ry = y + Math.sin(ang) * d;
      rx = Math.min(m - margin, Math.max(margin, rx));
      ry = Math.min(m - margin, Math.max(margin, ry));
      const sp = this._spawnPositionClearOfObstacles(rx, ry, CHEST_RADIUS);
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
      this.chests.push({
        x: sp.x,
        y: sp.y,
        despawnAt: this.gameTime + CHEST_LIFETIME_SEC,
        chestKind: 'gear',
        monsterLevel,
      });
      return;
    }
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

  /** 接触伤害：重叠时先把怪沿径向推开，再按间隔扣血，避免贴脸叠层连续受伤；反伤可能击杀当前敌，故倒序索引遍历 */
  private _enemyPlayerContact(): void {
    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const e = this.enemies[ei]!;
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
      const kb = Number.isFinite(this.knockbackMult) && this.knockbackMult > 0 ? this.knockbackMult : 1;
      const push = (overlap + ENEMY_CONTACT_SEPARATION_PAD) * kb;
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
      this._applyDamageToPlayer(e.contactDamage, e);
      if (this.gameOver) {
        return;
      }
    }
  }

  /** 距离小于拾取半径则吸收经验并可能触发升级 */
  private _pickupGems(): void {
    const reach = this._pickupInteractionReach(GEM_RADIUS);
    const reachSq = reach * reach;
    const em = Number.isFinite(this.expMult) && this.expMult > 0 ? this.expMult : 1;
    const xpGainMult = this.chestBuffXpGainMult * em;
    let picked = 0;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i]!;
      const dx = g.x - this.playerX;
      const dy = g.y - this.playerY;
      if (dx * dx + dy * dy <= reachSq) {
        if (this.level < PLAYER_MAX_LEVEL) {
          this.xp += Math.round(g.value * xpGainMult);
          this._checkLevelUpFromXp();
        }
        this.gems.splice(i, 1);
        picked++;
      }
    }
    if (picked > 0) {
      playGemPickupSfx();
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
