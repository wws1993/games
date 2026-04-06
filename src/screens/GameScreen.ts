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
  ELITE_ENEMY_FILL,
  ELITE_ENEMY_STROKE,
  ENEMY_VISUAL_LOD_COUNT,
  PLAYER_BASE_MAX_HP,
  PLAYER_DASH_BASE_COOLDOWN_SEC,
  PLAYER_MAX_LEVEL,
  PLAYER_RADIUS,
  RIFLE_BULLET_RADIUS,
  WORLD_SIZE,
} from '../game/survivor/constants';
import { EnemyWorldVisual, enemyKindFill, enemyKindStroke } from '../game/survivor/enemyWorldVisual';
import { drawMapGrassDecor } from '../game/survivor/mapGrassVisual';
import { drawObstacleOnMap } from '../game/survivor/obstacleVisual';
import { PlayerWorldVisual } from '../game/survivor/playerWorldVisual';
import { levelUpCardTierPresentation, type LevelUpCardDef } from '../game/config/levelUpCardsConfig';
import {
  computeRunCoinReward,
  getPaletteForActiveGame,
  getSelectedWeaponCosmetic,
  loadAchievementSave,
  recordRunEndForAchievements,
} from '../game/meta/achievementStore';
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
import { playGameOverSfx, playLevelUpConfirmSfx, playLevelUpPanelSfx } from '../game/audio/gameAudio';
import { PLAYER_WEAPON_CATEGORY_LABELS, PLAYER_WEAPON_DEFS } from '../game/config/playerWeaponsConfig';
import { SurvivorGameModel } from '../game/survivor/SurvivorGameModel';
import type { MoveInput } from '../game/survivor/types';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { exitGameToReactHome } from '../ui/shellBridge';
import { app } from '../utils/application';
import { formatDurationCn } from '../utils/formatDuration';
import type { AppScreen } from '../utils/navigation';

/** 全屏衬底与战场草地：与首页暖色渐变、橄榄绿场协调（仅用于 `_drawScreenBackdrop` / `_drawMapBackground`） */
const BATTLE_HOME_THEME = {
  /** 全屏衬底：对应 `linear-gradient(165deg, #fff0e0 … #f0a878)` */
  backdropStops: [0xfff0e0, 0xffd8c0, 0xffc8a8, 0xf0a878] as const,
  /** 战场草地：略偏暖的橄榄绿渐变 */
  mapFieldStops: [0x6b7a52, 0x556844, 0x4a5838] as const,
  /** 战场区域边界描边 */
  mapBorder: 0x8a7860,
} as const;

/** 局内 Pixi HUD：条槽、右上信息板、左下按钮、冲刺与弹药药丸共用，避免珊瑚/米白/亮绿各自为政 */
const HUD_THEME = {
  barRadius: 8,
  /** 条内边距：与圆角共同决定填充条可用宽度 */
  barInset: 3,
  /** 条槽底色 */
  barTrack: 0xfff7f0,
  barTrackAlpha: 0.94,
  barTrackInner: 0x5a4030,
  barTrackInnerAlpha: 0.12,
  /** 外描边：单层即可，替代原先白边+金边双线 */
  barStroke: 0xfff0e0,
  barStrokeAlpha: 0.88,
  barInnerStroke: 0xc49a30,
  barInnerStrokeAlpha: 0.16,
  hpGradTop: 0xff8860,
  hpGradBot: 0xe05848,
  xpGradTop: 0x6ab0d8,
  xpGradBot: 0x4a78a0,
  magGradTop: 0xe8d8a8,
  magGradBot: 0xa87840,
  reloadGradTop: 0xffc070,
  reloadGradBot: 0xd07028,
  /** 右上文案区：距屏边与顶偏移（无背景框，亮色靠描边压草地） */
  rightInnerPad: 11,
  rightPanelTopOffset: 4,
  /** 右上四行主色 */
  rightHudTimer: 0xfffef8,
  rightHudWeapon: 0xffe8a8,
  rightHudLevel: 0xff8a88,
  rightHudFps: 0x98ffc8,
  /** 共用描边，避免亮色发糊 */
  rightHudStroke: 0x2a1810,
  rightHudStrokeW: 1.6,
  /** 左上弹药文案药丸底 */
  ammoPillBg: 0x1a160c,
  ammoPillBgAlpha: 0.44,
  ammoPillStroke: 0xffecd8,
  ammoPillStrokeAlpha: 0.52,
  ammoPillRr: 10,
  /** 暂停 / 倍速：与 `.home-menu-btn` 同系渐变 */
  btnGradTop: 0xfffefb,
  btnGradBot: 0xffe8d8,
  btnStroke: 0xffffff,
  btnStrokeAlpha: 0.88,
  btnText: 0x5a3830,
  /** 冲刺：饱和度低于旧版橙钮，与外圈 CD 同属暖陶色系 */
  dashGradTop: 0xeeaa78,
  dashGradMid: 0xe09060,
  dashGradBot: 0xc47050,
  dashStroke: 0xffecd8,
  dashStrokeAlpha: 0.9,
  dashRingTrack: 0xfff7f0,
  dashRingTrackAlpha: 0.3,
  dashRingCd: 0xc87858,
  dashRingCdAlpha: 0.92,
  dashText: 0xfffaf5,
} as const;

/** 战术升级标题字号：随屏高缩放，接近首页标题 `clamp` 观感 */
function levelUpTitleFontPx(screenH: number): number {
  if (screenH <= 0) {
    return 30;
  }
  return Math.max(24, Math.min(34, Math.round(screenH * 0.042)));
}

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

  /** 左上血条下方：弹药余量 / 换弹 / 近战说明 */
  private readonly _ammoHudText: Text;
  /** 弹药文案背后的圆角药丸底，提高与草地对比度 */
  private readonly _ammoHudPill = new Graphics();
  private readonly _fpsText: Text;
  /** 开启宝箱后的短时提示（屏幕中下） */
  private readonly _chestToastText: Text;
  private readonly _levelUpRoot = new Container();
  private readonly _levelUpDim = new Graphics();
  /** 与首页 `page-home-subtitle` 类似的半透明药丸底 */
  private readonly _levelUpSubtitleBg = new Graphics();
  /** 与首页 `page-home-decor-star` 呼应的装饰星 */
  private readonly _levelUpDecor = new Container();
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
  /** 避免结算音效在同一局重复触发 */
  private _gameOverSfxPlayed = false;

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

  /** 右下角：触摸冲刺 */
  private readonly _dashFab = new Container();

  /** 触摸：上一把 / 下一把主武器（替代原键盘 Q/E） */
  private readonly _weaponPrevFab = new Container();
  private readonly _weaponNextFab = new Container();

  /** 触摸：手动换弹（替代原键盘 R；近战隐藏） */
  private readonly _reloadFab = new Container();

  /** 本帧是否已请求冲刺（冲刺触摸键点按） */
  private _dashQueued = false;

  /** Cordova Android 物理返回键：打开/关闭局内整备（替代已移除的「暂停」按钮） */
  private readonly _onCordovaBackButton = (ev: Event): void => {
    const m = this._model;
    if (m.manualPaused) {
      ev.preventDefault();
      closePauseEquipmentOverlay();
      return;
    }
    if (m.awaitingLevelUp) {
      ev.preventDefault();
      return;
    }
    if (m.gameOver) {
      return;
    }
    ev.preventDefault();
    openPauseEquipmentOverlay();
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

  /** 武器名+分类（右上单行）；弹药与换弹移至左下弹药条 */
  private _lastWeaponHudLine = '';

  /** 左下弹药条旁文案，变则触发 `_layoutHud` */
  private _lastAmmoHudLine = '';

  /** 右下角冲刺按钮边长（圆形，含外圈 CD 环） */
  private static readonly _DASH_FAB_PX = 60;

  /** 右下切枪触摸键边长（方形圆角） */
  private static readonly _WEAPON_FAB_PX = 44;

  /** 右下换弹触摸键尺寸（与左下倍率条钮风格一致） */
  private static readonly _RELOAD_FAB_W = 52;
  private static readonly _RELOAD_FAB_H = 34;

  /** 冲刺 CD 圆环：每帧重绘 */
  private readonly _dashCdRing = new Graphics();

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
    const rhs = HUD_THEME.rightHudStroke;
    const rsw = HUD_THEME.rightHudStrokeW;
    this._timeText = new Text({
      text: '00:00',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 21,
        fontWeight: 'bold',
        fill: HUD_THEME.rightHudTimer,
        stroke: { color: rhs, width: rsw },
        dropShadow: { blur: 0, distance: 1, color: 0x000000, alpha: 0.35 },
      }),
    });
    this._levelText = new Text({
      text: 'Lv 1',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 16,
        fontWeight: 'bold',
        fill: HUD_THEME.rightHudLevel,
        stroke: { color: rhs, width: rsw },
        dropShadow: { blur: 0, distance: 1, color: 0x000000, alpha: 0.3 },
      }),
    });
    this._weaponHudText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 13,
        fontWeight: '700',
        fill: HUD_THEME.rightHudWeapon,
        align: 'right',
        wordWrap: true,
        wordWrapWidth: 142,
        stroke: { color: rhs, width: rsw },
        lineHeight: 17,
      }),
    });
    this._ammoHudText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 12,
        fontWeight: '700',
        fill: 0xfff0e0,
        stroke: { color: 0x2a2018, width: 1.2 },
      }),
    });
    this._fpsText = new Text({
      text: '60 FPS',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 13,
        fontWeight: '700',
        fill: HUD_THEME.rightHudFps,
        stroke: { color: rhs, width: rsw },
        dropShadow: { blur: 0, distance: 1, color: 0x000000, alpha: 0.28 },
      }),
    });
    this._chestToastText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: hudFont,
        fontSize: 15,
        fontWeight: 'bold',
        fill: 0xfffaf0,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 320,
        stroke: { color: 0xc87858, width: 2 },
        dropShadow: { blur: 4, distance: 2, color: 0x502820, alpha: 0.4 },
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
    this._ammoHudPill.eventMode = 'none';
    this._hudRoot.addChild(
      this._hudGfx,
      this._ammoHudPill,
      this._ammoHudText,
      this._timeText,
      this._weaponHudText,
      this._levelText,
      this._fpsText,
      this._chestToastText,
      this._hpBarDevHit,
      this._dashFab,
    );

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
    const prof = loadAchievementSave();
    const pal = getPaletteForActiveGame(prof);
    const wcos = getSelectedWeaponCosmetic(prof);
    this._playerWorldVisual.setPlayerAppearance(pal, wcos.gunWood, wcos.gunMetal);
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
    this._lastWeaponHudLine = '';
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

  /** 淡入由导航 `show` 调用；注册 Cordova 返回键以开关整备层 */
  public async show(): Promise<void> {
    document.addEventListener('backbutton', this._onCordovaBackButton, false);
  }

  /** 离开战斗屏时关闭整备层并释放摇杆 */
  public async hide(): Promise<void> {
    document.removeEventListener('backbutton', this._onCordovaBackButton, false);
    closePauseEquipmentOverlay();
    registerPauseEquipment(null);
    this._joystick.dispose();
  }

  /** 驱动模型与绘制 */
  public update(ticker: Ticker): void {
    const fpsBlend = 0.15;
    this._fpsSmoothed += (ticker.FPS - this._fpsSmoothed) * fpsBlend;
    const dt = (ticker.deltaMS / 1000) * this._timeScale;
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
    this._dashFab.visible = steerOk;
    const melee = PLAYER_WEAPON_DEFS[this._model.equippedWeaponKind].category === 'melee';
    const multiW = this._model.ownedWeaponCount > 1;
    this._weaponPrevFab.visible = steerOk && multiW;
    this._weaponNextFab.visible = steerOk && multiW;
    this._reloadFab.visible = steerOk && !melee;
    this._playerWorldVisual.sync(this._model, dt, frozen);
    this._syncEnemyWorldVisuals(frozen);
    this._drawMapObstacles();
    this._drawWorldEntities();
    this._drawHud();
    this._syncDashFabVisual();
    this._syncLevelUpVisibility();
    this._syncGameOverVisibility();
    this._layoutMobileCombatFabs();
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
    if (this._devPanelOpen) {
      this._layoutDevPanel();
    }
    this._layoutLevelUp();
    this._layoutGameOver();
  }

  /** 右下角冲刺：圆形按钮 + 外圈 CD 环（`_syncDashFabVisual` 每帧刷新环） */
  private _buildDashFab(): void {
    const s = GameScreen._DASH_FAB_PX;
    const cx = s * 0.5;
    const cy = s * 0.5;
    this._dashFab.eventMode = 'static';
    this._dashFab.cursor = 'pointer';
    const dBg = new Graphics();
    const dg = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
    });
    dg.addColorStop(0, HUD_THEME.dashGradTop);
    dg.addColorStop(0.48, HUD_THEME.dashGradMid);
    dg.addColorStop(1, HUD_THEME.dashGradBot);
    dBg.circle(cx, cy, s * 0.42).fill({ fill: dg });
    dBg
      .circle(cx, cy, s * 0.42)
      .stroke({ width: 2, color: HUD_THEME.dashStroke, alpha: HUD_THEME.dashStrokeAlpha });
    const dTrack = new Graphics();
    dTrack
      .circle(cx, cy, s * 0.48)
      .stroke({ width: 3, color: HUD_THEME.dashRingTrack, alpha: HUD_THEME.dashRingTrackAlpha });
    this._dashCdRing.eventMode = 'none';
    const dTxt = new Text({
      text: '冲刺',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 14,
        fontWeight: '800',
        fill: HUD_THEME.dashText,
        dropShadow: { blur: 0, distance: 1, color: 0x302010, alpha: 0.35 },
      }),
    });
    dTxt.anchor.set(0.5);
    dTxt.position.set(cx, cy);
    this._dashFab.hitArea = new Rectangle(0, 0, s, s);
    this._dashFab.addChild(dBg, dTrack, this._dashCdRing, dTxt);
    this._dashFab.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._dashQueued = true;
    });
  }

  /** 右下：‹ › 切主武器（与左下倍率钮同系渐变） */
  private _buildWeaponSwitchFabs(): void {
    const s = GameScreen._WEAPON_FAB_PX;
    const mk = (label: string, delta: number): void => {
      const root = delta < 0 ? this._weaponPrevFab : this._weaponNextFab;
      root.removeChildren();
      root.eventMode = 'static';
      root.cursor = 'pointer';
      const bg = new Graphics();
      const pg = new FillGradient({
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
        textureSpace: 'local',
      });
      pg.addColorStop(0, HUD_THEME.btnGradTop);
      pg.addColorStop(1, HUD_THEME.btnGradBot);
      bg.roundRect(0, 0, s, s, 10).fill({ fill: pg });
      bg.roundRect(0, 0, s, s, 10).stroke({ width: 2, color: HUD_THEME.btnStroke, alpha: HUD_THEME.btnStrokeAlpha });
      const t = new Text({
        text: label,
        style: new TextStyle({
          fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
          fontSize: 22,
          fontWeight: '800',
          fill: HUD_THEME.btnText,
        }),
      });
      t.anchor.set(0.5);
      t.position.set(s * 0.5, s * 0.5);
      root.hitArea = new Rectangle(0, 0, s, s);
      root.addChild(bg, t);
      root.on('pointertap', (e: FederatedPointerEvent) => {
        e.stopPropagation();
        this._model.cycleWeapon(delta);
      });
    };
    mk('‹', -1);
    mk('›', 1);
    this._hudRoot.addChild(this._weaponPrevFab, this._weaponNextFab);
  }

  /** 右下：换弹条钮（近战不显示，由 `update` 控制 `visible`） */
  private _buildReloadFab(): void {
    const w = GameScreen._RELOAD_FAB_W;
    const h = GameScreen._RELOAD_FAB_H;
    this._reloadFab.eventMode = 'static';
    this._reloadFab.cursor = 'pointer';
    const bg = new Graphics();
    const pg = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
    });
    pg.addColorStop(0, HUD_THEME.btnGradTop);
    pg.addColorStop(1, HUD_THEME.btnGradBot);
    bg.roundRect(0, 0, w, h, 10).fill({ fill: pg });
    bg.roundRect(0, 0, w, h, 10).stroke({ width: 2, color: HUD_THEME.btnStroke, alpha: HUD_THEME.btnStrokeAlpha });
    const txt = new Text({
      text: '换弹',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 14,
        fontWeight: '800',
        fill: HUD_THEME.btnText,
      }),
    });
    txt.anchor.set(0.5);
    txt.position.set(w * 0.5, h * 0.5);
    this._reloadFab.hitArea = new Rectangle(0, 0, w, h);
    this._reloadFab.addChild(bg, txt);
    this._reloadFab.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._model.requestWeaponReload();
    });
    this._hudRoot.addChild(this._reloadFab);
  }

  /** 冲刺冷却剩余弧长 = `dashCooldownLeft / 基准冷却`；就绪时不画弧 */
  private _syncDashFabVisual(): void {
    const s = GameScreen._DASH_FAB_PX;
    const cx = s * 0.5;
    const cy = s * 0.5;
    const ringR = s * 0.48;
    const m = this._model;
    const dcm = Number.isFinite(m.dashCooldownMult) && m.dashCooldownMult > 0 ? m.dashCooldownMult : 1;
    const maxCd = PLAYER_DASH_BASE_COOLDOWN_SEC * dcm;
    const g = this._dashCdRing;
    g.clear();
    if (m.dashCooldownLeft <= 1e-4 || maxCd <= 1e-6) {
      return;
    }
    const ratio = Math.min(1, Math.max(0, m.dashCooldownLeft / maxCd));
    const sweep = ratio * Math.PI * 2;
    const start = -Math.PI / 2;
    const end = start + sweep;
    g.arc(cx, cy, ringR, start, end, false);
    g.stroke({ width: 4, color: HUD_THEME.dashRingCd, alpha: HUD_THEME.dashRingCdAlpha });
  }

  /** 仅虚拟摇杆；暂停或弹窗时摇杆禁用；冲刺触摸键沿触发冲刺 */
  private _readMoveInput(): MoveInput {
    const m = this._model;
    const canSteer = !m.gameOver && !m.paused && !m.awaitingLevelUp && !m.manualPaused;
    this._joystick.setInteractiveEnabled(canSteer);

    const { analogX, analogY } = this._joystick.getAnalog();
    const mag = Math.hypot(analogX, analogY);
    const useStick = mag > 0.02;

    const input = this._moveInputCache;
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
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

  /** 右下冲刺/切枪/换弹与左下倍率触摸键位置（每帧更新，因近战与多武器显隐会变） */
  private _layoutMobileCombatFabs(): void {
    const pad = 14;
    const bottomPad = pad;
    const cornerH = GameScreen._CORNER_DEV_HUD_OUTER_H;
    this._cornerDevHud.position.set(bottomPad, this._h - bottomPad - cornerH);

    const dashS = GameScreen._DASH_FAB_PX;
    const dashX = this._w - pad - dashS;
    const dashY = this._h - bottomPad - dashS - 8;
    this._dashFab.position.set(dashX, dashY);

    const wBtn = GameScreen._WEAPON_FAB_PX;
    const wGap = 6;
    const weaponRowW = wBtn * 2 + wGap;
    const weaponRowX = this._w - pad - weaponRowW;
    const melee = PLAYER_WEAPON_DEFS[this._model.equippedWeaponKind].category === 'melee';
    const fabGap = 8;
    let stackTop = dashY;
    if (!melee) {
      const rw = GameScreen._RELOAD_FAB_W;
      const rh = GameScreen._RELOAD_FAB_H;
      const reloadY = dashY - fabGap - rh;
      this._reloadFab.position.set(dashX + (dashS - rw) * 0.5, reloadY);
      stackTop = reloadY;
    }
    const weaponY = stackTop - fabGap - wBtn;
    this._weaponPrevFab.position.set(weaponRowX, weaponY);
    this._weaponNextFab.position.set(weaponRowX + wBtn + wGap, weaponY);
  }

  /** 全屏衬底：与首页 `page-home` 暖色渐变一致，相机边缘外不露冷灰 */
  private _drawScreenBackdrop(): void {
    const g = this._screenBackdrop;
    g.clear();
    const soil = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      textureSpace: 'local',
    });
    const st = BATTLE_HOME_THEME.backdropStops;
    soil.addColorStop(0, st[0]!);
    soil.addColorStop(0.38, st[1]!);
    soil.addColorStop(0.72, st[2]!);
    soil.addColorStop(1, st[3]!);
    g.rect(0, 0, this._w, this._h).fill({ fill: soil });
    const glow = new FillGradient({
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 0.85 },
      textureSpace: 'local',
    });
    glow.addColorStop(0, 0xffecd8);
    glow.addColorStop(0.55, 0xffc8a8);
    glow.addColorStop(1, 0xf0a878);
    g.rect(0, 0, this._w, this._h * 0.42).fill({ fill: glow, alpha: 0.22 });
  }

  /** 绘制 800×800 战场草地：偏暖橄榄绿，与首页暖底协调 */
  private _drawMapBackground(): void {
    const g = this._mapBg;
    g.clear();
    const m = WORLD_SIZE;
    const soil = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      textureSpace: 'local',
    });
    const mf = BATTLE_HOME_THEME.mapFieldStops;
    soil.addColorStop(0, mf[0]!);
    soil.addColorStop(0.5, mf[1]!);
    soil.addColorStop(1, mf[2]!);
    g.rect(0, 0, m, m).fill({ fill: soil });
    g.rect(0, 0, m, m).stroke({ width: 3, color: BATTLE_HOME_THEME.mapBorder, alpha: 0.88 });
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
    g.circle(m.playerX, m.playerY, pr).stroke({ width: 1.2, color: 0xfffaf0, alpha: 0.22 });
  }

  /** 左上血/经验/弹药条与 `_layoutHud` 共用几何，避免面板与 HUD 绘图错位；返回 pad、各条 Y 与 barW */
  private _hudLeftLayoutMetrics(): {
    pad: number;
    barW: number;
    barH: number;
    hpY: number;
    xpY: number;
    magY: number;
    magBarH: number;
    rr: number;
  } {
    const pad = 14;
    const barW = Math.min(220, this._w * 0.48);
    const barH = 16;
    const hpY = pad + 6;
    const xpY = hpY + barH + 10;
    const magY = xpY + barH + 8;
    const magBarH = 12;
    const rr = HUD_THEME.barRadius;
    return { pad, barW, barH, hpY, xpY, magY, magBarH, rr };
  }

  /** 左上角血条/经验条/弹药，右上时间/武器/等级/FPS 文案（无衬底框） */
  private _drawHud(): void {
    const g = this._hudGfx;
    g.clear();
    const m = this._model;
    const met = this._hudLeftLayoutMetrics();
    const { pad, barW, barH, hpY, xpY, magY, magBarH, rr } = met;
    const inset = HUD_THEME.barInset;

    const drawBarShell = (y: number): void => {
      g.roundRect(pad, y, barW, barH, rr).fill({ color: HUD_THEME.barTrack, alpha: HUD_THEME.barTrackAlpha });
      g.roundRect(pad, y, barW, barH, rr).stroke({
        width: 2,
        color: HUD_THEME.barStroke,
        alpha: HUD_THEME.barStrokeAlpha,
      });
      g.roundRect(pad, y, barW, barH, rr).stroke({
        width: 1.5,
        color: HUD_THEME.barInnerStroke,
        alpha: HUD_THEME.barInnerStrokeAlpha,
      });
      g.roundRect(pad + inset, y + inset, barW - inset * 2, barH - inset * 2, rr - 2).fill({
        color: HUD_THEME.barTrackInner,
        alpha: HUD_THEME.barTrackInnerAlpha,
      });
    };
    drawBarShell(hpY);
    const hpRatio = m.playerMaxHp > 0 ? m.playerHp / m.playerMaxHp : 0;
    const hpFillW = Math.max(0, (barW - inset * 2) * hpRatio);
    if (hpFillW > 0.5) {
      const hpg = new FillGradient({
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
        textureSpace: 'local',
      });
      hpg.addColorStop(0, HUD_THEME.hpGradTop);
      hpg.addColorStop(1, HUD_THEME.hpGradBot);
      g.roundRect(pad + inset, hpY + inset, hpFillW, barH - inset * 2, rr - 3).fill({ fill: hpg });
    }

    drawBarShell(xpY);
    const xpRatio =
      m.xpToNext > 0 ? Math.min(1, m.xp / m.xpToNext) : m.level >= PLAYER_MAX_LEVEL ? 1 : 0;
    const xpFillW = Math.max(0, (barW - inset * 2) * xpRatio);
    if (xpFillW > 0.5) {
      const xpg = new FillGradient({
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
        textureSpace: 'local',
      });
      xpg.addColorStop(0, HUD_THEME.xpGradTop);
      xpg.addColorStop(1, HUD_THEME.xpGradBot);
      g.roundRect(pad + inset, xpY + inset, xpFillW, barH - inset * 2, rr - 3).fill({ fill: xpg });
    }

    const magRr = Math.max(4, rr - 2);
    const wd = PLAYER_WEAPON_DEFS[m.equippedWeaponKind];
    const drawMagShell = (y: number, h: number): void => {
      g.roundRect(pad, y, barW, h, magRr).fill({ color: HUD_THEME.barTrack, alpha: HUD_THEME.barTrackAlpha });
      g.roundRect(pad, y, barW, h, magRr).stroke({
        width: 1.5,
        color: HUD_THEME.barStroke,
        alpha: HUD_THEME.barStrokeAlpha * 0.92,
      });
      g.roundRect(pad + inset, y + inset, barW - inset * 2, h - inset * 2, magRr - 2).fill({
        color: HUD_THEME.barTrackInner,
        alpha: HUD_THEME.barTrackInnerAlpha * 0.67,
      });
    };
    if (wd.category !== 'melee') {
      drawMagShell(magY, magBarH);
      const innerW = barW - inset * 2;
      if (m.rifleReloadRemaining > 0 && m.rifleReloadTotalSec > 1e-6) {
        const rp = Math.min(1, Math.max(0, 1 - m.rifleReloadRemaining / m.rifleReloadTotalSec));
        const reloadW = Math.max(0, innerW * rp);
        if (reloadW > 0.5) {
          const rg = new FillGradient({
            start: { x: 0, y: 0 },
            end: { x: 0, y: 1 },
            textureSpace: 'local',
          });
          rg.addColorStop(0, HUD_THEME.reloadGradTop);
          rg.addColorStop(1, HUD_THEME.reloadGradBot);
          g.roundRect(pad + inset, magY + inset, reloadW, magBarH - inset * 2, magRr - 3).fill({
            fill: rg,
          });
        }
      } else {
        const magRatio =
          m.rifleMagazineSize > 0 ? Math.min(1, m.rifleMagAmmo / m.rifleMagazineSize) : 0;
        const magFillW = Math.max(0, innerW * magRatio);
        if (magFillW > 0.5) {
          const mg = new FillGradient({
            start: { x: 0, y: 0 },
            end: { x: 0, y: 1 },
            textureSpace: 'local',
          });
          mg.addColorStop(0, HUD_THEME.magGradTop);
          mg.addColorStop(1, HUD_THEME.magGradBot);
          g.roundRect(pad + inset, magY + inset, magFillW, magBarH - inset * 2, magRr - 3).fill({
            fill: mg,
          });
        }
      }
    }

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
    }

    const wd2 = PLAYER_WEAPON_DEFS[m.equippedWeaponKind];
    const weaponLine = `${wd2.displayName} · ${PLAYER_WEAPON_CATEGORY_LABELS[wd2.category]}`;
    let weaponHudLayoutNeeded = false;
    if (weaponLine !== this._lastWeaponHudLine) {
      this._lastWeaponHudLine = weaponLine;
      this._weaponHudText.text = weaponLine;
      weaponHudLayoutNeeded = true;
    }

    const ammoHudLabel = wd2.category === 'melee' ? '近战' : '弹药';
    const ammoLine =
      wd2.category === 'melee'
        ? '近战模式 · 扇形挥击'
        : m.rifleReloadRemaining > 0
          ? `换弹中 ${m.rifleReloadRemaining.toFixed(1)}s`
          : `${ammoHudLabel} ${m.rifleMagAmmo} / ${m.rifleMagazineSize}`;
    let ammoHudLayoutNeeded = false;
    if (ammoLine !== this._lastAmmoHudLine) {
      this._lastAmmoHudLine = ammoLine;
      this._ammoHudText.text = ammoLine;
      ammoHudLayoutNeeded = true;
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

    if (
      hudMetaChanged ||
      this._devPanelOpen ||
      fpsLabelChanged ||
      weaponHudLayoutNeeded ||
      ammoHudLayoutNeeded
    ) {
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
    const met = this._hudLeftLayoutMetrics();
    const { pad, magY, magBarH } = met;
    const wd = PLAYER_WEAPON_DEFS[this._model.equippedWeaponKind];
    const ammoTextY = wd.category === 'melee' ? magY : magY + magBarH + 4;
    const ins = HUD_THEME.rightInnerPad;
    const rpY = pad + HUD_THEME.rightPanelTopOffset;
    const innerRight = this._w - pad - ins;

    const pill = this._ammoHudPill;
    pill.clear();
    const pw = Math.max(44, this._ammoHudText.width + 18);
    const ph = 24;
    const px = pad - 3;
    const py = ammoTextY - 5;
    pill
      .roundRect(px, py, pw, ph, HUD_THEME.ammoPillRr)
      .fill({ color: HUD_THEME.ammoPillBg, alpha: HUD_THEME.ammoPillBgAlpha });
    pill
      .roundRect(px, py, pw, ph, HUD_THEME.ammoPillRr)
      .stroke({ width: 1.5, color: HUD_THEME.ammoPillStroke, alpha: HUD_THEME.ammoPillStrokeAlpha });
    this._ammoHudText.position.set(pad + 7, ammoTextY);

    this._layoutMobileCombatFabs();

    const row0 = rpY + ins;
    this._timeText.position.set(innerRight - this._timeText.width, row0);
    const weaponY = row0 + Math.max(24, this._timeText.height) + 4;
    this._weaponHudText.position.set(innerRight - this._weaponHudText.width, weaponY);
    const levelY = weaponY + this._weaponHudText.height + 6;
    this._levelText.position.set(innerRight - this._levelText.width, levelY);
    const fpsY = levelY + Math.max(18, this._levelText.height) + 3;
    this._fpsText.position.set(innerRight - this._fpsText.width, fpsY);
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

  /** 左下角倍率按钮总高度（与 `_buildCornerDevHud` 中 `padBg*2 + bhStack` 一致） */
  private static readonly _CORNER_DEV_HUD_OUTER_H = 42;

  /** 左下角倍率可点区域宽度（与 `_makeCornerTapRow` 一致） */
  private static readonly _CORNER_RATE_BTN_W = 52;

  /** 左下角 HUD：逻辑时间倍率（点击循环）；血条三连击后的作弊项在右下角 `_devCheatDock` */
  private _buildCornerDevHud(): void {
    this._cornerDevHud.eventMode = 'static';
    const bg = new Graphics();
    const bw = GameScreen._CORNER_RATE_BTN_W;
    const bhStack = 30;
    const padBg = 6;
    const hTotal = GameScreen._CORNER_DEV_HUD_OUTER_H;
    const wTotal = bw + padBg * 2;
    const cgrad = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
    });
    cgrad.addColorStop(0, HUD_THEME.btnGradTop);
    cgrad.addColorStop(1, HUD_THEME.btnGradBot);
    bg.roundRect(0, 0, wTotal, hTotal, 10).fill({ fill: cgrad });
    bg.roundRect(0, 0, wTotal, hTotal, 10).stroke({
      width: 2,
      color: HUD_THEME.btnStroke,
      alpha: HUD_THEME.btnStrokeAlpha,
    });
    const font = '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';
    this._cornerRateLabel = new Text({
      text: '',
      style: new TextStyle({ fontFamily: font, fontSize: 17, fontWeight: '900', fill: HUD_THEME.btnText }),
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
    const bw = GameScreen._CORNER_RATE_BTN_W;
    const bh = 28;
    const hit = new Graphics();
    hit.rect(0, 0, bw, bh).fill({ color: 0xfff5ee, alpha: 0.12 });
    label.anchor.set(0.5, 0.5);
    label.position.set(bw * 0.5, bh * 0.5);
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
      this._cornerRateLabel.text = `X${getDevTimeScale()}`;
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
        fontWeight: '900',
        letterSpacing: 2,
        fill: 0xfffaf0,
        align: 'center',
        stroke: { color: 0xa85c40, width: 3 },
        dropShadow: {
          alpha: 0.4,
          angle: Math.PI / 2,
          blur: 2,
          color: 0x502820,
          distance: 4,
        },
      }),
    });
    this._levelUpTitle.anchor.set(0.5, 0.5);
    this._levelUpSubtitle = new Text({
      text: '点选一张卡片获得强化',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 15,
        fontWeight: '700',
        fill: 0x8a5048,
        letterSpacing: 1,
        align: 'center',
      }),
    });
    this._levelUpSubtitle.anchor.set(0.5, 0.5);

    const starStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei","PingFang SC",sans-serif',
      fontSize: 15,
      fontWeight: '700',
      fill: 0xff9078,
      dropShadow: {
        alpha: 0.85,
        angle: Math.PI / 2,
        blur: 6,
        color: 0xffc8a8,
        distance: 0,
      },
    });
    for (const sx of [-40, 0, 40]) {
      const st = new Text({ text: sx === 0 ? '✦' : '★', style: starStyle });
      st.anchor.set(0.5);
      st.position.set(sx, 0);
      this._levelUpDecor.addChild(st);
    }

    this._levelUpRoot.addChild(this._levelUpDecor);
    this._levelUpRoot.addChild(this._levelUpTitle);
    this._levelUpRoot.addChild(this._levelUpSubtitleBg);
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
    if (k === 'critOnHitDamageMult') {
      return 0xff7040;
    }
    if (k === 'luckMult') {
      return 0xe06090;
    }
    if (k === 'pushObstacles') {
      return 0xb89868;
    }
    return 0xc9a030;
  }

  /** 卡片顶部圆章与准星；浅色底板用略深描边，避免与首页暖色磁贴糊成一片 */
  private _paintLevelUpCardEmblem(g: Graphics, accent: number, halfH: number): void {
    const cy = -halfH + Math.min(36, halfH * 0.44);
    const r0 = Math.min(22, halfH * 0.34);
    const r1 = Math.min(18, r0 * 0.85);
    const tick = Math.min(9, r0 * 0.42);
    g.circle(0, cy, r0 + 4).fill({ color: 0xffffff, alpha: 0.4 });
    g.circle(0, cy, r0).fill({ color: accent, alpha: 0.78 });
    g.circle(0, cy, r0).stroke({ width: 2, color: 0xc08068, alpha: 0.85 });
    g.circle(0, cy, r1 * 0.38).fill({ color: 0x4a3830, alpha: 0.65 });
    g.moveTo(-tick, cy).lineTo(tick, cy).stroke({ width: 1.5, color: 0xfffaf5, alpha: 0.75 });
    g.moveTo(0, cy - tick).lineTo(0, cy + tick).stroke({ width: 1.5, color: 0xfffaf5, alpha: 0.75 });
  }

  /** 竖屏单列：保证标题+说明+底条留白，避免长文案贴底条 */
  private _levelUpCardMetrics(): { w: number; h: number } {
    const side = 16;
    const w = Math.min(320, Math.max(200, this._w - side * 2));
    const h = Math.min(162, Math.max(134, Math.round(w * 0.48)));
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
    shadow.roundRect(-w * 0.5 + 3, -h * 0.5 + 5, w, h, rr).fill({ color: 0x884020, alpha: 0.32 });

    const faceGrad = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
    });
    // 与首页 `home-menu-btn` 浅色渐变同系
    faceGrad.addColorStop(0, 0xfffefb);
    faceGrad.addColorStop(0.48, 0xffead8);
    faceGrad.addColorStop(1, 0xffd0b8);

    const face = new Graphics();
    face.roundRect(-w * 0.5, -h * 0.5, w, h, rr).fill({ fill: faceGrad });

    const topSheen = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0.42 },
      textureSpace: 'local',
    });
    topSheen.addColorStop(0, accent);
    topSheen.addColorStop(0.55, accent);
    topSheen.addColorStop(1, accent);

    const sheenH = Math.min(54, Math.round(h * 0.38));
    const sheen = new Graphics();
    sheen.roundRect(-w * 0.5 + 3, -h * 0.5 + 3, w - 6, sheenH, rr - 3).fill({
      fill: topSheen,
      alpha: 0.11,
    });

    const emblem = new Graphics();
    this._paintLevelUpCardEmblem(emblem, accent, halfH);

    const innerRim = new Graphics();
    innerRim.roundRect(-w * 0.5 + 5, -h * 0.5 + 5, w - 10, h - 10, rr - 5).stroke({
      width: 1.5,
      color: 0xffffff,
      alpha: 0.55,
    });

    const accentBar = new Graphics();
    accentBar
      .roundRect(-w * 0.5 + 12, h * 0.5 - 20, w - 24, 3, 2)
      .fill({ color: accent, alpha: 0.88 });

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
    const tby = -h * 0.5 + 12;
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

    const textPadX = 36;
    const wrapW = Math.max(72, w - textPadX);
    const title = new Text({
      text: card.title,
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 18,
        fontWeight: '800',
        fill: 0x5a3830,
        align: 'center',
        letterSpacing: 0.4,
        wordWrap: true,
        wordWrapWidth: wrapW,
        // 无空格时整段为一个 token，须 breakWords 才能在 wordWrapWidth 内拆行
        breakWords: true,
        lineHeight: 24,
      }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(0, -halfH * 0.26);

    const desc = new Text({
      text: card.description,
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 13,
        fill: 0x7a5850,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: wrapW,
        breakWords: true,
        lineHeight: 21,
        letterSpacing: 0.2,
      }),
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(0, title.y + title.height + 11);

    inner.addChild(title, desc);

    root.hitArea = new Rectangle(-w * 0.5, -h * 0.5, w, h);
    root.on('pointerover', () => {
      paintOuterRim(true);
      inner.scale.set(1.03);
    });
    root.on('pointerout', () => {
      paintOuterRim(false);
      inner.scale.set(1);
    });
    root.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      const wasAwaiting = this._model.awaitingLevelUp;
      this._model.applyLevelUpChoice(card.id);
      if (wasAwaiting && !this._model.awaitingLevelUp) {
        playLevelUpConfirmSfx();
      }
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
    // 与首页 `.page-home` 一致的暖色光晕 + 斜向渐变（简化为纵向多段）
    dimGrad.addColorStop(0, 0xfff8f0);
    dimGrad.addColorStop(0.38, 0xffe0c8);
    dimGrad.addColorStop(0.72, 0xffc8a8);
    dimGrad.addColorStop(1, 0xf09868);
    this._levelUpDim.rect(0, 0, this._w, this._h).fill({ fill: dimGrad, alpha: 0.92 });

    const cx = this._w * 0.5;
    const titleY = this._h * 0.118;
    const subY = titleY + 44;
    this._levelUpTitle.style.fontSize = levelUpTitleFontPx(this._h);
    this._levelUpTitle.position.set(cx, titleY);
    this._levelUpSubtitle.position.set(cx, subY);
    this._levelUpDecor.position.set(cx, this._h * 0.066);

    this._levelUpSubtitleBg.clear();
    const padX = 20;
    const padY = 9;
    const sw = this._levelUpSubtitle.width + padX * 2;
    const sh = this._levelUpSubtitle.height + padY * 2;
    const pillR = Math.min(999, sh * 0.5);
    this._levelUpSubtitleBg
      .roundRect(cx - sw * 0.5, subY - sh * 0.5, sw, sh, pillR)
      .fill({ color: 0xffffff, alpha: 0.55 })
      .stroke({ width: 2, color: 0xffffff, alpha: 0.88 });

    const cards = this._levelUpChoicesHolder.children as Container[];
    const n = cards.length;
    if (n === 0) {
      return;
    }
    const gap = 20;
    const side = 16;
    const { w: cw, h: ch } = this._levelUpCardMetrics();
    const maxRowW = this._w - side * 2;
    const rowW = n * cw + (n - 1) * gap;
    if (rowW <= maxRowW) {
      const startX = cx - rowW * 0.5 + cw * 0.5;
      const cy = this._h * 0.548;
      for (let i = 0; i < n; i++) {
        cards[i]!.position.set(startX + i * (cw + gap), cy);
      }
    } else {
      const colH = n * ch + (n - 1) * gap;
      const yMid = this._h * 0.528;
      const y0 = Math.max(this._h * 0.228 + ch * 0.5, yMid - colH * 0.5 + ch * 0.5);
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
        playLevelUpPanelSfx();
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
    const coinGain = computeRunCoinReward({
      killsThisRun: m.sessionKills,
      survivalSec: m.gameTime,
    });
    this._gameOverStats.text = [
      `存活 ${formatDurationCn(m.gameTime)}`,
      `击破 ${m.sessionKills}`,
      `本局紫箱 ${chestN} 次`,
      `本局金币 +${coinGain}（返回首页时入账）`,
    ].join('\n');
    this._gameOverTitle.position.set(this._w * 0.5, this._h * 0.34);
    this._gameOverStats.position.set(this._w * 0.5, this._h * 0.46);
    this._gameOverHint.position.set(this._w * 0.5, this._h * 0.62);
  }

  private _syncGameOverVisibility(): void {
    const show = this._model.gameOver;
    if (show && !this._gameOverSfxPlayed) {
      this._gameOverSfxPlayed = true;
      playGameOverSfx();
    }
    if (!show) {
      this._gameOverSfxPlayed = false;
    }
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
      const fill = e.isElite ? ELITE_ENEMY_FILL : enemyKindFill(e.kind);
      const stroke = e.isElite ? ELITE_ENEMY_STROKE : enemyKindStroke(e.kind);
      v.sync(e, freezeMotion, fill, stroke, detail);
      v.root.visible = true;
    }
    for (let i = list.length; i < pool.length; i++) {
      pool[i]!.root.visible = false;
    }
  }
}
