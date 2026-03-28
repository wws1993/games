import {
  Container,
  FederatedPointerEvent,
  FederatedWheelEvent,
  Graphics,
  Rectangle,
  Text,
  TextStyle,
} from 'pixi.js';

import { ACHIEVEMENT_DEFS, type AchievementDef } from '../game/meta/achievementDefs';
import {
  getAchievementProgressSummary,
  getUnlockedAchievementIds,
  loadAchievementSave,
} from '../game/meta/achievementStore';
import { app } from '../utils/application';
import { fadeAlpha } from '../utils/screenFx';
import type { AppScreen } from '../utils/navigation';
import { navigation } from '../utils/navigation';

const HUD_FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif';

/** 成就列表：本地存档统计 + 可滚动；进入时 `prepare` 刷新 */
export class AchievementsScreen extends Container implements AppScreen {
  /** 屏幕唯一标识，供导航缓存 */
  public static SCREEN_ID = 'achievements';

  private readonly _dim = new Graphics();
  private readonly _title: Text;
  private readonly _summary: Text;
  private readonly _viewport = new Container();
  private readonly _scrollMask = new Graphics();
  private readonly _scrollInner = new Container();
  private readonly _backBtn = new Container();
  private readonly _backBg = new Graphics();
  private readonly _backLabel: Text;

  private _dragging = false;
  private _lastGlobalY = 0;
  private _viewportW = 300;
  private _viewportH = 400;
  private _contentTextW = 280;
  private _padX = 16;
  private _scrollTop = 100;
  private readonly _winMove = (ev: PointerEvent): void => {
    if (!this._dragging) {
      return;
    }
    const g = this._clientToGlobal(ev.clientX, ev.clientY);
    const dy = g.y - this._lastGlobalY;
    this._lastGlobalY = g.y;
    this._applyScrollDy(dy);
  };
  private readonly _winUp = (): void => {
    this._endDrag();
  };

  public constructor() {
    super();
    this._title = new Text({
      text: '成就',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 28,
        fontWeight: 'bold',
        fill: 0xfff4d0,
      }),
    });
    this._title.anchor.set(0.5, 0);

    this._summary = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 14,
        fill: 0xb8a890,
        align: 'center',
      }),
    });
    this._summary.anchor.set(0.5, 0);

    this._viewport.addChild(this._scrollMask, this._scrollInner);
    this._scrollInner.mask = this._scrollMask;
    this._viewport.eventMode = 'static';
    this._viewport.cursor = 'grab';
    this._viewport.on('pointerdown', (e: FederatedPointerEvent) => this._onViewportDown(e));
    this._viewport.on('wheel', (e: FederatedWheelEvent) => this._onViewportWheel(e));

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

    this.addChild(this._dim, this._title, this._summary, this._viewport, this._backBtn);
  }

  /** 从磁盘重载并重建列表 */
  public prepare(): void {
    this._rebuildList();
    const save = loadAchievementSave();
    const p = getAchievementProgressSummary(save);
    this._summary.text = `累计击杀 ${p.totalKills}　累计阵亡 ${p.deathCount}`;
  }

  public async show(): Promise<void> {
    this.prepare();
    await fadeAlpha(this, 0, 1, 200);
  }

  public async hide(): Promise<void> {
    this._endDrag();
    await fadeAlpha(this, this.alpha, 0, 160);
  }

  private _clientToGlobal(clientX: number, clientY: number): { x: number; y: number } {
    const rect = app.canvas.getBoundingClientRect();
    const rw = app.renderer.width;
    const rh = app.renderer.height;
    const x = (clientX - rect.left) * (rw / Math.max(1, rect.width));
    const y = (clientY - rect.top) * (rh / Math.max(1, rect.height));
    return { x, y };
  }

  private _onViewportDown(e: FederatedPointerEvent): void {
    this._dragging = true;
    this._lastGlobalY = e.global.y;
    this._viewport.cursor = 'grabbing';
    window.addEventListener('pointermove', this._winMove);
    window.addEventListener('pointerup', this._winUp);
    window.addEventListener('pointercancel', this._winUp);
  }

  private _endDrag(): void {
    if (!this._dragging) {
      return;
    }
    this._dragging = false;
    this._viewport.cursor = 'grab';
    window.removeEventListener('pointermove', this._winMove);
    window.removeEventListener('pointerup', this._winUp);
    window.removeEventListener('pointercancel', this._winUp);
  }

  private _onViewportWheel(e: FederatedWheelEvent): void {
    e.preventDefault?.();
    const dy = (e as unknown as { deltaY?: number }).deltaY ?? 0;
    this._applyScrollDy(-dy * 0.45);
  }

  private _scrollBounds(): { min: number; max: number } {
    const innerH = this._scrollInner.getLocalBounds().height;
    const max = 0;
    const min = Math.min(0, this._viewportH - innerH);
    return { min, max };
  }

  private _applyScrollDy(dy: number): void {
    const { min, max } = this._scrollBounds();
    let y = this._scrollInner.position.y + dy;
    if (y > max) {
      y = max;
    }
    if (y < min) {
      y = min;
    }
    this._scrollInner.position.y = y;
  }

  private _makeRow(def: AchievementDef, unlocked: boolean): Container {
    const row = new Container();
    const barW = 5;
    const tw = this._contentTextW;
    const accent = unlocked ? 0xc9a030 : 0x4a4540;
    const titleFill = unlocked ? 0xfff4e8 : 0x7a7268;
    const subFill = unlocked ? 0xa09080 : 0x5a5248;

    const titleSt = new TextStyle({
      fontFamily: HUD_FONT,
      fontSize: 17,
      fontWeight: 'bold',
      fill: titleFill,
      wordWrap: true,
      wordWrapWidth: tw - barW - 14,
    });
    const status = new Text({
      text: unlocked ? '已解锁' : '未解锁',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 12,
        fontWeight: 'bold',
        fill: unlocked ? 0x88cc88 : 0x665850,
      }),
    });
    status.anchor.set(1, 0);

    const title = new Text({ text: def.title, style: titleSt });
    const pad = 12;
    let y = pad;
    title.position.set(barW + 12, y);
    y += title.height + 6;
    status.position.set(barW + tw - 8, pad + 2);

    const bodySt = new TextStyle({
      fontFamily: HUD_FONT,
      fontSize: 14,
      fill: subFill,
      wordWrap: true,
      wordWrapWidth: tw - barW - 10,
      lineHeight: 22,
    });
    const body = new Text({ text: def.description, style: bodySt });
    body.position.set(barW + 8, y);
    y += body.height + pad;

    const bar = new Graphics();
    bar.roundRect(0, 0, barW, y, 2).fill(accent);
    row.addChild(bar, title, status, body);
    return row;
  }

  private _rebuildList(): void {
    this._scrollInner.removeChildren();
    const save = loadAchievementSave();
    const unlocked = getUnlockedAchievementIds(save);
    let y = 0;
    const gap = 14;
    for (const def of ACHIEVEMENT_DEFS) {
      const block = this._makeRow(def, unlocked.has(def.id));
      block.position.y = y;
      this._scrollInner.addChild(block);
      const b = block.getLocalBounds();
      y += b.height + gap;
    }
    this._scrollInner.position.y = 0;
    const { min, max } = this._scrollBounds();
    if (this._scrollInner.position.y < min) {
      this._scrollInner.position.y = min;
    }
    if (this._scrollInner.position.y > max) {
      this._scrollInner.position.y = max;
    }
  }

  public resize(w: number, h: number): void {
    this._dim.clear();
    this._dim.rect(0, 0, w, h).fill({ color: 0x181008, alpha: 0.94 });

    this._padX = Math.max(14, Math.min(22, w * 0.04));
    this._title.position.set(w * 0.5, 40);
    this._summary.position.set(w * 0.5, 78);

    this._scrollTop = 108;
    const bottomReserve = 56;
    this._viewportW = w - this._padX * 2;
    this._viewportH = Math.max(200, h - this._scrollTop - bottomReserve);
    this._contentTextW = this._viewportW - 8;
    this._viewport.position.set(this._padX, this._scrollTop);

    this._scrollMask.clear();
    this._scrollMask.rect(0, 0, this._viewportW, this._viewportH).fill({ color: 0xffffff });

    const bw = Math.min(220, w * 0.55);
    const bh = 44;
    this._backBg.clear();
    this._backBg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, bh * 0.5).fill({ color: 0xe8c878 });
    this._backBg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, bh * 0.5).stroke({ width: 2, color: 0x5a4020 });
    this._backBtn.position.set(w * 0.5, h - 28);
    this._backBtn.hitArea = new Rectangle(-bw * 0.5, -bh * 0.5, bw, bh);

    this._rebuildList();
    const save = loadAchievementSave();
    const p = getAchievementProgressSummary(save);
    this._summary.text = `累计击杀 ${p.totalKills}　累计阵亡 ${p.deathCount}`;
  }
}
