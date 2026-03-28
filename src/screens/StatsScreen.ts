import {
  Container,
  FillGradient,
  Graphics,
  Rectangle,
  Text,
  TextStyle,
} from 'pixi.js';

import { getPlayerStatsSnapshot, loadAchievementSave } from '../game/meta/achievementStore';
import { formatDurationCn } from '../utils/formatDuration';
import { fadeAlpha } from '../utils/screenFx';
import type { AppScreen } from '../utils/navigation';
import { navigation } from '../utils/navigation';

const HUD_FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif';

/** 累计作战时长、击杀、局数等（读 `PlayerProfileSave`） */
export class StatsScreen extends Container implements AppScreen {
  /** 屏幕唯一标识，供导航缓存 */
  public static SCREEN_ID = 'stats';

  private readonly _dim = new Graphics();
  private readonly _panel = new Graphics();
  private readonly _title: Text;
  private readonly _body: Text;
  private readonly _backBtn = new Container();
  private readonly _backBg = new Graphics();
  private readonly _backLabel: Text;

  public constructor() {
    super();
    this._title = new Text({
      text: '数据统计',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 28,
        fontWeight: 'bold',
        fill: 0xf5e6d3,
      }),
    });
    this._title.anchor.set(0.5);
    this._body = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 16,
        fill: 0xd8ccb8,
        align: 'left',
        lineHeight: 28,
      }),
    });
    this._body.anchor.set(0.5, 0);
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
    this.addChild(this._dim, this._panel, this._title, this._body, this._backBtn);
  }

  /** 进入时刷新文案 */
  public prepare(): void {
    this._refreshBodyText();
  }

  public async show(): Promise<void> {
    this.prepare();
    await fadeAlpha(this, 0, 1, 200);
  }

  public async hide(): Promise<void> {
    await fadeAlpha(this, this.alpha, 0, 160);
  }

  private _refreshBodyText(): void {
    const s = getPlayerStatsSnapshot(loadAchievementSave());
    const lines = [
      `累计作战时长：${formatDurationCn(s.totalPlayTimeSec)}`,
      `累计结算局数：${s.totalSessions}`,
      `累计击杀：${s.totalKills}`,
      `累计阵亡：${s.deathCount}`,
      `单局最长存活：${formatDurationCn(s.bestSurvivalSec)}`,
      `平均每局存活：${formatDurationCn(s.avgSurvivalSec)}`,
      '',
      '说明：仅在战斗结束并返回首页时结算本局数据。',
    ];
    this._body.text = lines.join('\n');
  }

  public resize(w: number, h: number): void {
    this._dim.clear();
    this._dim.rect(0, 0, w, h).fill({ color: 0x0c0806, alpha: 0.93 });

    const margin = 16;
    const pw = w - margin * 2;
    const ph = Math.min(h * 0.72, 520);
    const px = margin;
    const py = (h - ph) * 0.5 - 12;

    this._panel.clear();
    const grad = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
    });
    grad.addColorStop(0, 0x2c241c);
    grad.addColorStop(1, 0x1a1410);
    this._panel.roundRect(px, py, pw, ph, 14).fill({ fill: grad });
    this._panel.roundRect(px, py, pw, ph, 14).stroke({ width: 2, color: 0x6a5840 });

    this._title.position.set(w * 0.5, py + 32);
    this._body.style.wordWrapWidth = Math.max(200, pw - 36);
    this._refreshBodyText();
    this._body.position.set(w * 0.5, py + 78);

    const bw = Math.min(220, pw * 0.55);
    const bh = 44;
    this._backBg.clear();
    this._backBg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, bh * 0.5).fill({ color: 0xe8c878 });
    this._backBg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, bh * 0.5).stroke({ width: 2, color: 0x5a4020 });
    this._backBtn.position.set(w * 0.5, py + ph - 36);
    this._backBtn.hitArea = new Rectangle(-bw * 0.5, -bh * 0.5, bw, bh);
  }
}
