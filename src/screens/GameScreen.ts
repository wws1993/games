import {
  Container,
  FillGradient,
  FederatedPointerEvent,
  Graphics,
  Rectangle,
  Text,
  TextStyle,
  Ticker,
} from 'pixi.js';

import {
  CAMERA_VIEW_WORLD_ON_SHORT_SIDE,
  ENEMY_VISUAL_LOD_COUNT,
  PLAYER_BASE_MAX_HP,
  PLAYER_RADIUS,
  RIFLE_BULLET_RADIUS,
  WORLD_SIZE,
} from '../game/survivor/constants';
import { EnemyWorldVisual, enemyKindFill, enemyKindStroke } from '../game/survivor/enemyWorldVisual';
import { drawMapGrassDecor } from '../game/survivor/mapGrassVisual';
import { drawObstacleOnMap } from '../game/survivor/obstacleVisual';
import { PlayerWorldVisual } from '../game/survivor/playerWorldVisual';
import { levelUpCardTierPresentation, type LevelUpCardDef } from '../game/config/levelUpCardsConfig';
import { recordRunEndForAchievements } from '../game/meta/achievementStore';
import {
  closePauseEquipmentOverlay,
  openPauseEquipmentOverlay,
  registerPauseEquipment,
} from '../game/meta/gamePauseBridge';
import { consumePendingGameMode } from '../game/meta/gameModeSession';
import {
  cycleDevTimeScale,
  getDevBonusMaxHp,
  getDevBonusRifleAttackSpeed,
  getDevTimeScale,
  toggleDevBonusMaxHp,
  toggleDevBonusRifleAttackSpeed,
} from '../game/meta/devRuntime';
import { PLAYER_WEAPON_DEFS } from '../game/config/playerWeaponsConfig';
import { SurvivorGameModel } from '../game/survivor/SurvivorGameModel';
import type { MoveInput } from '../game/survivor/types';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { exitGameToReactHome } from '../ui/shellBridge';
import { app } from '../utils/application';
import { formatDurationCn } from '../utils/formatDuration';
import type { AppScreen } from '../utils/navigation';

/** 玩法屏：阶段 1 核心循环（移动、步枪、步兵、经验、升级三选一、HUD） */
export class GameScreen extends Container implements AppScreen {
  /** 屏幕唯一标识，供导航缓存 */
  public static SCREEN_ID = 'survivor_game';

  private readonly _model = new SurvivorGameModel();
  /** 屏幕空间全屏底色，避免相机外露出白底 */
  private readonly _screenBackdrop = new Graphics();
  private readonly _worldRoot = new Container();
  private readonly _mapBg = new Graphics();
  /** 世界底色之上的伪随机小草，与地图同坐标；`prepare`/`resize` 时重绘 */
  private readonly _mapGrass = new Graphics();
  /** 土房障碍每帧重绘，与 `SurvivorGameModel.obstacles` 位移同步（推箱子） */
  private readonly _mapObstacles = new Graphics();
  /** 主角矢量 / 日后 `AnimatedSprite`，位于地图之上、与旧 `_worldGfx` 中实体同序前先绘制 */
  private readonly _playerWorldVisual = new PlayerWorldVisual();
  /** 敌人矢量小人池，与 `enemies` 下标对齐；置于主角之上、子弹之下 */
  private readonly _enemyLayer = new Container();
  private readonly _enemyVisualPool: EnemyWorldVisual[] = [];
  private readonly _worldGfx = new Graphics();
  private readonly _hudRoot = new Container();
  private readonly _hudGfx = new Graphics();
  private readonly _timeText: Text;
  private readonly _levelText: Text;
  /** 右上角当前武器名（Q/E 切换） */
  private readonly _weaponHudText: Text;
  private readonly _fpsText: Text;
  /** 开启宝箱后的短时提示（屏幕中下） */
  private readonly _chestToastText: Text;
  private readonly _levelUpRoot = new Container();
  private readonly _levelUpDim = new Graphics();
  private readonly _levelUpTitle!: Text;
  private _levelUpSubtitle!: Text;
  private readonly _levelUpChoicesHolder = new Container();
  /** 避免升级弹窗打开时每帧重建卡片（会打断悬停态） */
  private _levelUpOfferKey = '';
  private readonly _gameOverRoot = new Container();
  private readonly _gameOverDim = new Graphics();
  private readonly _gameOverTitle: Text;
  private readonly _gameOverStats: Text;
  private readonly _gameOverHint: Text;

  private readonly _joystick: VirtualJoystick;

  /** 覆盖在血条上的透明热区：连续三次点击切换开发者面板 */
  private readonly _hpBarDevHit = new Graphics();
  /** 开发者倍速等选项（发布前可整段移除） */
  private readonly _devRoot = new Container();
  /** 三连击后显示：右下角横向作弊图标条容器 */
  private _devCheatDock!: Container;
  /** 血条作弊图标：`body` 用于按开关态重绘底色 */
  private _devCheatHp!: { root: Container; body: Graphics; glyph: Text };
  private _devCheatAs!: { root: Container; body: Graphics; glyph: Text };
  private _devCheatClose!: { root: Container; body: Graphics; glyph: Text };
  /** 左下角（叠在摇杆之上）：仅游戏速率，作弊已迁至 `_devCheatDock` */
  private readonly _cornerDevHud = new Container();
  private _cornerRateLabel!: Text;

  private _devPanelOpen = false;
  /** 局内逻辑时间倍率，仅影响 `SurvivorGameModel.step` 的 dt */
  private _timeScale = 1;
  private _hpTapCount = 0;
  private _hpTapLastMs = 0;

  private readonly _keys = new Set<string>();
  /** Q/E 边沿检测，避免长按连续切枪 */
  private _keyQDown = false;
  private _keyEDown = false;
  /** P：打开/关闭局内装备暂停层 */
  private _keyPDown = false;
  /** 左下角旁：点按打开暂停整备（与 P 键一致） */
  private readonly _pauseFab = new Container();

  /** 右下角：触摸冲刺（与空格一致） */
  private readonly _dashFab = new Container();

  /** 本帧是否已请求冲刺（空格沿 / 冲刺键点按） */
  private _dashQueued = false;
  private _onKeyDown = (e: KeyboardEvent): void => {
    this._keys.add(e.code);
    if (e.code === 'Space' && !e.repeat) {
      this._dashQueued = true;
      e.preventDefault();
    }
    if (e.code === 'KeyP') {
      if (!this._keyPDown) {
        this._togglePauseEquipment();
      }
      this._keyPDown = true;
      e.preventDefault();
    }
  };
  private _onKeyUp = (e: KeyboardEvent): void => {
    this._keys.delete(e.code);
    if (e.code === 'KeyP') {
      this._keyPDown = false;
    }
  };

  private _w = 0;
  private _h = 0;
  private _worldScale = 1;
  /** 复用的移动输入对象，避免 `update` 每帧新建对象触发 GC */
  private readonly _moveInputCache: MoveInput = {
    up: false,
    down: false,
    left: false,
    right: false,
    dash: false,
  };
  /** 防止阵亡连点重复写入成就 */
  private _achievementSettled = false;

  /** 与 `_drawHud` 配合：仅秒数或等级变化时重算右上角 `Text` 布局 */
  private _lastHudTimeInt = -1;

  private _lastHudLevel = 0;

  private _lastHudWeaponIndex = -1;

  /** 对 `Ticker.FPS` 做指数平滑，避免数字剧烈跳动 */
  private _fpsSmoothed = 60;

  /** 血条三连击热区布局是否需要刷新（尺寸变更时置位） */
  private _hpBarDevHitDirty = true;

  constructor() {
    super();

    this._screenBackdrop.eventMode = 'none';
    this._mapBg.eventMode = 'none';
    this._mapGrass.eventMode = 'none';
    this._mapObstacles.eventMode = 'none';
    this._worldGfx.eventMode = 'none';
    this._hudGfx.eventMode = 'none';

    this._joystick = new VirtualJoystick((clientX, clientY) => {
      const rect = app.canvas.getBoundingClientRect();
      const rw = app.renderer.width;
      const rh = app.renderer.height;
      const sw = Math.max(1, rect.width);
      const sh = Math.max(1, rect.height);
      return {
        x: (clientX - rect.left) * (rw / sw),
        y: (clientY - rect.top) * (rh / sh),
      };
    });

    const hudFont = '"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif';
    this._timeText = new Text({
      text: '00:00',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 22,
        fontWeight: 'bold',
        fill: 0xf5e6d3,
        dropShadow: { blur: 3, distance: 1, color: 0x000000, alpha: 0.85 },
      }),
    });
    this._levelText = new Text({
      text: 'Lv 1',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 18,
        fontWeight: 'bold',
        fill: 0xe8d4a8,
        dropShadow: { blur: 2, distance: 1, color: 0x000000, alpha: 0.8 },
      }),
    });
    this._weaponHudText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 14,
        fontWeight: '600',
        fill: 0xd4c4a8,
        dropShadow: { blur: 2, distance: 1, color: 0x000000, alpha: 0.78 },
      }),
    });
    this._fpsText = new Text({
      text: '60 FPS',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 14,
        fontWeight: '600',
        fill: 0x9fdf90,
        dropShadow: { blur: 2, distance: 1, color: 0x000000, alpha: 0.75 },
      }),
    });
    this._chestToastText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 15,
        fontWeight: 'bold',
        fill: 0xffe8a8,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 320,
        dropShadow: { blur: 4, distance: 1, color: 0x000000, alpha: 0.9 },
      }),
    });
    this._chestToastText.anchor.set(0.5, 0.5);
    this._chestToastText.visible = false;

    this._worldRoot.addChild(
      this._mapBg,
      this._mapGrass,
      this._mapObstacles,
      this._playerWorldVisual.root,
      this._enemyLayer,
      this._worldGfx,
    );

    this._hpBarDevHit.eventMode = 'static';
    this._hpBarDevHit.cursor = 'default';
    this._hpBarDevHit.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._onHealthBarTripleTap();
    });
    this._hudRoot.addChild(
      this._hudGfx,
      this._timeText,
      this._weaponHudText,
      this._levelText,
      this._fpsText,
      this._chestToastText,
      this._hpBarDevHit,
      this._dashFab,
    );

    this._buildPauseFab();
    this._buildDashFab();
    this._buildLevelUpUi();
    this._buildGameOverUi();
    this._buildDevPanel();
    this._buildCornerDevHud();

    this.addChild(
      this._screenBackdrop,
      this._worldRoot,
      this._hudRoot,
      this._joystick,
      this._cornerDevHud,
      this._devRoot,
      this._levelUpRoot,
      this._gameOverRoot,
    );

    this._levelUpRoot.visible = false;
    this._gameOverRoot.visible = false;
    this._devRoot.visible = false;
  }

  /** 重置局内状态（每局开始前调用） */
  public prepare(): void {
    this._achievementSettled = false;
    this._model.gameMode = consumePendingGameMode();
    this._model.reset();
    this._model.syncWeaponLoadoutFromProfile();
    this._model.syncGearLoadoutFromProfile();
    this._playerWorldVisual.resetPhase();
    this._levelUpRoot.visible = false;
    this._gameOverRoot.visible = false;
    this._devPanelOpen = false;
    this._devRoot.visible = false;
    this._timeScale = getDevTimeScale();
    this._hpTapCount = 0;
    this._levelUpOfferKey = '';
    this._refreshCornerDevLabels();
    this._lastHudTimeInt = -1;
    this._lastHudLevel = 0;
    this._lastHudWeaponIndex = -1;
    this._fpsSmoothed = 60;
    this._fpsText.text = '60 FPS';
    this._drawMapBackground();
    this._drawMapGrassDecor();
    this._drawMapObstacles();
    registerPauseEquipment({
      setManualPaused: (v) => {
        this._model.manualPaused = v;
      },
      syncLoadoutFromSave: () => {
        this._model.syncWeaponLoadoutFromProfile();
        this._model.syncGearLoadoutFromProfileMidRun();
      },
    });
  }

  /** 订阅键盘；淡入由导航 `show` 调用，此处无需异步 */
  public async show(): Promise<void> {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  /** 取消键盘订阅 */
  public async hide(): Promise<void> {
    closePauseEquipmentOverlay();
    registerPauseEquipment(null);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this._keys.clear();
    this._joystick.dispose();
  }

  /** 驱动模型与绘制 */
  public update(ticker: Ticker): void {
    const fpsBlend = 0.15;
    this._fpsSmoothed += (ticker.FPS - this._fpsSmoothed) * fpsBlend;
    const dt = (ticker.deltaMS / 1000) * this._timeScale;
    this._pollWeaponSwitchKeys();
    this._model.step(dt, this._readMoveInput());
    if (this._model.chestToastRemain > 0) {
      this._model.chestToastRemain = Math.max(0, this._model.chestToastRemain - dt);
    }
    this._syncCameraAndWorld();
    const frozen = this._model.paused || this._model.gameOver || this._model.manualPaused;
    const steerOk =
      !this._model.gameOver &&
      !this._model.paused &&
      !this._model.awaitingLevelUp &&
      !this._model.manualPaused;
    this._pauseFab.visible = steerOk;
    this._dashFab.visible = steerOk;
    this._playerWorldVisual.sync(this._model, dt, frozen);
    this._syncEnemyWorldVisuals(frozen);
    this._drawMapObstacles();
    this._drawWorldEntities();
    this._drawHud();
    this._syncLevelUpVisibility();
    this._syncGameOverVisibility();
  }

  /** 布局 HUD 与遮罩层尺寸 */
  public resize(w: number, h: number): void {
    this._w = w;
    this._h = h;
    this._drawScreenBackdrop();
    this._worldScale = Math.min(w, h) / CAMERA_VIEW_WORLD_ON_SHORT_SIDE;
    this._chestToastText.style.wordWrapWidth = Math.min(340, Math.max(120, w - 32));
    this._drawMapBackground();
    this._drawMapGrassDecor();
    this._joystick.layout(w, h);
    this._layoutHud();
    this._hpBarDevHitDirty = true;
    this._layoutCornerDevHud();
    if (this._devPanelOpen) {
      this._layoutDevPanel();
    }
    this._layoutLevelUp();
    this._layoutGameOver();
  }

  /** P 键 / 角标：打开或关闭局内装备整备层 */
  private _togglePauseEquipment(): void {
    const m = this._model;
    if (m.gameOver || m.paused || m.awaitingLevelUp) {
      return;
    }
    if (m.manualPaused) {
      closePauseEquipmentOverlay();
    } else {
      openPauseEquipmentOverlay();
    }
  }

  /** 左下角暂停角标（触摸） */
  private _buildPauseFab(): void {
    this._pauseFab.eventMode = 'static';
    this._pauseFab.cursor = 'pointer';
    const pBg = new Graphics();
    pBg.roundRect(0, 0, 52, 34, 8).fill({ color: 0x1a1814, alpha: 0.88 });
    pBg.roundRect(0, 0, 52, 34, 8).stroke({ width: 1.2, color: 0x6a5840, alpha: 0.9 });
    const pTxt = new Text({
      text: '暂停',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 14,
        fontWeight: '600',
        fill: 0xe8dcc8,
      }),
    });
    pTxt.anchor.set(0.5);
    pTxt.position.set(26, 17);
    this._pauseFab.hitArea = new Rectangle(0, 0, 52, 34);
    this._pauseFab.addChild(pBg, pTxt);
    this._pauseFab.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._togglePauseEquipment();
    });
    this._hudRoot.addChild(this._pauseFab);
  }

  /** 右下角冲刺键：与键盘空格同逻辑，便于触屏 */
  private _buildDashFab(): void {
    this._dashFab.eventMode = 'static';
    this._dashFab.cursor = 'pointer';
    const dBg = new Graphics();
    dBg.roundRect(0, 0, 56, 56, 12).fill({ color: 0x1a2820, alpha: 0.9 });
    dBg.roundRect(0, 0, 56, 56, 12).stroke({ width: 1.4, color: 0x4a8060, alpha: 0.95 });
    const dTxt = new Text({
      text: '冲刺',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 15,
        fontWeight: '600',
        fill: 0xc8e8d0,
      }),
    });
    dTxt.anchor.set(0.5);
    dTxt.position.set(28, 28);
    this._dashFab.hitArea = new Rectangle(0, 0, 56, 56);
    this._dashFab.addChild(dBg, dTxt);
    this._dashFab.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._dashQueued = true;
    });
  }

  /** 摇杆优先，其次 WASD / 方向键；暂停或弹窗时摇杆禁用；空格/冲刺键沿触发冲刺 */
  private _readMoveInput(): MoveInput {
    const m = this._model;
    const canSteer = !m.gameOver && !m.paused && !m.awaitingLevelUp && !m.manualPaused;
    this._joystick.setInteractiveEnabled(canSteer);

    const { analogX, analogY } = this._joystick.getAnalog();
    const mag = Math.hypot(analogX, analogY);
    const useStick = mag > 0.02;

    const input = this._moveInputCache;
    input.up = this._keys.has('KeyW') || this._keys.has('ArrowUp');
    input.down = this._keys.has('KeyS') || this._keys.has('ArrowDown');
    input.left = this._keys.has('KeyA') || this._keys.has('ArrowLeft');
    input.right = this._keys.has('KeyD') || this._keys.has('ArrowRight');
    if (useStick) {
      input.analogX = analogX;
      input.analogY = analogY;
    } else {
      input.analogX = undefined;
      input.analogY = undefined;
    }
    if (!canSteer) {
      this._dashQueued = false;
      input.dash = false;
    } else {
      input.dash = this._dashQueued;
      this._dashQueued = false;
    }
    return input;
  }

  /** Q 上一把、E 下一把；边沿触发，暂停/弹窗/阵亡时由模型忽略 */
  private _pollWeaponSwitchKeys(): void {
    const q = this._keys.has('KeyQ');
    const e = this._keys.has('KeyE');
    if (q && !this._keyQDown) {
      this._model.cycleWeapon(-1);
    }
    if (e && !this._keyEDown) {
      this._model.cycleWeapon(1);
    }
    this._keyQDown = q;
    this._keyEDown = e;
  }

  /** 与地图主色接近的全屏底，相机边缘外不再露白 */
  private _drawScreenBackdrop(): void {
    const g = this._screenBackdrop;
    g.clear();
    const soil = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
    });
    soil.addColorStop(0, 0x2f3d28);
    soil.addColorStop(1, 0x232b1e);
    g.rect(0, 0, this._w, this._h).fill({ fill: soil });
  }

  /** 绘制 800×800 村庄底色与边界（世界坐标） */
  private _drawMapBackground(): void {
    const g = this._mapBg;
    g.clear();
    const m = WORLD_SIZE;
    const soil = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      textureSpace: 'local',
    });
    soil.addColorStop(0, 0x4a5f3a);
    soil.addColorStop(0.5, 0x3d4a32);
    soil.addColorStop(1, 0x2e3b28);
    g.rect(0, 0, m, m).fill({ fill: soil });
    g.rect(0, 0, m, m).stroke({ width: 4, color: 0x1e2418, alpha: 0.9 });
  }

  /** 在世界地图上撒小草簇，种子固定使同设备上分布稳定 */
  private _drawMapGrassDecor(): void {
    const g = this._mapGrass;
    g.clear();
    drawMapGrassDecor(g, WORLD_SIZE, 0x5f3759df);
  }

  /** 障碍与模型同步；静止时跳过整层重绘（`SurvivorGameModel.obstaclesDirty`） */
  private _drawMapObstacles(): void {
    const m = this._model;
    if (!m.obstaclesDirty) {
      return;
    }
    m.obstaclesDirty = false;
    const g = this._mapObstacles;
    g.clear();
    for (const o of m.obstacles) {
      drawObstacleOnMap(g, o);
    }
  }

  /** 相机跟随玩家：世界根节点平移缩放使玩家落在屏幕中心 */
  private _syncCameraAndWorld(): void {
    const s = this._worldScale;
    this._worldRoot.scale.set(s);
    this._worldRoot.position.set(
      this._w * 0.5 - this._model.playerX * s,
      this._h * 0.5 - this._model.playerY * s,
    );
  }

  /** 世界坐标下相机视口外扩 AABB，与 `_syncCameraAndWorld` 同源；用于敌剪影剔除，避免屏外单位参与 `EnemyWorldVisual.sync` */
  private _enemyVisCullBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const s = this._worldScale;
    const halfW = this._w / (2 * s);
    const halfH = this._h / (2 * s);
    const pad = 88;
    const px = this._model.playerX;
    const py = this._model.playerY;
    return {
      minX: px - halfW - pad,
      maxX: px + halfW + pad,
      minY: py - halfH - pad,
      maxY: py + halfH + pad,
    };
  }

  /** 敌人碰撞圆外加矢量小人伸出量的保守外包是否与 `_enemyVisCullBounds` 相交 */
  private _enemyRoughlyOnScreen(
    e: { x: number; y: number; radius: number },
    b: { minX: number; maxX: number; minY: number; maxY: number },
  ): boolean {
    const m = e.radius + 76;
    return e.x + m >= b.minX && e.x - m <= b.maxX && e.y + m >= b.minY && e.y - m <= b.maxY;
  }

  /** 重绘动态实体（玩家、敌、弹、宝石）；敌人仅由 `_enemyLayer` 剪影表现，不绘血条 */
  private _drawWorldEntities(): void {
    const g = this._worldGfx;
    g.clear();
    const m = this._model;

    for (const b of m.bullets) {
      const br = b.hitRadius ?? RIFLE_BULLET_RADIUS;
      const col = b.displayColor ?? 0xfff3b0;
      g.circle(b.x, b.y, br).fill({ color: col });
    }

    /** 炮兵炮弹：在预定落点绘制闪烁预警圆（阶段 2.1；弹体绘制在其后，叠在上层） */
    const shellPulseT = m.gameTime;
    for (const ep of m.enemyProjectiles) {
      if (ep.projKind !== 'shell') {
        continue;
      }
      const tx = ep.targetX ?? ep.x;
      const ty = ep.targetY ?? ep.y;
      const br = ep.blastRadius ?? 52;
      const phase = shellPulseT * 6.8 + ep.x * 0.015 + ep.y * 0.015;
      const pulse = 0.18 + 0.14 * Math.sin(phase);
      g.circle(tx, ty, br).fill({ color: 0xaa1100, alpha: pulse * 0.38 });
      g.circle(tx, ty, br).stroke({ width: 2.5, color: 0xff5522, alpha: 0.42 + pulse * 0.38 });
    }

    for (const ep of m.enemyProjectiles) {
      if (ep.projKind === 'mg') {
        g.circle(ep.x, ep.y, ep.hitRadius).fill({ color: 0xff8844, alpha: 0.95 });
      } else {
        g.circle(ep.x, ep.y, ep.hitRadius + 2).fill({ color: 0x553322, alpha: 0.9 });
        g.circle(ep.x, ep.y, ep.hitRadius).fill({ color: 0xcc5522, alpha: 0.95 });
      }
    }

    for (const ch of m.chests) {
      const bw = 24;
      const bh = 17;
      const hx = ch.x - bw * 0.5;
      const hy = ch.y - bh * 0.5;
      const gear = ch.chestKind === 'gear';
      const fillOuter = gear ? 0x4a3868 : 0x6b4a12;
      const fillInner = gear ? 0x9a80c8 : 0xc9a227;
      const strokeCol = gear ? 0xd0c0ff : 0xffe566;
      g.roundRect(hx, hy, bw, bh, 4).fill({ color: fillOuter, alpha: 0.96 });
      g.roundRect(hx + 2, hy + 3, bw - 4, bh - 6, 2).fill({ color: fillInner, alpha: 0.88 });
      g.roundRect(hx, hy, bw, bh, 4).stroke({ width: 1.5, color: strokeCol, alpha: 0.9 });
    }

    for (const gem of m.gems) {
      g.roundRect(gem.x - 5, gem.y - 7, 10, 14, 3).fill({ color: 0x44e8a8, alpha: 0.95 });
    }

    const pr = m.pickupRadius;
    g.circle(m.playerX, m.playerY, pr).stroke({ width: 1, color: 0xffffff, alpha: 0.12 });
  }

  /** 左上角血条/经验条，右上时间与等级 */
  private _drawHud(): void {
    const g = this._hudGfx;
    g.clear();
    const m = this._model;
    const pad = 14;
    const barW = Math.min(220, this._w * 0.48);
    const barH = 14;
    const hpY = pad + 6;
    const xpY = hpY + barH + 10;

    g.roundRect(pad, hpY, barW, barH, 5).fill({ color: 0x1a1a1a, alpha: 0.65 });
    const hpRatio = m.playerMaxHp > 0 ? m.playerHp / m.playerMaxHp : 0;
    g.roundRect(pad + 2, hpY + 2, (barW - 4) * hpRatio, barH - 4, 4).fill({ color: 0xc43c3c });

    g.roundRect(pad, xpY, barW, barH, 5).fill({ color: 0x1a1a1a, alpha: 0.65 });
    const xpRatio = m.xpToNext > 0 ? Math.min(1, m.xp / m.xpToNext) : 0;
    g.roundRect(pad + 2, xpY + 2, (barW - 4) * xpRatio, barH - 4, 4).fill({ color: 0x3a7cc4 });

    const t = Math.floor(m.gameTime);
    const hudMetaChanged =
      t !== this._lastHudTimeInt ||
      m.level !== this._lastHudLevel ||
      m.playerWeaponIndex !== this._lastHudWeaponIndex;
    if (hudMetaChanged) {
      this._lastHudTimeInt = t;
      this._lastHudLevel = m.level;
      this._lastHudWeaponIndex = m.playerWeaponIndex;
      const mm = Math.floor(t / 60);
      const ss = t % 60;
      this._timeText.text = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      this._levelText.text = `Lv ${m.level}`;
      this._weaponHudText.text = PLAYER_WEAPON_DEFS[m.equippedWeaponKind].displayName;
    }
    const fpsLabel = `${Math.round(this._fpsSmoothed)} FPS`;
    let fpsLabelChanged = false;
    if (this._fpsText.text !== fpsLabel) {
      this._fpsText.text = fpsLabel;
      fpsLabelChanged = true;
    }
    const toastActive = m.chestToastRemain > 0 && m.chestToastTitle.length > 0;
    if (toastActive) {
      this._chestToastText.visible = true;
      const gearToast =
        m.chestToastTitle.includes('装备') ||
        m.chestToastTitle.includes('紫箱') ||
        m.chestToastTitle.includes('军功') ||
        m.chestToastTitle.includes('重复') ||
        m.chestToastTitle.includes('空箱');
      const prefix = gearToast ? '战利品：' : '宝箱：';
      const line = m.chestToastTitle.includes('紫箱') ? m.chestToastTitle : `${prefix}${m.chestToastTitle}`;
      if (this._chestToastText.text !== line) {
        this._chestToastText.text = line;
      }
      const nl = (m.chestToastTitle.match(/\n/g) ?? []).length;
      const fs = nl >= 5 ? 12 : nl >= 2 ? 13 : 15;
      if (this._chestToastText.style.fontSize !== fs) {
        this._chestToastText.style.fontSize = fs;
      }
      const yLift = Math.min(120, nl * 10);
      this._chestToastText.position.set(this._w * 0.5, this._h - 118 - yLift);
    } else {
      this._chestToastText.visible = false;
    }

    if (hudMetaChanged || this._devPanelOpen || fpsLabelChanged) {
      this._layoutHud();
    }
    if (this._hpBarDevHitDirty) {
      this._layoutHpBarDevHit(pad, barW, barH, hpY);
      this._hpBarDevHitDirty = false;
    }
  }

  /** 与血条同区域的透明热区，用于三连击打开开发者选项 */
  private _layoutHpBarDevHit(pad: number, barW: number, barH: number, hpY: number): void {
    const h = this._hpBarDevHit;
    h.clear();
    h.rect(pad, hpY, barW, barH).fill({ color: 0xffffff, alpha: 0.004 });
    h.hitArea = new Rectangle(pad, hpY, barW, barH);
  }

  private _layoutHud(): void {
    const pad = 14;
    this._pauseFab.position.set(pad, this._h - 62);
    this._dashFab.position.set(this._w - pad - 56, this._h - 68);
    this._timeText.position.set(this._w - pad - this._timeText.width, pad);
    this._weaponHudText.position.set(this._w - pad - this._weaponHudText.width, pad + 24);
    this._levelText.position.set(this._w - pad - this._levelText.width, pad + 46);
    this._fpsText.position.set(this._w - pad - this._fpsText.width, pad + 70);
    if (this._devPanelOpen) {
      this._layoutDevPanel();
    }
  }

  /** 三连击血条热区切换开发者面板（相邻点击间隔需小于约 0.52s） */
  private static readonly _HP_TAP_MAX_GAP_MS = 520;

  private _onHealthBarTripleTap(): void {
    const now = performance.now();
    if (now - this._hpTapLastMs > GameScreen._HP_TAP_MAX_GAP_MS) {
      this._hpTapCount = 0;
    }
    this._hpTapLastMs = now;
    this._hpTapCount++;
    if (this._hpTapCount < 3) {
      return;
    }
    this._hpTapCount = 0;
    this._devPanelOpen = !this._devPanelOpen;
    this._devRoot.visible = this._devPanelOpen;
    if (this._devPanelOpen) {
      this._layoutDevPanel();
    }
  }

  /** 组装三连击后的右下角作弊图标条（血量/攻速/关闭） */
  private _buildDevPanel(): void {
    this._devRoot.eventMode = 'static';
    this._devRoot.visible = false;

    const iconSz = 48;
    const gap = 12;
    const symFont = '"Segoe UI Symbol","Noto Sans Symbols","Microsoft YaHei","PingFang SC",sans-serif';
    const dock = new Container();

    const mkIcon = (glyph: string, onTap: () => void) => {
      const root = new Container();
      root.eventMode = 'static';
      root.cursor = 'pointer';
      const body = new Graphics();
      const t = new Text({
        text: glyph,
        style: new TextStyle({
          fontFamily: symFont,
          fontSize: 22,
          fontWeight: 'bold',
          fill: 0xf0e4d8,
        }),
      });
      t.anchor.set(0.5);
      t.position.set(iconSz * 0.5, iconSz * 0.5);
      root.addChild(body, t);
      root.hitArea = new Rectangle(0, 0, iconSz, iconSz);
      root.on('pointertap', (e: FederatedPointerEvent) => {
        e.stopPropagation();
        onTap();
      });
      return { root, body, glyph: t };
    };

    this._devCheatHp = mkIcon('♥', () => {
      toggleDevBonusMaxHp();
      this._syncModelDevHpCheat();
      this._refreshDevCheatIcons();
    });
    this._devCheatAs = mkIcon('⚡', () => {
      toggleDevBonusRifleAttackSpeed();
      this._syncModelDevAsCheat();
      this._refreshDevCheatIcons();
    });
    this._devCheatClose = mkIcon('×', () => {
      this._devPanelOpen = false;
      this._devRoot.visible = false;
    });

    this._devCheatHp.root.position.set(0, 0);
    this._devCheatAs.root.position.set(iconSz + gap, 0);
    this._devCheatClose.root.position.set((iconSz + gap) * 2, 0);

    dock.addChild(this._devCheatHp.root, this._devCheatAs.root, this._devCheatClose.root);
    this._devCheatDock = dock;
    this._devRoot.addChild(dock);
    this._refreshDevCheatIcons();
  }

  /** 左下角 HUD：仅游戏速率；血条三连击后的作弊项在右下角 `_devCheatDock` */
  private _buildCornerDevHud(): void {
    this._cornerDevHud.eventMode = 'static';
    const bg = new Graphics();
    const bw = 156;
    const bhStack = 30;
    const rows = 1;
    const padBg = 6;
    const hTotal = rows * bhStack + padBg * 2;
    const wTotal = bw + padBg * 2;
    bg.roundRect(0, 0, wTotal, hTotal, 8).fill({
      color: 0x0c0806,
      alpha: 0.72,
    });
    bg.roundRect(0, 0, wTotal, hTotal, 8).stroke({
      width: 1,
      color: 0x665544,
      alpha: 0.55,
    });
    const font = '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';
    this._cornerRateLabel = new Text({
      text: '',
      style: new TextStyle({ fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffe8a8 }),
    });
    const rateRow = this._makeCornerTapRow(this._cornerRateLabel, () => {
      this._timeScale = cycleDevTimeScale();
      this._refreshCornerDevLabels();
    });
    rateRow.position.set(padBg, padBg);
    this._cornerDevHud.addChild(bg, rateRow);
    this._refreshCornerDevLabels();
  }

  private _makeCornerTapRow(label: Text, onTap: () => void): Container {
    const row = new Container();
    const bw = 156;
    const bh = 28;
    const hit = new Graphics();
    hit.rect(0, 0, bw, bh).fill({ color: 0xffffff, alpha: 0.06 });
    label.anchor.set(0, 0.5);
    label.position.set(6, bh * 0.5);
    row.addChild(hit, label);
    row.eventMode = 'static';
    row.cursor = 'pointer';
    row.hitArea = new Rectangle(0, 0, bw, bh);
    row.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      onTap();
    });
    return row;
  }

  /** 右下角作弊图标底色：开态略提亮，关态低调 */
  private _refreshDevCheatIcons(): void {
    const iconSz = 48;
    const rr = 12;
    const hpOn = getDevBonusMaxHp() > 0;
    const asOn = getDevBonusRifleAttackSpeed() > 0;
    const paint = (body: Graphics, on: boolean, hue: 'hp' | 'as' | 'close') => {
      body.clear();
      if (hue === 'close') {
        body
          .roundRect(0, 0, iconSz, iconSz, rr)
          .fill({ color: 0x1c1814, alpha: 0.94 })
          .stroke({ width: 1.5, color: 0x5a5048, alpha: 0.9 });
        return;
      }
      if (hue === 'hp') {
        const fill = on ? 0x4a2024 : 0x1e1816;
        const stroke = on ? 0xcc5555 : 0x4a3838;
        body.roundRect(0, 0, iconSz, iconSz, rr).fill({ color: fill, alpha: 0.96 }).stroke({ width: 2, color: stroke });
        return;
      }
      const fill = on ? 0x3a3518 : 0x1e1816;
      const stroke = on ? 0xd4a020 : 0x4a4030;
      body.roundRect(0, 0, iconSz, iconSz, rr).fill({ color: fill, alpha: 0.96 }).stroke({ width: 2, color: stroke });
    };
    paint(this._devCheatHp.body, hpOn, 'hp');
    paint(this._devCheatAs.body, asOn, 'as');
    paint(this._devCheatClose.body, false, 'close');
    this._devCheatHp.glyph.style.fill = hpOn ? 0xffb0b0 : 0x9a8a88;
    this._devCheatAs.glyph.style.fill = asOn ? 0xffe8a0 : 0x9a8a88;
  }

  private _refreshCornerDevLabels(): void {
    if (this._cornerRateLabel) {
      this._cornerRateLabel.text = `游戏速率 ${getDevTimeScale()}x · 点击循环`;
    }
  }

  private _syncModelDevHpCheat(): void {
    const m = this._model;
    if (getDevBonusMaxHp() > 0) {
      m.playerMaxHp += 999;
      m.playerHp += 999;
    } else {
      m.playerMaxHp = Math.max(PLAYER_BASE_MAX_HP, m.playerMaxHp - 999);
      m.playerHp = Math.min(m.playerHp, m.playerMaxHp);
    }
  }

  private _syncModelDevAsCheat(): void {
    const m = this._model;
    if (getDevBonusRifleAttackSpeed() > 0) {
      m.rifleAttackSpeedMult += 999;
    } else {
      m.rifleAttackSpeedMult = Math.max(1, m.rifleAttackSpeedMult - 999);
    }
  }

  private _layoutCornerDevHud(): void {
    const pad = 10;
    const hTotal = 30 + 12;
    this._cornerDevHud.position.set(pad, this._h - pad - hTotal);
  }

  /** 作弊图标条锚在屏幕右下角，避让摇杆与安全区 */
  private _layoutDevPanel(): void {
    const pad = 14;
    const iconSz = 48;
    const gap = 12;
    const dockW = iconSz * 3 + gap * 2;
    this._devRoot.position.set(this._w - pad - dockW, this._h - pad - iconSz);
  }

  /** 升级遮罩与卡片容器：具体卡片在弹出时按 `pendingLevelUpCards` 重建 */
  private _buildLevelUpUi(): void {
    this._levelUpDim.eventMode = 'static';
    this._levelUpRoot.addChild(this._levelUpDim);
    this._levelUpRoot.addChild(this._levelUpChoicesHolder);

    this._levelUpTitle = new Text({
      text: '战术升级',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 30,
        fontWeight: 'bold',
        letterSpacing: 2,
        fill: 0xfff4e0,
        align: 'center',
        dropShadow: {
          alpha: 0.75,
          angle: Math.PI / 2,
          blur: 6,
          color: 0x1a0f08,
          distance: 3,
        },
      }),
    });
    this._levelUpTitle.anchor.set(0.5);
    this._levelUpSubtitle = new Text({
      text: '点选一张卡片获得强化',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 15,
        fill: 0xb8a892,
        letterSpacing: 1,
        align: 'center',
      }),
    });
    this._levelUpSubtitle.anchor.set(0.5);
    this._levelUpRoot.addChild(this._levelUpTitle);
    this._levelUpRoot.addChild(this._levelUpSubtitle);
  }

  /** 根据模型当前提供的升级池构建可点击卡片 */
  private _rebuildLevelUpCards(): void {
    this._levelUpChoicesHolder.removeChildren();
    for (const card of this._model.pendingLevelUpCards) {
      this._levelUpChoicesHolder.addChild(this._makeLevelUpCard(card));
    }
  }

  /** 按强化类型取卡片主色（装饰章与底纹呼应） */
  private _levelUpCardAccent(card: LevelUpCardDef): number {
    const k = card.effect.kind;
    if (k === 'damageMult') {
      return 0xd4785c;
    }
    if (k === 'moveSpeedMult') {
      return 0x5cb89a;
    }
    if (k === 'maxHp') {
      return 0xc45c5c;
    }
    if (k === 'rifleAttackSpeedMult') {
      return 0xe8a838;
    }
    if (k === 'rifleBulletCount') {
      return 0x7a8ad8;
    }
    if (k === 'critChanceAdd') {
      return 0xe06090;
    }
    if (k === 'critOnHitDamageMult') {
      return 0xff7040;
    }
    if (k === 'pushObstacles') {
      return 0xb89868;
    }
    return 0xc9a030;
  }

  /** 卡片顶部圆章与准星；`halfH` 为卡片高度一半，用于竖排矮卡时缩放位置 */
  private _paintLevelUpCardEmblem(g: Graphics, accent: number, halfH: number): void {
    const cy = -halfH + Math.min(30, halfH * 0.42);
    const r0 = Math.min(22, halfH * 0.34);
    const r1 = Math.min(18, r0 * 0.85);
    const tick = Math.min(9, r0 * 0.42);
    g.circle(0, cy, r0 + 4).fill({ color: 0x000000, alpha: 0.22 });
    g.circle(0, cy, r0).fill({ color: accent, alpha: 0.5 });
    g.circle(0, cy, r0).stroke({ width: 2, color: 0xfff0d0, alpha: 0.35 });
    g.circle(0, cy, r1 * 0.38).fill({ color: 0x2a2218, alpha: 0.55 });
    g.moveTo(-tick, cy).lineTo(tick, cy).stroke({ width: 1.5, color: 0xfff8e8, alpha: 0.45 });
    g.moveTo(0, cy - tick).lineTo(0, cy + tick).stroke({ width: 1.5, color: 0xfff8e8, alpha: 0.45 });
  }

  /** 竖屏单列：宽度贴屏幕留白，高度压缩以容纳三张 */
  private _levelUpCardMetrics(): { w: number; h: number } {
    const side = 16;
    const w = Math.min(320, Math.max(200, this._w - side * 2));
    const h = Math.min(140, Math.max(118, Math.round(w * 0.42)));
    return { w, h };
  }

  /** 单张升级卡片：渐变底板、装饰章、内发光描边、悬停放大（尺寸随 `_levelUpCardMetrics`） */
  private _makeLevelUpCard(card: LevelUpCardDef): Container {
    const { w, h } = this._levelUpCardMetrics();
    const halfH = h * 0.5;
    const rr = Math.min(14, h * 0.11);
    const accent = this._levelUpCardAccent(card);
    const tierPres = levelUpCardTierPresentation[card.tier];

    const root = new Container();
    root.eventMode = 'static';
    root.cursor = 'pointer';
    const inner = new Container();
    root.addChild(inner);

    const shadow = new Graphics();
    shadow.roundRect(-w * 0.5 + 4, -h * 0.5 + 6, w, h, rr).fill({ color: 0x000000, alpha: 0.42 });

    const faceGrad = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
    });
    faceGrad.addColorStop(0, 0x4a3d32);
    faceGrad.addColorStop(0.35, 0x322820);
    faceGrad.addColorStop(1, 0x1a1510);

    const face = new Graphics();
    face.roundRect(-w * 0.5, -h * 0.5, w, h, rr).fill({ fill: faceGrad });

    const topSheen = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0.45 },
      textureSpace: 'local',
    });
    topSheen.addColorStop(0, accent);
    topSheen.addColorStop(0.55, accent);
    topSheen.addColorStop(1, accent);

    const sheen = new Graphics();
    sheen.roundRect(-w * 0.5 + 3, -h * 0.5 + 3, w - 6, 56, rr - 3).fill({
      fill: topSheen,
      alpha: 0.14,
    });

    const emblem = new Graphics();
    this._paintLevelUpCardEmblem(emblem, accent, halfH);

    const innerRim = new Graphics();
    innerRim.roundRect(-w * 0.5 + 5, -h * 0.5 + 5, w - 10, h - 10, rr - 5).stroke({
      width: 1,
      color: 0xfff8e8,
      alpha: 0.12,
    });

    const accentBar = new Graphics();
    accentBar
      .roundRect(-w * 0.5 + 12, h * 0.5 - 20, w - 24, 4, 2)
      .fill({ color: accent, alpha: 0.85 });

    const outerRim = new Graphics();
    const paintOuterRim = (hot: boolean): void => {
      outerRim.clear();
      const col = hot ? tierPres.rimHot : tierPres.rim;
      const sw = hot ? 3.2 : 2.2;
      outerRim
        .roundRect(-w * 0.5, -h * 0.5, w, h, rr)
        .stroke({ width: sw, color: col, alpha: hot ? 1 : 0.88 });
    };
    paintOuterRim(false);

    const tierBadge = new Container();
    const tw = card.tier === 'SSS' ? 46 : card.tier === 'SS' ? 38 : 30;
    const th = 24;
    const tbx = w * 0.5 - 10 - tw;
    const tby = -h * 0.5 + 10;
    const tierBg = new Graphics();
    tierBg
      .roundRect(tbx, tby, tw, th, 6)
      .fill({ color: tierPres.badgeBg, alpha: 0.96 })
      .stroke({ width: 1.5, color: tierPres.badgeStroke, alpha: 0.92 });
    const tierText = new Text({
      text: tierPres.label,
      style: new TextStyle({
        fontFamily: 'Arial Black, "Microsoft YaHei","PingFang SC",sans-serif',
        fontSize: card.tier === 'SSS' ? 11 : card.tier === 'SS' ? 12 : 13,
        fontWeight: 'bold',
        fill: tierPres.badgeText,
      }),
    });
    tierText.anchor.set(0.5, 0.5);
    tierText.position.set(tbx + tw * 0.5, tby + th * 0.5);
    tierBadge.addChild(tierBg, tierText);

    inner.addChild(shadow, face, sheen, emblem, innerRim, accentBar, outerRim, tierBadge);

    const title = new Text({
      text: card.title,
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 19,
        fontWeight: 'bold',
        fill: 0xfff6e8,
        align: 'center',
        letterSpacing: 0.5,
        wordWrap: true,
        wordWrapWidth: w - 28,
        lineHeight: 24,
        dropShadow: {
          alpha: 0.55,
          angle: Math.PI / 2,
          blur: 3,
          color: 0x000000,
          distance: 1,
        },
      }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(0, -22);

    const desc = new Text({
      text: card.description,
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 14,
        fill: 0xd8ccb8,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: w - 24,
        lineHeight: 22,
        letterSpacing: 0.3,
        dropShadow: {
          alpha: 0.35,
          angle: Math.PI / 2,
          blur: 2,
          color: 0x000000,
          distance: 1,
        },
      }),
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(0, 18);

    inner.addChild(title, desc);

    root.hitArea = new Rectangle(-w * 0.5, -h * 0.5, w, h);
    root.on('pointerover', () => {
      paintOuterRim(true);
      inner.scale.set(1.045);
    });
    root.on('pointerout', () => {
      paintOuterRim(false);
      inner.scale.set(1);
    });
    root.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._model.applyLevelUpChoice(card.id);
    });
    return root;
  }

  private _layoutLevelUp(): void {
    this._levelUpDim.clear();
    const dimGrad = new FillGradient({
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
      textureSpace: 'local',
    });
    dimGrad.addColorStop(0, 0x0c0a08);
    dimGrad.addColorStop(0.45, 0x080706);
    dimGrad.addColorStop(1, 0x12100c);
    this._levelUpDim.rect(0, 0, this._w, this._h).fill({ fill: dimGrad, alpha: 0.9 });

    const cx = this._w * 0.5;
    this._levelUpTitle.position.set(cx, this._h * 0.12);
    this._levelUpSubtitle.position.set(cx, this._h * 0.12 + 36);

    const cards = this._levelUpChoicesHolder.children as Container[];
    const n = cards.length;
    if (n === 0) {
      return;
    }
    const gap = 14;
    const side = 16;
    const { w: cw, h: ch } = this._levelUpCardMetrics();
    const maxRowW = this._w - side * 2;
    const rowW = n * cw + (n - 1) * gap;
    if (rowW <= maxRowW) {
      const startX = cx - rowW * 0.5 + cw * 0.5;
      const cy = this._h * 0.54;
      for (let i = 0; i < n; i++) {
        cards[i]!.position.set(startX + i * (cw + gap), cy);
      }
    } else {
      const colH = n * ch + (n - 1) * gap;
      const yMid = this._h * 0.52;
      const y0 = Math.max(this._h * 0.26 + ch * 0.5, yMid - colH * 0.5 + ch * 0.5);
      for (let i = 0; i < n; i++) {
        cards[i]!.position.set(cx, y0 + i * (ch + gap));
      }
    }
  }

  private _syncLevelUpVisibility(): void {
    const show = this._model.awaitingLevelUp;
    this._levelUpRoot.visible = show;
    const offerKey = show ? this._model.pendingLevelUpCards.map((c) => c.id).join('|') : '';
    if (show) {
      if (offerKey !== this._levelUpOfferKey) {
        this._levelUpOfferKey = offerKey;
        this._rebuildLevelUpCards();
      }
      this._layoutLevelUp();
      this._devRoot.visible = false;
    } else {
      this._levelUpOfferKey = '';
      this._devRoot.visible = this._devPanelOpen;
    }
  }

  /** 阵亡遮罩与返回首页 */
  private _buildGameOverUi(): void {
    this._gameOverDim.eventMode = 'static';
    this._gameOverRoot.addChild(this._gameOverDim);

    this._gameOverTitle = new Text({
      text: '战斗结束',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 32,
        fontWeight: 'bold',
        fill: 0xe8d4a8,
        align: 'center',
      }),
    });
    this._gameOverTitle.anchor.set(0.5);

    this._gameOverStats = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 16,
        fontWeight: '600',
        fill: 0xc8b8a0,
        align: 'center',
        lineHeight: 26,
        wordWrap: true,
        wordWrapWidth: 300,
      }),
    });
    this._gameOverStats.anchor.set(0.5);

    this._gameOverHint = new Text({
      text: '点击屏幕返回首页并结算',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 17,
        fill: 0x888888,
      }),
    });
    this._gameOverHint.anchor.set(0.5);

    this._gameOverRoot.addChild(this._gameOverTitle, this._gameOverStats, this._gameOverHint);

    this._gameOverDim.on('pointertap', () => {
      if (!this._model.gameOver || this._achievementSettled) {
        return;
      }
      this._achievementSettled = true;
      recordRunEndForAchievements({
        killsThisRun: this._model.sessionKills,
        died: true,
        survivalSec: this._model.gameTime,
      });
      exitGameToReactHome();
    });
  }

  private _layoutGameOver(): void {
    this._gameOverDim.clear();
    this._gameOverDim.rect(0, 0, this._w, this._h).fill({ color: 0x050403, alpha: 0.88 });
    const m = this._model;
    const chestN = m.sessionPurpleChestBundles.length;
    this._gameOverStats.style.wordWrapWidth = Math.min(320, this._w - 32);
    this._gameOverStats.text = [
      `存活 ${formatDurationCn(m.gameTime)}`,
      `击破 ${m.sessionKills}`,
      `本局紫箱 ${chestN} 次`,
    ].join('\n');
    this._gameOverTitle.position.set(this._w * 0.5, this._h * 0.34);
    this._gameOverStats.position.set(this._w * 0.5, this._h * 0.46);
    this._gameOverHint.position.set(this._w * 0.5, this._h * 0.62);
  }

  private _syncGameOverVisibility(): void {
    const show = this._model.gameOver;
    this._gameOverRoot.visible = show;
    if (show) {
      this._layoutGameOver();
    }
  }

  /** 扩容池并同步每个可见敌人的 `EnemyWorldVisual`；屏外敌人跳过 `sync` 以省 CPU */
  private _syncEnemyWorldVisuals(freezeMotion: boolean): void {
    const list = this._model.enemies;
    const pool = this._enemyVisualPool;
    while (pool.length < list.length) {
      const v = new EnemyWorldVisual();
      this._enemyLayer.addChild(v.root);
      pool.push(v);
    }
    const cull = this._enemyVisCullBounds();
    const detail: 'full' | 'simple' = list.length >= ENEMY_VISUAL_LOD_COUNT ? 'simple' : 'full';
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      const v = pool[i]!;
      if (!this._enemyRoughlyOnScreen(e, cull)) {
        v.root.visible = false;
        continue;
      }
      v.sync(e, freezeMotion, enemyKindFill(e.kind), enemyKindStroke(e.kind), detail);
      v.root.visible = true;
    }
    for (let i = list.length; i < pool.length; i++) {
      pool[i]!.root.visible = false;
    }
  }
}
