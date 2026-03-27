import {
  Assets,
  Container,
  FillGradient,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from 'pixi.js';
import type { AppScreen } from '../utils/navigation';
import { navigation } from '../utils/navigation';
import { GameScreen } from './GameScreen';

/** 首页背景图：与仓库 `public/bg-home.png` 对应，Vite 会原样拷贝到产物根目录，运行时通过 `base` 相对路径加载 */
const HOME_BG_URL = `${import.meta.env.BASE_URL}bg-home.png`;

/** 将透明度从 `from` 线性过渡到 `to`，时长 `ms` 毫秒 */
function fadeAlpha(target: Container, from: number, to: number, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / ms);
      target.alpha = from + (to - from) * u;
      if (u < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

/** 符文守卫：随机防线 — 竖屏首页；背景图为可选，未放置时使用暖色秋日占位渐变 */
export class HomeScreen extends Container implements AppScreen {
  /** 屏幕唯一标识，供导航缓存 */
  public static SCREEN_ID = 'home';

  private readonly _bgPlaceholder = new Graphics();
  private readonly _bgSprite = new Sprite();
  private readonly _hero = new Graphics();
  private readonly _silhouette = new Graphics();
  private readonly _titleLine1: Text;
  private readonly _titleLine2: Text;
  private readonly _playBtn = new Container();
  private readonly _btnShadow = new Graphics();
  private readonly _btnBody = new Graphics();
  private readonly _btnGloss = new Graphics();
  private readonly _playLabel: Text;

  private _bgReady = false;

  constructor() {
    super();

    this._bgSprite.visible = false;
    this._bgSprite.anchor.set(0.5);

    const strokeColor = 0x4d2e1a;
    const titleFill = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    });
    titleFill.addColorStop(0, 0xfff8e8);
    titleFill.addColorStop(0.55, 0xffe8b8);
    titleFill.addColorStop(1, 0xffd38a);

    const titleStyle = (size: number) =>
      new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif',
        fontSize: size,
        fontWeight: '900',
        fill: { fill: titleFill },
        stroke: { color: strokeColor, width: Math.max(4, Math.round(size * 0.1)) },
        dropShadow: {
          color: 0x2a1808,
          blur: 6,
          distance: 4,
          angle: Math.PI / 2.2,
        },
        align: 'center',
      });

    this._titleLine1 = new Text({ text: '符文守卫:', style: titleStyle(36) });
    this._titleLine2 = new Text({ text: '随机防线', style: titleStyle(48) });
    this._titleLine1.anchor.set(0.5);
    this._titleLine2.anchor.set(0.5);

    this._playLabel = new Text({
      text: '开始',
      style: new TextStyle({
        fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif',
        fontSize: 26,
        fontWeight: 'bold',
        fill: 0x3d2817,
      }),
    });
    this._playLabel.anchor.set(0.5);

    this._playBtn.addChild(this._btnShadow, this._btnBody, this._btnGloss, this._playLabel);
    this._playBtn.eventMode = 'static';
    this._playBtn.cursor = 'pointer';
    this._playBtn.on('pointertap', () => {
      void navigation.goToScreen(GameScreen);
    });

    this.addChild(
      this._bgPlaceholder,
      this._bgSprite,
      this._hero,
      this._silhouette,
      this._titleLine1,
      this._titleLine2,
      this._playBtn,
    );
  }

  /** 异步加载 `bg-home.png`（`public/bg-home.png`）；失败时仅用暖色占位渐变 */
  public async prepare(): Promise<void> {
    this.alpha = 0;
    try {
      const tex = await Assets.load<Texture>(HOME_BG_URL);
      this._bgSprite.texture = tex;
      this._bgSprite.visible = true;
      this._bgReady = true;
    } catch {
      this._bgReady = false;
      this._bgSprite.visible = false;
    }
  }

  /** 淡入并居中布局 */
  public async show(): Promise<void> {
    await fadeAlpha(this, 0, 1, 220);
  }

  /** 淡出 */
  public async hide(): Promise<void> {
    await fadeAlpha(this, this.alpha, 0, 180);
  }

  /**
   * 按画布尺寸排布背景、标题、中央插画与底部按钮
   * @param w - 渲染缓冲区宽度
   * @param h - 渲染缓冲区高度
   */
  public resize(w: number, h: number): void {
    this._drawPlaceholder(w, h);
    this._layoutBgSprite(w, h);
    this._layoutTitle(w, h);
    this._drawHero(w, h);
    this._drawSilhouettes(w, h);
    this._layoutPlayButton(w, h);

    const showDecor = !this._bgReady;
    this._hero.visible = showDecor;
    this._silhouette.visible = showDecor;
  }

  /** 无背景图时的暖金色天空 + 沙地 + 远景虚影 */
  private _drawPlaceholder(w: number, h: number): void {
    if (this._bgReady) {
      this._bgPlaceholder.clear();
      return;
    }
    const g = this._bgPlaceholder;
    g.clear();
    const sky = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0.55 },
      textureSpace: 'local',
    });
    sky.addColorStop(0, 0xffe8b0);
    sky.addColorStop(0.35, 0xffd48a);
    sky.addColorStop(0.65, 0xf4b86a);
    sky.addColorStop(1, 0xe8a86a);
    g.rect(0, 0, w, h * 0.55).fill({ fill: sky });

    const ground = new FillGradient({
      start: { x: 0, y: 0.55 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
    });
    ground.addColorStop(0, 0xd4a574);
    ground.addColorStop(0.4, 0xc9985a);
    ground.addColorStop(1, 0xb8824a);
    g.rect(0, h * 0.55, w, h * 0.45).fill({ fill: ground });

    g.moveTo(0, h * 0.52);
    g.bezierCurveTo(w * 0.25, h * 0.48, w * 0.75, h * 0.5, w, h * 0.53);
    g.lineTo(w, h * 0.55);
    g.lineTo(0, h * 0.55);
    g.closePath();
    g.fill({ color: 0xc9a070, alpha: 0.45 });

    g.moveTo(0, h * 0.42);
    g.bezierCurveTo(w * 0.3, h * 0.38, w * 0.7, h * 0.4, w, h * 0.43);
    g.lineTo(w, h * 0.52);
    g.lineTo(0, h * 0.5);
    g.closePath();
    g.fill({ color: 0x8b6914, alpha: 0.22 });
  }

  /** 背景图 cover 铺满屏幕 */
  private _layoutBgSprite(w: number, h: number): void {
    const tex = this._bgSprite.texture;
    if (!tex || tex.width < 2 || tex.height < 2) {
      return;
    }
    const tw = tex.width;
    const th = tex.height;
    const s = Math.max(w / tw, h / th);
    this._bgSprite.scale.set(s);
    this._bgSprite.position.set(w * 0.5, h * 0.5);
    this._bgSprite.visible = true;
  }

  /** 双行标题位于上半部分 */
  private _layoutTitle(w: number, h: number): void {
    const s1 = Math.min(40, w * 0.092);
    const s2 = Math.min(52, w * 0.12);
    this._titleLine1.style.fontSize = s1;
    this._titleLine1.style.stroke = {
      color: 0x4d2e1a,
      width: Math.max(4, Math.round(s1 * 0.12)),
    };
    this._titleLine2.style.fontSize = s2;
    this._titleLine2.style.stroke = {
      color: 0x4d2e1a,
      width: Math.max(5, Math.round(s2 * 0.11)),
    };

    const cx = w * 0.5;
    const y1 = h * 0.12;
    const y2 = y1 + this._titleLine1.height * 0.5 + this._titleLine2.height * 0.35 + 4;
    this._titleLine1.position.set(cx, y1);
    this._titleLine2.position.set(cx, y2);
  }

  /** 中央法阵、主塔与两侧小塔（矢量占位，贴近参考图构图） */
  private _drawHero(w: number, h: number): void {
    const g = this._hero;
    g.clear();
    const cx = w * 0.5;
    const cy = h * 0.52;
    const unit = Math.min(w, h) * 0.1;

    const rings = [1.15, 0.85, 0.6, 0.38];
    for (let i = 0; i < rings.length; i++) {
      const r = unit * rings[i];
      const a = 0.22 + i * 0.18;
      g.circle(cx, cy, r).stroke({ width: i === 0 ? 3 : 2, color: 0xfff2b0, alpha: a });
    }
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const r0 = unit * 0.35;
      const r1 = unit * 1.05;
      g.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      g.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      g.stroke({ width: 1, color: 0xffe066, alpha: 0.35 });
    }
    g.circle(cx, cy, unit * 0.18).fill({ color: 0xfffcdd, alpha: 0.35 });

    const tw = unit * 0.35;
    const th = unit * 1.1;
    g.roundRect(cx - tw * 0.5, cy - th * 0.55, tw, th, 6).fill({ color: 0x4a3020 });
    g.roundRect(cx - tw * 0.35, cy - th * 0.75, tw * 0.7, h * 0.06, 4).fill({ color: 0x3a2418 });
    g.circle(cx, cy - th * 0.15, unit * 0.12).fill({ color: 0xff6b1a, alpha: 0.95 });
    g.circle(cx, cy - th * 0.15, unit * 0.12).stroke({ width: 2, color: 0x1a0a00, alpha: 0.55 });

    g.moveTo(cx + tw * 0.2, cy - th * 0.55);
    g.lineTo(cx + tw * 0.95, cy - th * 0.95);
    g.lineTo(cx + tw * 0.85, cy - th * 0.75);
    g.closePath();
    g.fill({ color: 0x1a1a1a, alpha: 0.95 });

    const lx = cx - unit * 1.45;
    const ly = cy + unit * 0.15;
    g.roundRect(lx - unit * 0.2, ly - unit * 0.15, unit * 0.4, unit * 0.35, 4).fill({ color: 0x6a6a6a });
    g.circle(lx, ly - unit * 0.15, unit * 0.14).fill({ color: 0xe8f4ff, alpha: 0.95 });
    g.circle(lx, ly - unit * 0.15, unit * 0.08).fill({ color: 0xffffff, alpha: 0.85 });

    const rx = cx + unit * 1.05;
    g.roundRect(rx - unit * 0.22, cy - unit * 0.85, unit * 0.44, unit * 0.95, 4).fill({ color: 0x6b3a2a });
    g.rect(rx - unit * 0.18, cy - unit * 1.05, unit * 0.36, unit * 0.22).fill({ color: 0x5a2a1a });
    g.moveTo(rx, cy - unit * 1.05);
    g.lineTo(rx, cy - unit * 1.2);
    g.lineTo(rx - unit * 0.1, cy - unit * 1.12);
    g.lineTo(rx + unit * 0.1, cy - unit * 1.12);
    g.closePath();
    g.fill({ color: 0x8b6914, alpha: 0.9 });
    g.rect(rx - unit * 0.1, cy - unit * 0.55, unit * 0.08, unit * 0.12).fill({ color: 0xffa040, alpha: 0.85 });
    g.rect(rx + unit * 0.02, cy - unit * 0.55, unit * 0.08, unit * 0.12).fill({ color: 0xffa040, alpha: 0.85 });
  }

  /** 底部两侧模糊剪影，强化前景层次 */
  private _drawSilhouettes(w: number, h: number): void {
    const g = this._silhouette;
    g.clear();
    const bh = h * 0.18;
    g.ellipse(w * 0.12, h * 0.9, w * 0.1, bh * 0.45).fill({ color: 0x1a0a00, alpha: 0.5 });
    g.ellipse(w * 0.88, h * 0.895, w * 0.1, bh * 0.45).fill({ color: 0x1a0a00, alpha: 0.5 });
  }

  /** 底部胶囊按钮：黄橙渐变、高光与投影 */
  private _layoutPlayButton(w: number, h: number): void {
    const btnW = Math.min(w * 0.72, 320);
    const btnH = Math.min(56, h * 0.08);
    const r = btnH * 0.5;
    const cx = w * 0.5;
    const cy = h * 0.9;

    this._btnShadow.clear();
    this._btnShadow.roundRect(-btnW * 0.5 + 3, -btnH * 0.5 + 5, btnW, btnH, r).fill({
      color: 0x2a1808,
      alpha: 0.35,
    });

    this._btnBody.clear();
    const bodyGrad = new FillGradient({
      start: { x: 0, y: -0.5 },
      end: { x: 0, y: 0.5 },
      textureSpace: 'local',
    });
    bodyGrad.addColorStop(0, 0xffe866);
    bodyGrad.addColorStop(0.45, 0xffc233);
    bodyGrad.addColorStop(1, 0xff8c33);
    this._btnBody.roundRect(-btnW * 0.5, -btnH * 0.5, btnW, btnH, r).fill({ fill: bodyGrad });
    this._btnBody.roundRect(-btnW * 0.5, -btnH * 0.5, btnW, btnH, r).stroke({
      width: 2,
      color: 0x5c3a1a,
    });

    this._btnGloss.clear();
    this._btnGloss
      .roundRect(-btnW * 0.5 + 3, -btnH * 0.5 + 3, btnW - 6, btnH * 0.42, r * 0.6)
      .fill({ color: 0xffffff, alpha: 0.28 });

    this._playLabel.style.fontSize = Math.min(26, btnH * 0.48);
    this._playBtn.position.set(cx, cy);
    this._playBtn.hitArea = new Rectangle(-btnW * 0.5, -btnH * 0.5, btnW, btnH);
  }
}
