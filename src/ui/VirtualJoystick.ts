import { Container, FederatedPointerEvent, Graphics, Rectangle } from 'pixi.js';

/** 将浏览器 `clientX/clientY` 转为与 Pixi 一致的全局坐标（逻辑像素，与 `renderer.width/height` 对齐） */
export type ClientToGlobalFn = (clientX: number, clientY: number) => { x: number; y: number };

/** 底环与圆钮整体不透明度（0.5 = 半透明） */
const JOYSTICK_VISUAL_ALPHA = 0.5;

/**
 * 浮动摇杆：默认仅有一块透明激活区；按下后在与触点重合处浮现底环，锚点固定为按下点，拖动时圆钮相对锚点偏移并限制在半径内
 */
export class VirtualJoystick extends Container {
  /** 透明触摸层：顶栏以下全宽（可调），用于默认隐藏、触后浮现 */
  private readonly _zone = new Container();
  private readonly _zoneHit = new Graphics();
  private readonly _stickRoot = new Container();
  private readonly _base = new Graphics();
  private readonly _knob = new Graphics();

  private readonly _outerR: number;
  private readonly _knobR: number;
  private readonly _maxTravel: number;
  private readonly _clientToGlobal: ClientToGlobalFn;

  /** 激活区宽度占屏宽比例（1 = 顶栏以下整屏可唤醒，避免只能左侧起手） */
  private _zoneWidthRatio = 1;
  /** 顶部留白比例，避开血条/经验 HUD */
  private _zoneTopRatio = 0.14;

  private _dragging = false;
  private _pointerId: number | null = null;
  private _interactive = true;

  private _outX = 0;
  private _outY = 0;

  private readonly _docMove = (e: PointerEvent): void => {
    if (!this._dragging || e.pointerId !== this._pointerId) {
      return;
    }
    const g = this._clientToGlobal(e.clientX, e.clientY);
    this._applyFingerGlobal(g.x, g.y);
  };

  private readonly _docEnd = (e: PointerEvent): void => {
    if (!this._dragging || e.pointerId !== this._pointerId) {
      return;
    }
    this._removeDocListeners();
    this._finishSession();
  };

  constructor(clientToGlobal: ClientToGlobalFn, outerRadius = 80, knobRadius = 28) {
    super();
    this._clientToGlobal = clientToGlobal;
    this._outerR = outerRadius;
    this._knobR = knobRadius;
    this._maxTravel = Math.max(12, outerRadius - knobRadius - 6);

    this.eventMode = 'passive';
    this._zone.eventMode = 'static';
    this._zone.cursor = 'default';
    this._zone.addChild(this._zoneHit);
    this._zone.on('pointerdown', this._onZoneDown);

    this._stickRoot.visible = false;
    this._stickRoot.eventMode = 'none';
    this._drawBase();
    this._drawKnob(0, 0);
    this._stickRoot.addChild(this._base, this._knob);
    this._stickRoot.alpha = JOYSTICK_VISUAL_ALPHA;

    this.addChild(this._zone, this._stickRoot);
  }

  /**
   * 是否响应触摸；为 false 时隐藏摇杆并清零输出
   * @param v - 是否可交互
   */
  public setInteractiveEnabled(v: boolean): void {
    this._interactive = v;
    if (!v) {
      this._removeDocListeners();
      this._finishSession();
    }
    this._zone.eventMode = v ? 'static' : 'none';
  }

  /** 当前帧读取模拟量；-1~1，未拖动时为 0 */
  public getAnalog(): { analogX: number; analogY: number } {
    return { analogX: this._outX, analogY: this._outY };
  }

  /**
   * 按屏幕尺寸布置透明激活区（顶边留白避开 HUD）
   * @param screenW - 逻辑宽
   * @param screenH - 逻辑高
   */
  public layout(screenW: number, screenH: number): void {
    const top = screenH * this._zoneTopRatio;
    const zw = screenW * this._zoneWidthRatio;
    const zh = screenH - top;
    this._zoneHit.clear();
    this._zoneHit.rect(0, top, zw, zh).fill({ color: 0x000000, alpha: 0.0001 });
    this._zoneHit.hitArea = new Rectangle(0, top, zw, zh);
    this._zone.position.set(0, 0);
  }

  /** 离开玩法屏时摘掉 document 监听 */
  public dispose(): void {
    this._removeDocListeners();
    this._finishSession();
  }

  private _drawBase(): void {
    const g = this._base;
    g.clear();
    g.circle(0, 0, this._outerR).fill({ color: 0xfff5ee, alpha: 0.42 });
    g.circle(0, 0, this._outerR).stroke({ width: 3, color: 0xffffff, alpha: 0.52 });
    g.circle(0, 0, this._outerR).stroke({ width: 2, color: 0xe8a878, alpha: 0.45 });
    g.circle(0, 0, this._outerR * 0.55).stroke({ width: 2, color: 0xffecd8, alpha: 0.32 });
  }

  private _drawKnob(lx: number, ly: number): void {
    const g = this._knob;
    g.clear();
    g.circle(lx, ly, this._knobR).fill({ color: 0xfffefb, alpha: 0.95 });
    g.circle(lx, ly, this._knobR).stroke({ width: 2, color: 0xa85c40, alpha: 0.35 });
  }

  /** 在激活区内按下：锚点落在触点，浮现 `_stickRoot`，并开始跟手 */
  private readonly _onZoneDown = (e: FederatedPointerEvent): void => {
    if (!this._interactive || this._dragging) {
      return;
    }
    e.stopPropagation();
    const ne = e.nativeEvent as PointerEvent;
    const g = this._clientToGlobal(ne.clientX, ne.clientY);
    const anchor = this.toLocal({ x: g.x, y: g.y });
    this._stickRoot.position.set(anchor.x, anchor.y);
    this._stickRoot.visible = true;
    this._dragging = true;
    this._pointerId = ne.pointerId;
    document.addEventListener('pointermove', this._docMove, { passive: true });
    document.addEventListener('pointerup', this._docEnd);
    document.addEventListener('pointercancel', this._docEnd);
    this._applyFingerGlobal(g.x, g.y);
  };

  /**
   * 全局手指位置 → `_stickRoot` 局部偏移；将钮限制在半径 `_maxTravel` 内并写入归一化输出
   * @param gx - 全局 x
   * @param gy - 全局 y
   */
  private _applyFingerGlobal(gx: number, gy: number): void {
    const lp = this._stickRoot.toLocal({ x: gx, y: gy });
    let nx = lp.x;
    let ny = lp.y;
    const dist = Math.hypot(nx, ny);
    if (dist > this._maxTravel && dist > 0) {
      nx = (nx / dist) * this._maxTravel;
      ny = (ny / dist) * this._maxTravel;
    }
    this._drawKnob(nx, ny);
    const t = this._maxTravel;
    this._outX = t > 0 ? nx / t : 0;
    this._outY = t > 0 ? ny / t : 0;
  }

  private _removeDocListeners(): void {
    document.removeEventListener('pointermove', this._docMove);
    document.removeEventListener('pointerup', this._docEnd);
    document.removeEventListener('pointercancel', this._docEnd);
  }

  /** 松手：隐藏摇杆视觉、清零向量与拖动状态 */
  private _finishSession(): void {
    this._dragging = false;
    this._pointerId = null;
    this._outX = 0;
    this._outY = 0;
    this._drawKnob(0, 0);
    this._stickRoot.visible = false;
  }
}
