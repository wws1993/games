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
  PLAYER_RADIUS,
  RIFLE_BULLET_RADIUS,
  WORLD_SIZE,
} from '../game/survivor/constants';
import type { EnemyKind } from '../game/survivor/enemyDefs';
import { SurvivorGameModel } from '../game/survivor/SurvivorGameModel';
import type { LevelUpChoiceId, MoveInput } from '../game/survivor/types';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { app } from '../utils/application';
import type { AppScreen } from '../utils/navigation';
import { navigation } from '../utils/navigation';

/** 玩法屏：阶段 1 核心循环（移动、步枪、步兵、经验、升级三选一、HUD） */
export class GameScreen extends Container implements AppScreen {
  /** 屏幕唯一标识，供导航缓存 */
  public static SCREEN_ID = 'survivor_game';

  private readonly _model = new SurvivorGameModel();
  /** 屏幕空间全屏底色，避免相机外露出白底 */
  private readonly _screenBackdrop = new Graphics();
  private readonly _worldRoot = new Container();
  private readonly _mapBg = new Graphics();
  private readonly _worldGfx = new Graphics();
  private readonly _hudRoot = new Container();
  private readonly _hudGfx = new Graphics();
  private readonly _timeText: Text;
  private readonly _levelText: Text;
  private readonly _levelUpRoot = new Container();
  private readonly _levelUpDim = new Graphics();
  private readonly _levelUpTitle!: Text;
  private readonly _levelUpChoices: Container[] = [];
  private readonly _gameOverRoot = new Container();
  private readonly _gameOverDim = new Graphics();
  private readonly _gameOverTitle: Text;
  private readonly _gameOverHint: Text;

  private readonly _joystick: VirtualJoystick;

  /** 覆盖在血条上的透明热区：连续三次点击切换开发者面板 */
  private readonly _hpBarDevHit = new Graphics();
  /** 开发者倍速等选项（发布前可整段移除） */
  private readonly _devRoot = new Container();
  private readonly _devBg = new Graphics();
  private _devTitle!: Text;
  private _devSpeedLabel!: Text;
  private _devCloseRow!: Container;

  private _devPanelOpen = false;
  /** 局内逻辑时间倍率，仅影响 `SurvivorGameModel.step` 的 dt */
  private _timeScale = 1;
  private _hpTapCount = 0;
  private _hpTapLastMs = 0;

  private readonly _keys = new Set<string>();
  private _onKeyDown = (e: KeyboardEvent): void => {
    this._keys.add(e.code);
  };
  private _onKeyUp = (e: KeyboardEvent): void => {
    this._keys.delete(e.code);
  };

  private _w = 0;
  private _h = 0;
  private _worldScale = 1;

  constructor() {
    super();

    this._screenBackdrop.eventMode = 'none';
    this._mapBg.eventMode = 'none';
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

    this._worldRoot.addChild(this._mapBg, this._worldGfx);

    this._hpBarDevHit.eventMode = 'static';
    this._hpBarDevHit.cursor = 'default';
    this._hpBarDevHit.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._onHealthBarTripleTap();
    });
    this._hudRoot.addChild(this._hudGfx, this._timeText, this._levelText, this._hpBarDevHit);

    this._buildLevelUpUi();
    this._buildGameOverUi();
    this._buildDevPanel();

    this.addChild(
      this._screenBackdrop,
      this._worldRoot,
      this._hudRoot,
      this._joystick,
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
    this._model.reset();
    this._levelUpRoot.visible = false;
    this._gameOverRoot.visible = false;
    this._devPanelOpen = false;
    this._devRoot.visible = false;
    this._timeScale = 1;
    this._hpTapCount = 0;
    this._updateDevSpeedLabel();
    this._drawMapBackground();
  }

  /** 订阅键盘；淡入由导航 `show` 调用，此处无需异步 */
  public async show(): Promise<void> {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  /** 取消键盘订阅 */
  public async hide(): Promise<void> {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this._keys.clear();
    this._joystick.dispose();
  }

  /** 驱动模型与绘制 */
  public update(ticker: Ticker): void {
    const dt = (ticker.deltaMS / 1000) * this._timeScale;
    this._model.step(dt, this._readMoveInput());
    this._syncCameraAndWorld();
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
    this._drawMapBackground();
    this._joystick.layout(w, h);
    this._layoutHud();
    this._layoutLevelUp();
    this._layoutGameOver();
  }

  /** 摇杆优先，其次 WASD / 方向键；暂停或弹窗时摇杆禁用 */
  private _readMoveInput(): MoveInput {
    const m = this._model;
    const canSteer = !m.gameOver && !m.paused && !m.awaitingLevelUp;
    this._joystick.setInteractiveEnabled(canSteer);

    const { analogX, analogY } = this._joystick.getAnalog();
    const mag = Math.hypot(analogX, analogY);
    const useStick = mag > 0.02;

    const input: MoveInput = {
      up: this._keys.has('KeyW') || this._keys.has('ArrowUp'),
      down: this._keys.has('KeyS') || this._keys.has('ArrowDown'),
      left: this._keys.has('KeyA') || this._keys.has('ArrowLeft'),
      right: this._keys.has('KeyD') || this._keys.has('ArrowRight'),
    };
    if (useStick) {
      input.analogX = analogX;
      input.analogY = analogY;
    }
    return input;
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

    for (const o of this._model.obstacles) {
      g.rect(o.x, o.y, o.w, o.h).fill({ color: 0x3a3228, alpha: 0.92 });
      g.rect(o.x, o.y, o.w, o.h).stroke({ width: 2, color: 0x1a1510, alpha: 0.75 });
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

  /** 重绘动态实体（玩家、敌、弹、宝石） */
  private _drawWorldEntities(): void {
    const g = this._worldGfx;
    g.clear();
    const m = this._model;

    g.circle(m.playerX, m.playerY, PLAYER_RADIUS).fill({ color: 0xffcc44 });
    g.circle(m.playerX, m.playerY, PLAYER_RADIUS).stroke({ width: 2, color: 0x5c3a12 });

    for (const e of m.enemies) {
      const fill = GameScreen._enemyFill(e.kind);
      const stroke = GameScreen._enemyStroke(e.kind);
      const er = e.radius;
      g.circle(e.x, e.y, er).fill({ color: fill });
      g.circle(e.x, e.y, er).stroke({ width: 2, color: stroke });
      const ratio = Math.max(0, e.hp / e.maxHp);
      g.arc(e.x, e.y, er + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio).stroke({
        width: 3,
        color: 0xff6666,
      });
    }

    for (const b of m.bullets) {
      g.circle(b.x, b.y, RIFLE_BULLET_RADIUS).fill({ color: 0xfff3b0 });
    }

    for (const ep of m.enemyProjectiles) {
      if (ep.projKind === 'mg') {
        g.circle(ep.x, ep.y, ep.hitRadius).fill({ color: 0xff8844, alpha: 0.95 });
      } else {
        g.circle(ep.x, ep.y, ep.hitRadius + 2).fill({ color: 0x553322, alpha: 0.9 });
        g.circle(ep.x, ep.y, ep.hitRadius).fill({ color: 0xcc5522, alpha: 0.95 });
      }
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
    const mm = Math.floor(t / 60);
    const ss = t % 60;
    this._timeText.text = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    this._levelText.text = `Lv ${m.level}`;

    this._layoutHud();
    this._layoutHpBarDevHit(pad, barW, barH, hpY);
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
    this._timeText.position.set(this._w - pad - this._timeText.width, pad);
    this._levelText.position.set(this._w - pad - this._levelText.width, pad + 28);
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

  /** 组装开发者倍速面板（后门入口见 `_onHealthBarTripleTap`） */
  private _buildDevPanel(): void {
    this._devRoot.eventMode = 'static';
    this._devRoot.visible = false;

    const font = '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';
    this._devTitle = new Text({
      text: '开发者选项',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0xffeecc,
      }),
    });
    this._devSpeedLabel = new Text({
      text: '时间速率 1x',
      style: new TextStyle({
        fontFamily: font,
        fontSize: 12,
        fill: 0xbbbbbb,
        wordWrap: true,
        wordWrapWidth: 190,
      }),
    });

    this._devBg.clear();
    const pw = 216;
    const ph = 124;
    this._devBg.roundRect(0, 0, pw, ph, 8).fill({ color: 0x120a08, alpha: 0.94 });
    this._devBg.roundRect(0, 0, pw, ph, 8).stroke({ width: 1, color: 0x886644, alpha: 0.85 });

    this._devRoot.addChild(this._devBg);
    this._devRoot.addChild(this._devTitle);
    this._devRoot.addChild(this._devSpeedLabel);

    const speeds = [1, 2, 3, 4, 8];
    let cx = 12;
    const chipY = 56;
    for (const s of speeds) {
      const chip = this._makeDevSpeedChip(s);
      chip.position.set(cx, chipY);
      cx += 42;
      this._devRoot.addChild(chip);
    }

    this._devCloseRow = this._makeDevCloseChip();
    this._devCloseRow.position.set(12, 90);
    this._devRoot.addChild(this._devCloseRow);

    this._devTitle.position.set(12, 8);
    this._devSpeedLabel.position.set(12, 30);
  }

  private _layoutDevPanel(): void {
    const pad = 14;
    this._devRoot.position.set(pad, 76);
  }

  private _updateDevSpeedLabel(): void {
    if (this._devSpeedLabel) {
      this._devSpeedLabel.text = `时间速率 ${this._timeScale}x（局内逻辑 dt）`;
    }
  }

  private _makeDevSpeedChip(mult: number): Container {
    const c = new Container();
    c.eventMode = 'static';
    c.cursor = 'pointer';
    const bw = 38;
    const bh = 26;
    const body = new Graphics();
    body.roundRect(0, 0, bw, bh, 4).fill({ color: 0x3a2a22, alpha: 0.96 });
    body.roundRect(0, 0, bw, bh, 4).stroke({ width: 1, color: 0x665544 });
    const t = new Text({
      text: `${mult}x`,
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 14,
        fill: 0xeeddcc,
      }),
    });
    t.anchor.set(0.5);
    t.position.set(bw * 0.5, bh * 0.5);
    c.addChild(body, t);
    c.hitArea = new Rectangle(0, 0, bw, bh);
    c.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._timeScale = mult;
      this._updateDevSpeedLabel();
    });
    return c;
  }

  private _makeDevCloseChip(): Container {
    const c = new Container();
    c.eventMode = 'static';
    c.cursor = 'pointer';
    const bw = 72;
    const bh = 26;
    const body = new Graphics();
    body.roundRect(0, 0, bw, bh, 4).fill({ color: 0x2a2220, alpha: 0.96 });
    body.roundRect(0, 0, bw, bh, 4).stroke({ width: 1, color: 0x554433 });
    const t = new Text({
      text: '关闭',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 14,
        fill: 0xaaaaaa,
      }),
    });
    t.anchor.set(0.5);
    t.position.set(bw * 0.5, bh * 0.5);
    c.addChild(body, t);
    c.hitArea = new Rectangle(0, 0, bw, bh);
    c.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._devPanelOpen = false;
      this._devRoot.visible = false;
    });
    return c;
  }

  /** 升级遮罩与三按钮：点击后应用选项并关闭 */
  private _buildLevelUpUi(): void {
    this._levelUpDim.eventMode = 'static';
    this._levelUpRoot.addChild(this._levelUpDim);

    const labels: { id: LevelUpChoiceId; text: string }[] = [
      { id: 'damage', text: '伤害 +10%' },
      { id: 'moveSpeed', text: '移速 +5%' },
      { id: 'maxHp', text: '生命上限 +10' },
    ];
    for (let i = 0; i < labels.length; i++) {
      const row = this._makeChoiceButton(labels[i]!.text, labels[i]!.id);
      this._levelUpChoices.push(row);
      this._levelUpRoot.addChild(row);
    }

    this._levelUpTitle = new Text({
      text: '升级 — 三选一',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 26,
        fontWeight: 'bold',
        fill: 0xf5e6d3,
        align: 'center',
      }),
    });
    this._levelUpTitle.anchor.set(0.5);
    this._levelUpRoot.addChildAt(this._levelUpTitle, 1);
  }

  /** 单条升级选项：矢量底 + 文案，点击穿透由 `levelUpRoot` 吞掉 */
  private _makeChoiceButton(label: string, id: LevelUpChoiceId): Container {
    const c = new Container();
    c.eventMode = 'static';
    c.cursor = 'pointer';
    const body = new Graphics();
    const w = 280;
    const h = 48;
    body.roundRect(-w * 0.5, -h * 0.5, w, h, 10).fill({ color: 0x3a2a1a, alpha: 0.95 });
    body.roundRect(-w * 0.5, -h * 0.5, w, h, 10).stroke({ width: 2, color: 0x8b6914 });
    const t = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 18,
        fill: 0xf0e0c8,
      }),
    });
    t.anchor.set(0.5);
    c.addChild(body, t);
    c.hitArea = new Rectangle(-w * 0.5, -h * 0.5, w, h);
    c.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._model.applyLevelUpChoice(id);
    });
    return c;
  }

  private _layoutLevelUp(): void {
    this._levelUpDim.clear();
    this._levelUpDim.rect(0, 0, this._w, this._h).fill({ color: 0x0a0806, alpha: 0.82 });

    const cx = this._w * 0.5;
    const startY = this._h * 0.38;
    const gap = 58;
    let i = 0;
    for (const row of this._levelUpChoices) {
      row.position.set(cx, startY + i * gap);
      i++;
    }

    this._levelUpTitle.position.set(cx, this._h * 0.22);
  }

  private _syncLevelUpVisibility(): void {
    const show = this._model.awaitingLevelUp;
    this._levelUpRoot.visible = show;
    if (show) {
      this._layoutLevelUp();
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

    this._gameOverHint = new Text({
      text: '点击屏幕返回',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
        fontSize: 18,
        fill: 0xaaaaaa,
      }),
    });
    this._gameOverHint.anchor.set(0.5);

    this._gameOverRoot.addChild(this._gameOverTitle, this._gameOverHint);

    this._gameOverDim.on('pointertap', () => {
      if (!this._model.gameOver) {
        return;
      }
      void import('./HomeScreen').then((m) => navigation.goToScreen(m.HomeScreen));
    });
  }

  private _layoutGameOver(): void {
    this._gameOverDim.clear();
    this._gameOverDim.rect(0, 0, this._w, this._h).fill({ color: 0x050403, alpha: 0.88 });
    this._gameOverTitle.position.set(this._w * 0.5, this._h * 0.42);
    this._gameOverHint.position.set(this._w * 0.5, this._h * 0.52);
  }

  private _syncGameOverVisibility(): void {
    const show = this._model.gameOver;
    this._gameOverRoot.visible = show;
    if (show) {
      this._layoutGameOver();
    }
  }

  /** 兵种填充色（占位图元，阶段 4 可换精灵） */
  private static _enemyFill(kind: EnemyKind): number {
    switch (kind) {
      case 'infantry':
        return 0x7a2424;
      case 'puppet':
        return 0x6a4a42;
      case 'dog':
        return 0x5c4030;
      case 'cavalry':
        return 0x6a2828;
      case 'mg':
        return 0x4a3832;
      case 'artillery':
        return 0x353028;
      case 'officer':
        return 0x5a2060;
      default:
        return 0x7a2424;
    }
  }

  /** 兵种描边：军官略提亮便于辨认 */
  private static _enemyStroke(kind: EnemyKind): number {
    return kind === 'officer' ? 0xd4a020 : 0x2a0a0a;
  }
}
