import {
  Container,
  FillGradient,
  Graphics,
  Rectangle,
  Text,
  TextStyle,
} from 'pixi.js';

import { fadeAlpha } from '../utils/screenFx';
import type { AppScreen } from '../utils/navigation';
import { navigation } from '../utils/navigation';

const HUD_FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif';

/** 占位设置页：音量等后续接本地存储 */
export class SettingsScreen extends Container implements AppScreen {
  /** 屏幕唯一标识，供导航缓存 */
  public static SCREEN_ID = 'settings';

  private readonly _dim = new Graphics();
  private readonly _panel = new Graphics();
  private readonly _title: Text;
  private readonly _hint: Text;
  private readonly _backBtn = new Container();
  private readonly _backBg = new Graphics();
  private readonly _backLabel: Text;

  public constructor() {
    super();
    this._title = new Text({
      text: '设置',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 28,
        fontWeight: 'bold',
        fill: 0xf5e6d3,
      }),
    });
    this._title.anchor.set(0.5);
    this._hint = new Text({
      text: '音效、画质等选项将在此配置\n当前为占位界面',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 16,
        fill: 0xc8b8a0,
        align: 'center',
        lineHeight: 24,
      }),
    });
    this._hint.anchor.set(0.5);
    this._backLabel = new Text({
      text: '返回',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 20,
        fontWeight: 'bold',
        fill: 0x2a1a0a,
      }),
    });
    this._backLabel.anchor.set(0.5);
    this._backBtn.addChild(this._backBg, this._backLabel);
    this._backBtn.eventMode = 'static';
    this._backBtn.cursor = 'pointer';
    this._backBtn.on('pointertap', () => {
      void import('./HomeScreen').then((m) => navigation.goToScreen(m.HomeScreen));
    });
    this.addChild(this._dim, this._panel, this._title, this._hint, this._backBtn);
  }

  public async show(): Promise<void> {
    await fadeAlpha(this, 0, 1, 200);
  }

  public async hide(): Promise<void> {
    await fadeAlpha(this, this.alpha, 0, 160);
  }

  /** 全屏遮罩与居中面板布局 */
  public resize(w: number, h: number): void {
    this._dim.clear();
    this._dim.rect(0, 0, w, h).fill({ color: 0x120a06, alpha: 0.92 });
    const pw = Math.min(w * 0.88, 360);
    const ph = Math.min(h * 0.42, 280);
    const px = (w - pw) * 0.5;
    const py = (h - ph) * 0.5;
    this._panel.clear();
    const grad = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
    });
    grad.addColorStop(0, 0x3a3028);
    grad.addColorStop(1, 0x221c18);
    this._panel.roundRect(px, py, pw, ph, 14).fill({ fill: grad });
    this._panel.roundRect(px, py, pw, ph, 14).stroke({ width: 2, color: 0x6a5848 });
    this._title.position.set(w * 0.5, py + 36);
    this._hint.position.set(w * 0.5, py + ph * 0.48);
    const bw = Math.min(200, pw * 0.55);
    const bh = 44;
    const bx = w * 0.5;
    const by = py + ph - 36;
    this._backBg.clear();
    this._backBg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, bh * 0.5).fill({ color: 0xe8c878 });
    this._backBg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, bh * 0.5).stroke({ width: 2, color: 0x5a4020 });
    this._backBtn.position.set(bx, by);
    this._backBtn.hitArea = new Rectangle(-bw * 0.5, -bh * 0.5, bw, bh);
  }
}
