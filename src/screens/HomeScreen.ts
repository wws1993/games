import {
  Assets,
  Container,
  FillGradient,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  TextStyle,
  type Texture,
} from 'pixi.js';

import { fadeAlpha } from '../utils/screenFx';
import type { AppScreen } from '../utils/navigation';
import { navigation } from '../utils/navigation';
import { GameScreen } from './GameScreen';

/** 首页背景图：与仓库 `public/bg-home.png` 对应 */
const HOME_BG_URL = `${import.meta.env.BASE_URL}bg-home.png`;

const HUD_FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif';

interface MenuItemParts {
  root: Container;
  label: Text;
}

/** 敌后幸存者 — 竖屏主菜单：标题区 + 底部纵向纯文字入口（开战 / 图鉴 / 统计 / 设置 / 成就） */
export class HomeScreen extends Container implements AppScreen {
  /** 屏幕唯一标识，供导航缓存 */
  public static SCREEN_ID = 'home';

  private readonly _bgPlaceholder = new Graphics();
  private readonly _bgSprite = new Sprite();
  private readonly _titleLine1: Text;
  private readonly _titleLine2: Text;
  private readonly _menuList = new Container();
  private readonly _menuItems: MenuItemParts[] = [];

  private _bgReady = false;

  public constructor() {
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
        fontFamily: HUD_FONT,
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

    this._titleLine1 = new Text({ text: '敌后幸存者', style: titleStyle(34) });
    this._titleLine2 = new Text({
      text: '选择入口',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 22,
        fontWeight: '600',
        fill: 0xe8d8c8,
        dropShadow: { color: 0x1a0a00, blur: 3, distance: 1 },
      }),
    });
    this._titleLine1.anchor.set(0.5);
    this._titleLine2.anchor.set(0.5);

    const labels = ['开始游戏', '图鉴', '统计', '设置', '成就'] as const;
    const actions: (() => void)[] = [
      () => navigation.goToScreen(GameScreen),
      () => void import('./CodexScreen').then((m) => navigation.goToScreen(m.CodexScreen)),
      () => void import('./StatsScreen').then((m) => navigation.goToScreen(m.StatsScreen)),
      () => void import('./SettingsScreen').then((m) => navigation.goToScreen(m.SettingsScreen)),
      () => void import('./AchievementsScreen').then((m) => navigation.goToScreen(m.AchievementsScreen)),
    ];
    for (let i = 0; i < 5; i++) {
      const root = new Container();
      root.eventMode = 'static';
      root.cursor = 'pointer';
      const label = new Text({
        text: labels[i]!,
        style: new TextStyle({
          fontFamily: HUD_FONT,
          fontSize: 22,
          fontWeight: '600',
          fill: 0xf2ebe4,
          align: 'center',
          dropShadow: { color: 0x000000, blur: 4, distance: 1, alpha: 0.88 },
          stroke: { color: 0x1a1410, width: 3 },
        }),
      });
      label.anchor.set(0.5);
      root.addChild(label);
      root.on('pointertap', actions[i]!);
      this._menuList.addChild(root);
      this._menuItems.push({ root, label });
    }

    this.addChild(this._bgPlaceholder, this._bgSprite, this._titleLine1, this._titleLine2, this._menuList);
  }

  /** 异步加载首页背景；失败则使用矢量占位渐变 */
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

  public async show(): Promise<void> {
    await fadeAlpha(this, 0, 1, 220);
  }

  public async hide(): Promise<void> {
    await fadeAlpha(this, this.alpha, 0, 180);
  }

  /**
   * 按画布尺寸排布背景、标题区与底部纵向菜单
   * @param w - 渲染缓冲区宽度
   * @param h - 渲染缓冲区高度
   */
  public resize(w: number, h: number): void {
    this._drawPlaceholder(w, h);
    this._layoutBgSprite(w, h);
    this._layoutTitle(w, h);
    this._layoutMenuList(w, h);
  }

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

  private _layoutTitle(w: number, h: number): void {
    const s1 = Math.min(38, w * 0.09);
    /** 副标题相对主标题略小但明显大于旧版，随屏宽封顶 */
    const s2 = Math.min(24, w * 0.058);
    this._titleLine1.style.fontSize = s1;
    this._titleLine1.style.stroke = {
      color: 0x4d2e1a,
      width: Math.max(4, Math.round(s1 * 0.12)),
    };
    this._titleLine2.style.fontSize = s2;

    const cx = w * 0.5;
    /** 主标题整体下移，避免贴顶 */
    const y1 = h * 0.14;
    /** 主副标题间距：按主标题视觉高度比例并加固定像素，避免挤在一起 */
    const titleGap = Math.max(14, Math.round(s1 * 0.42));
    const y2 = y1 + this._titleLine1.height * 0.5 + titleGap + this._titleLine2.height * 0.5;
    this._titleLine1.position.set(cx, y1);
    this._titleLine2.position.set(cx, y2);
  }

  /** 底部纵向纯文字菜单：开始游戏、图鉴、统计、设置、成就 */
  private _layoutMenuList(w: number, h: number): void {
    const cx = w * 0.5;
    const bottomMargin = Math.max(32, h * 0.07);
    const itemGap = Math.max(16, h * 0.026);
    const pad = Math.max(10, w * 0.02);
    const fontSize = Math.min(26, Math.max(19, w * 0.052));

    for (const item of this._menuItems) {
      item.label.style.fontSize = fontSize;
    }

    let yBottom = h - bottomMargin;
    for (let i = this._menuItems.length - 1; i >= 0; i--) {
      const item = this._menuItems[i]!;
      const halfH = item.label.height * 0.5;
      item.root.position.set(cx, yBottom - halfH);
      const halfW = item.label.width * 0.5;
      item.root.hitArea = new Rectangle(-halfW - pad, -halfH - pad, item.label.width + pad * 2, item.label.height + pad * 2);
      yBottom -= item.label.height + itemGap;
    }
  }
}
