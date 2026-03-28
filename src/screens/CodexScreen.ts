import {
  Container,
  FederatedPointerEvent,
  FederatedWheelEvent,
  FillGradient,
  Graphics,
  Rectangle,
  Text,
  TextStyle,
} from 'pixi.js';

import {
  CODEX_CATEGORY_SUBJECT,
  CODEX_CATEGORY_TABS,
  getCodexCategoryCount,
  getCodexEntries,
  type CodexCategory,
  type CodexEntry,
} from '../game/codex/codexData';
import {
  levelUpCardTierPresentation,
  type LevelUpCardTier,
} from '../game/config/levelUpCardsConfig';
import { app } from '../utils/application';
import { fadeAlpha } from '../utils/screenFx';
import type { AppScreen } from '../utils/navigation';
import { navigation } from '../utils/navigation';

const HUD_FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif';

/** 规范间距（px） */
const M8 = 8;
const M12 = 12;
const M16 = 16;
const M24 = 24;
const SIDE = 24;
/** 装饰面板距屏幕边距（略小于 `SIDE`，让顶栏内容区更宽） */
const PANEL_SIDE = 10;
/** 列表卡片相对可视区左右各缩进，使卡片变窄、两侧留白 */
const LIST_CARD_SIDE_INSET = 18;
/** 大卡片内边距 */
const CARD_INNER_PAD = M24 + M12;
/** 列表末尾留白，避免最后一项贴底且方便滚动到底 */
const SCROLL_LIST_BOTTOM_PAD = 32;
/** 列表拖动累计小于该值视为点击，打开详情 */
const LIST_TAP_DRAG_THRESHOLD = 14;

/** 带 `codexEntry` 的列表块，供全局坐标拾取 */
type CodexListBlock = Container & { codexEntry?: CodexEntry };

/** 图鉴屏：标题区与 Tab 分区、分类角标、分区行「主题 | 共 N 单位」、单条大卡片/多条列表、详情浮层与顶栏返回。 */
export class CodexScreen extends Container implements AppScreen {
  public static SCREEN_ID = 'codex';

  private readonly _dim = new Graphics();
  private readonly _panel = new Graphics();
  private readonly _topBack = new Container();
  private readonly _topBackGfx = new Graphics();
  private readonly _topBackLabel: Text;
  private readonly _title: Text;
  private readonly _subtitle: Text;
  private readonly _progressLine: Text;
  private readonly _tabRow = new Container();
  private readonly _tabHits: {
    cat: CodexCategory;
    root: Container;
    bg: Graphics;
    label: Text;
    badge: Container;
    badgeBg: Graphics;
    badgeText: Text;
  }[] = [];
  private readonly _sectionRow = new Container();
  private readonly _sectionSubject: Text;
  private readonly _sectionSep: Text;
  private readonly _sectionPrefix: Text;
  private readonly _sectionCount: Text;
  private readonly _sectionUnit: Text;
  private readonly _viewport = new Container();
  private readonly _scrollMask = new Graphics();
  private readonly _scrollInner = new Container();
  private readonly _backBtn = new Container();
  private readonly _backBg = new Graphics();
  private readonly _backLabel: Text;

  private readonly _detailRoot = new Container();
  private readonly _detailDim = new Graphics();
  private readonly _detailPanel = new Graphics();
  private readonly _detailTitle: Text;
  private readonly _detailScrollMask = new Graphics();
  private readonly _detailScroll = new Container();
  private readonly _detailBody: Text;
  private readonly _detailClose = new Container();
  private readonly _detailCloseBg = new Graphics();
  private readonly _detailCloseX: Text;

  private _category: CodexCategory = 'hero';
  private _dragging = false;
  private _lastGlobalY = 0;
  private _detailDragging = false;
  private _detailLastY = 0;
  private _viewportW = 320;
  private _viewportH = 400;
  /** 列表内单张卡片的绘制宽度（窄于 `_viewportW`，两侧留白） */
  private _listCardW = 280;
  private _tabBtnW = 72;
  private _tabH = 36;
  private _viewportTopY = 200;
  private _detailPanelH = 400;
  private _detailInnerW = 300;
  /** 列表区 pointerdown 时的全局坐标（用于松手后拾取条目） */
  private _vpDownGx = 0;
  private _vpDownGy = 0;
  /** 列表拖动竖直位移累计（区分滑动与轻点） */
  private _vpDragAbs = 0;

  private readonly _winMove = (ev: PointerEvent): void => {
    if (!this._dragging) {
      return;
    }
    const g = this._clientToGlobal(ev.clientX, ev.clientY);
    const dy = g.y - this._lastGlobalY;
    this._lastGlobalY = g.y;
    this._vpDragAbs += Math.abs(dy);
    this._applyScrollDy(dy, this._scrollInner, this._viewportH);
  };
  private readonly _winUp = (): void => {
    const hadListPan = this._dragging;
    const dragSum = this._vpDragAbs;
    const gx = this._vpDownGx;
    const gy = this._vpDownGy;
    this._endDrag();
    if (hadListPan && dragSum < LIST_TAP_DRAG_THRESHOLD && !this._detailRoot.visible) {
      const picked = this._pickEntryAtGlobal(gx, gy);
      if (picked) {
        this._openDetail(picked);
      }
    }
  };

  private readonly _detailWinMove = (ev: PointerEvent): void => {
    if (!this._detailDragging) {
      return;
    }
    const g = this._clientToGlobal(ev.clientX, ev.clientY);
    const dy = g.y - this._detailLastY;
    this._detailLastY = g.y;
    const innerH = this._detailBody.height + M24;
    const min = Math.min(0, this._detailPanelH - M16 * 2 - 52 - innerH);
    let y = this._detailScroll.position.y + dy;
    y = Math.max(min, Math.min(0, y));
    this._detailScroll.position.y = y;
  };
  private readonly _detailWinUp = (): void => {
    this._detailEndDrag();
  };

  public constructor() {
    super();

    this._topBackGfx.moveTo(10, 1).lineTo(2, 9).lineTo(10, 17).stroke({ width: 2.5, color: 0xe8d8c8 });
    this._topBackLabel = new Text({
      text: '返回',
      style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 15, fontWeight: '600', fill: 0xe8d8c8 }),
    });
    this._topBackLabel.position.set(16, 0);
    this._topBack.addChild(this._topBackGfx, this._topBackLabel);
    this._topBack.eventMode = 'static';
    this._topBack.cursor = 'pointer';
    this._topBack.hitArea = new Rectangle(-4, -6, 72, 32);
    this._topBack.on('pointertap', () => {
      void import('./HomeScreen').then((m) => navigation.goToScreen(m.HomeScreen));
    });

    this._title = new Text({
      text: '图鉴',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 3,
        fill: 0xfff8e8,
        dropShadow: { alpha: 0.6, angle: Math.PI / 2, blur: 6, color: 0x1a1008, distance: 2 },
      }),
    });
    this._title.anchor.set(0.5, 0);

    this._subtitle = new Text({
      text: '战役资料馆 · 单位与装备说明',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 13,
        fontWeight: 'normal',
        fill: 0x8a8078,
        letterSpacing: 0.5,
        wordWrap: true,
        wordWrapWidth: 300,
        align: 'center',
        breakWords: true,
      }),
    });
    this._subtitle.anchor.set(0.5, 0);

    this._progressLine = new Text({
      text: '图鉴资料完整度：100%（当前默认全开）',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 12,
        fill: 0x6a6058,
        wordWrap: true,
        wordWrapWidth: 300,
        align: 'center',
        breakWords: true,
      }),
    });
    this._progressLine.anchor.set(0.5, 0);

    for (const tab of CODEX_CATEGORY_TABS) {
      const root = new Container();
      const bg = new Graphics();
      const label = new Text({
        text: tab.label,
        style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 14, fontWeight: 'bold', fill: 0xd8ccb8 }),
      });
      label.anchor.set(0.5);
      const badge = new Container();
      const badgeBg = new Graphics();
      const badgeText = new Text({
        text: '0',
        style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 10, fontWeight: 'bold', fill: 0x2a1a0a }),
      });
      badgeText.anchor.set(0.5);
      badge.addChild(badgeBg, badgeText);
      badge.position.set(0, 0);
      root.addChild(bg, label, badge);
      root.eventMode = 'static';
      root.cursor = 'pointer';
      const cat = tab.id;
      root.on('pointertap', () => this._selectCategory(cat));
      root.on('pointerover', () => {
        if (this._category !== cat) {
          root.scale.set(1.03);
        }
      });
      root.on('pointerout', () => root.scale.set(1));
      this._tabHits.push({ cat: tab.id, root, bg, label, badge, badgeBg, badgeText });
      this._tabRow.addChild(root);
    }

    this._sectionSubject = new Text({
      text: '',
      style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 14, fontWeight: '600', fill: 0xc9b8a0 }),
    });
    this._sectionSep = new Text({ text: ' | ', style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 14, fill: 0x6a6058 }) });
    this._sectionPrefix = new Text({ text: '共 ', style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 14, fill: 0xa89888 }) });
    this._sectionCount = new Text({
      text: '0',
      style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 16, fontWeight: 'bold', fill: 0xffcc66 }),
    });
    this._sectionUnit = new Text({ text: '', style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 14, fill: 0xa89888 }) });
    this._sectionRow.addChild(this._sectionSubject, this._sectionSep, this._sectionPrefix, this._sectionCount, this._sectionUnit);

    this._viewport.addChild(this._scrollMask, this._scrollInner);
    this._scrollInner.mask = this._scrollMask;
    this._scrollInner.eventMode = 'passive';
    this._viewport.eventMode = 'static';
    this._viewport.cursor = 'grab';
    this._viewport.on('pointerdown', (e: FederatedPointerEvent) => this._onViewportDown(e));
    this._viewport.on('wheel', (e: FederatedWheelEvent) => this._onViewportWheel(e));

    this._backLabel = new Text({
      text: '返回首页',
      style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 17, fontWeight: 'bold', fill: 0x2a1a0a }),
    });
    this._backLabel.anchor.set(0.5);
    this._backBtn.addChild(this._backBg, this._backLabel);
    this._backBtn.eventMode = 'static';
    this._backBtn.cursor = 'pointer';
    this._backBtn.on('pointertap', () => {
      void import('./HomeScreen').then((m) => navigation.goToScreen(m.HomeScreen));
    });

    this._detailDim.eventMode = 'static';
    this._detailDim.on('pointertap', () => this._closeDetail());
    this._detailTitle = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 20,
        fontWeight: 'bold',
        fill: 0xfff4e8,
        wordWrap: true,
        wordWrapWidth: 280,
      }),
    });
    this._detailTitle.anchor.set(0, 0);
    this._detailBody = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 14,
        fill: 0xd8ccb8,
        lineHeight: 24,
        wordWrap: true,
        wordWrapWidth: 300,
        breakWords: true,
      }),
    });
    this._detailBody.anchor.set(0, 0);
    this._detailScroll.addChild(this._detailBody);
    this._detailScroll.mask = this._detailScrollMask;
    this._detailScroll.eventMode = 'static';
    this._detailScroll.cursor = 'grab';
    this._detailScroll.on('pointerdown', (e: FederatedPointerEvent) => this._onDetailPointerDown(e));
    this._detailScroll.on('wheel', (e: FederatedWheelEvent) => {
      e.preventDefault?.();
      const dy = (e as unknown as { deltaY?: number }).deltaY ?? 0;
      const innerH = this._detailBody.height + M24;
      const min = Math.min(0, this._detailPanelH - M16 * 2 - 52 - innerH);
      let y = this._detailScroll.position.y - dy * 0.4;
      y = Math.max(min, Math.min(0, y));
      this._detailScroll.position.y = y;
    });

    this._detailCloseX = new Text({
      text: '×',
      style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 26, fontWeight: 'bold', fill: 0xe8d8c8 }),
    });
    this._detailCloseX.anchor.set(0.5);
    this._detailClose.addChild(this._detailCloseBg, this._detailCloseX);
    this._detailClose.eventMode = 'static';
    this._detailClose.cursor = 'pointer';
    this._detailClose.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._closeDetail();
    });

    this._detailRoot.visible = false;
    this._detailRoot.addChild(this._detailDim, this._detailPanel, this._detailTitle, this._detailScrollMask, this._detailScroll, this._detailClose);

    this.addChild(
      this._dim,
      this._panel,
      this._topBack,
      this._title,
      this._subtitle,
      this._progressLine,
      this._tabRow,
      this._sectionRow,
      this._viewport,
      this._backBtn,
      this._detailRoot,
    );
  }

  public prepare(): void {
    this._scrollInner.position.y = 0;
    this._closeDetail();
    if (this._viewportW > 1) {
      this._rebuildList();
    }
    this._syncSectionRow();
    this._paintAllTabs();
  }

  public async show(): Promise<void> {
    this.prepare();
    await fadeAlpha(this, 0, 1, 200);
  }

  public async hide(): Promise<void> {
    this._endDrag();
    this._detailEndDrag();
    this._closeDetail();
    await fadeAlpha(this, this.alpha, 0, 160);
  }

  private _syncSectionRow(): void {
    const { subject, unit } = CODEX_CATEGORY_SUBJECT[this._category];
    const n = getCodexCategoryCount(this._category);
    this._sectionSubject.text = subject;
    this._sectionCount.text = String(n);
    this._sectionUnit.text = ` ${unit}`;
    let x = 0;
    this._sectionSubject.position.set(x, 0);
    x += this._sectionSubject.width;
    this._sectionSep.position.set(x, 0);
    x += this._sectionSep.width;
    this._sectionPrefix.position.set(x, 0);
    x += this._sectionPrefix.width;
    this._sectionCount.position.set(x, -1);
    x += this._sectionCount.width;
    this._sectionUnit.position.set(x, 0);
  }

  private _clientToGlobal(clientX: number, clientY: number): { x: number; y: number } {
    const rect = app.canvas.getBoundingClientRect();
    const rw = app.renderer.width;
    const rh = app.renderer.height;
    return {
      x: (clientX - rect.left) * (rw / Math.max(1, rect.width)),
      y: (clientY - rect.top) * (rh / Math.max(1, rect.height)),
    };
  }

  private _onViewportDown(e: FederatedPointerEvent): void {
    if (this._detailRoot.visible) {
      return;
    }
    this._dragging = true;
    this._vpDownGx = e.global.x;
    this._vpDownGy = e.global.y;
    this._vpDragAbs = 0;
    this._lastGlobalY = e.global.y;
    this._viewport.cursor = 'grabbing';
    window.addEventListener('pointermove', this._winMove);
    window.addEventListener('pointerup', this._winUp);
    window.addEventListener('pointercancel', this._winUp);
  }

  private _onDetailPointerDown(e: FederatedPointerEvent): void {
    e.stopPropagation();
    this._detailDragging = true;
    this._detailLastY = e.global.y;
    window.addEventListener('pointermove', this._detailWinMove);
    window.addEventListener('pointerup', this._detailWinUp);
    window.addEventListener('pointercancel', this._detailWinUp);
  }

  private _detailEndDrag(): void {
    if (!this._detailDragging) {
      return;
    }
    this._detailDragging = false;
    window.removeEventListener('pointermove', this._detailWinMove);
    window.removeEventListener('pointerup', this._detailWinUp);
    window.removeEventListener('pointercancel', this._detailWinUp);
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
    if (this._detailRoot.visible) {
      return;
    }
    e.preventDefault?.();
    const dy = (e as unknown as { deltaY?: number }).deltaY ?? 0;
    this._applyScrollDy(-dy * 0.45, this._scrollInner, this._viewportH);
  }

  private _scrollBounds(inner: Container, viewH: number): { min: number; max: number } {
    const innerH = inner.getLocalBounds().height;
    return { min: Math.min(0, viewH - innerH), max: 0 };
  }

  /** 在全局坐标下命中列表块并返回对应图鉴条目（自上而下优先） */
  private _pickEntryAtGlobal(gx: number, gy: number): CodexEntry | null {
    const ch = this._scrollInner.children;
    for (let i = ch.length - 1; i >= 0; i--) {
      const block = ch[i] as CodexListBlock;
      if (block.codexEntry == null) {
        continue;
      }
      const r = block.getBounds();
      if (gx >= r.x && gx <= r.x + r.width && gy >= r.y && gy <= r.y + r.height) {
        return block.codexEntry;
      }
    }
    return null;
  }

  /** 强化卡：按档位渐变底+描边；其它分类用纯色底 */
  private _fillListCardFace(
    g: Graphics,
    w: number,
    h: number,
    cornerR: number,
    tier: LevelUpCardTier | undefined,
    fallbackFill: number,
    fallbackStroke: number,
  ): void {
    g.clear();
    if (tier == null) {
      g.roundRect(0, 0, w, h, cornerR).fill({ color: fallbackFill, alpha: 0.92 });
      g.roundRect(0, 0, w, h, cornerR).stroke({ width: 1, color: fallbackStroke, alpha: 0.85 });
      return;
    }
    const p = levelUpCardTierPresentation[tier];
    const grad = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      textureSpace: 'local',
    });
    grad.addColorStop(0, p.rimHot);
    grad.addColorStop(0.42, p.rim);
    grad.addColorStop(1, p.badgeBg);
    g.roundRect(0, 0, w, h, cornerR).fill({ fill: grad, alpha: 0.93 });
    g.roundRect(0, 0, w, h, cornerR).stroke({ width: 2, color: p.rimHot, alpha: 0.92 });
  }

  /** 强化卡斜向细线材质层（裁切圆角内，与档位高光同色） */
  private _tierSheenLayer(w: number, h: number, cornerR: number, tier: LevelUpCardTier): Container {
    const layer = new Container();
    const p = levelUpCardTierPresentation[tier];
    const lines = new Graphics();
    const step = 11;
    for (let ox = -h; ox < w + h; ox += step) {
      lines.moveTo(ox, 0).lineTo(ox + h * 0.92, h).stroke({ width: 0.85, color: p.rimHot, alpha: 0.16 });
    }
    const mask = new Graphics();
    mask.roundRect(0, 0, w, h, cornerR).fill({ color: 0xffffff });
    lines.mask = mask;
    layer.eventMode = 'passive';
    layer.addChild(lines, mask);
    return layer;
  }

  private _applyScrollDy(dy: number, inner: Container, viewH: number): void {
    const { min, max } = this._scrollBounds(inner, viewH);
    let y = inner.position.y + dy;
    inner.position.y = Math.max(min, Math.min(max, y));
  }

  private async _selectCategory(cat: CodexCategory): Promise<void> {
    if (cat === this._category) {
      return;
    }
    await fadeAlpha(this._scrollInner, 1, 0, 100);
    this._category = cat;
    this._scrollInner.position.y = 0;
    this._syncSectionRow();
    this._paintAllTabs();
    this._rebuildList();
    await fadeAlpha(this._scrollInner, 0, 1, 130);
  }

  private _paintAllTabs(): void {
    const wTab = this._tabBtnW;
    const hTab = this._tabH;
    for (const t of this._tabHits) {
      const active = t.cat === this._category;
      const cnt = getCodexCategoryCount(t.cat);
      t.label.style.fill = active ? 0x1a1208 : 0xc8b8a8;
      t.badgeText.text = String(cnt);
      t.badgeText.style.fill = active ? 0x2a1a0a : 0xe8d8c8;
      t.bg.clear();
      if (active) {
        t.bg.roundRect(-wTab * 0.5, -hTab * 0.5, wTab, hTab, 10).fill({ color: 0xf0c860 });
        t.bg.roundRect(-wTab * 0.5, -hTab * 0.5, wTab, hTab, 10).stroke({ width: 2, color: 0xffe8a0 });
      } else {
        t.bg.roundRect(-wTab * 0.5, -hTab * 0.5, wTab, hTab, 10).fill({ color: 0x000000, alpha: 0.15 });
        t.bg.roundRect(-wTab * 0.5, -hTab * 0.5, wTab, hTab, 10).stroke({ width: 2, color: 0x7a6860, alpha: 0.9 });
      }
      const bw = Math.max(18, t.badgeText.width + M8);
      const bh = 16;
      t.badge.position.set(wTab * 0.5 - bw * 0.5 - 2, -hTab * 0.5 + 2);
      t.badgeBg.clear();
      t.badgeBg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, 7).fill({ color: active ? 0xfff0c0 : 0x3a3228, alpha: 0.95 });
      t.badgeBg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, 7).stroke({ width: 1, color: active ? 0x8a7030 : 0x5a5048 });
      t.badgeText.position.set(0, 0);
    }
  }

  /** 双列核心参数栅格，返回占用高度 */
  private _layoutCoreStats(
    parent: Container,
    stats: { label: string; value: string }[],
    startY: number,
    colW: number,
    labelStyle: TextStyle,
    valueStyle: TextStyle,
  ): number {
    let y = startY;
    const half = (colW - M16) * 0.5;
    for (let i = 0; i < stats.length; i += 2) {
      const a = stats[i]!;
      const la = new Text({ text: a.label, style: labelStyle });
      const va = new Text({ text: a.value, style: valueStyle });
      la.position.set(0, y);
      va.position.set(0, y + la.height + 2);
      parent.addChild(la, va);
      let rowH = la.height + 2 + va.height;
      if (stats[i + 1]) {
        const b = stats[i + 1]!;
        const lb = new Text({ text: b.label, style: labelStyle });
        const vb = new Text({ text: b.value, style: valueStyle });
        lb.position.set(half + M16, y);
        vb.position.set(half + M16, y + lb.height + 2);
        parent.addChild(lb, vb);
        const h2 = lb.height + 2 + vb.height;
        if (h2 > rowH) {
          rowH = h2;
        }
      }
      y += rowH + M8;
    }
    return y - startY;
  }

  /** 列表块仅作拾取标记且为 passive，避免挡住视口滚动；轻点打开详情由 `_winUp` 处理 */
  private _registerListBlock(root: CodexListBlock, entry: CodexEntry): void {
    root.codexEntry = entry;
    root.eventMode = 'passive';
    root.cursor = 'default';
  }

  private _openDetail(entry: CodexEntry): void {
    this._detailEndDrag();
    this._detailTitle.text = entry.subtitle ? `${entry.title} · ${entry.subtitle}` : entry.title;
    this._detailTitle.style.wordWrapWidth = this._detailInnerW;
    const parts: string[] = [];
    if (entry.coreStats?.length) {
      parts.push('【核心参数】');
      for (const r of entry.coreStats) {
        parts.push(`${r.label}：${r.value}`);
      }
    }
    parts.push('【完整说明】', entry.body);
    if (entry.detailExtra) {
      parts.push('', entry.detailExtra);
    }
    this._detailBody.text = parts.join('\n');
    this._detailBody.style.wordWrapWidth = this._detailInnerW;
    this._detailScroll.position.y = 0;
    this._detailRoot.visible = true;
    this._detailRoot.alpha = 1;
  }

  private _closeDetail(): void {
    this._detailEndDrag();
    this._detailRoot.visible = false;
  }

  private _makeDetailChip(): Container {
    const c = new Container();
    const g = new Graphics();
    const t = new Text({
      text: '查看详情 ›',
      style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 14, fontWeight: 'bold', fill: 0xffe8a8 }),
    });
    t.anchor.set(0.5);
    const tw = t.width + M24;
    const th = 36;
    g.roundRect(-tw * 0.5, -th * 0.5, tw, th, 10).fill({ color: 0x3a3020, alpha: 0.95 });
    g.roundRect(-tw * 0.5, -th * 0.5, tw, th, 10).stroke({ width: 2, color: 0xc9a030 });
    c.addChild(g, t);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new Rectangle(-tw * 0.5, -th * 0.5, tw, th);
    c.on('pointerdown', () => c.scale.set(0.95));
    c.on('pointerup', () => c.scale.set(1));
    c.on('pointerupoutside', () => c.scale.set(1));
    return c;
  }

  /** 单条分类：大卡片铺满参数 + 正文摘要 + 详情按钮 */
  private _makeExpandedCard(entry: CodexEntry): Container {
    const row = new Container();
    const cardW = this._listCardW;
    const innerPad = CARD_INNER_PAD;
    const textColW = Math.max(80, cardW - innerPad * 2);
    const labelSt = new TextStyle({ fontFamily: HUD_FONT, fontSize: 12, fill: 0x9a9088 });
    const valueSt = new TextStyle({ fontFamily: HUD_FONT, fontSize: 14, fontWeight: '600', fill: 0xf0e8d8 });

    const title = new Text({
      text: entry.title,
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 22,
        fontWeight: 'bold',
        fill: 0xfff8f0,
        dropShadow: { alpha: 0.35, blur: 2, color: 0x000000, distance: 1, angle: Math.PI / 2 },
        wordWrap: true,
        wordWrapWidth: textColW,
        breakWords: true,
      }),
    });
    title.position.set(innerPad, innerPad);
    let y = innerPad + title.height + M16;
    row.addChild(title);
    if (entry.subtitle) {
      const sub = new Text({
        text: entry.subtitle,
        style: new TextStyle({
          fontFamily: HUD_FONT,
          fontSize: 13,
          fill: 0xb8a898,
          wordWrap: true,
          wordWrapWidth: textColW,
          breakWords: true,
        }),
      });
      sub.position.set(innerPad, y);
      y += sub.height + M16;
      row.addChild(sub);
    }
    if (entry.coreStats?.length) {
      const h = this._layoutCoreStats(row, entry.coreStats, y, cardW - innerPad * 2, labelSt, valueSt);
      y += h + M16;
    }
    const bodyPreview = entry.body.split('\n').slice(0, 5).join('\n');
    const body = new Text({
      text: `${bodyPreview}${entry.body.split('\n').length > 5 ? '\n…' : ''}`,
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 14,
        fill: 0xd0c4b8,
        lineHeight: 23,
        wordWrap: true,
        wordWrapWidth: textColW,
        breakWords: true,
      }),
    });
    body.position.set(innerPad, y);
    y += body.height + M24;
    row.addChild(body);

    const chip = this._makeDetailChip();
    chip.position.set(cardW * 0.5, y + 18);
    chip.on('pointertap', (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this._openDetail(entry);
    });
    row.addChild(chip);
    y += 56 + M12;

    const card = new Graphics();
    this._fillListCardFace(card, cardW, y, 14, entry.cardTier, 0x1e1814, 0x5a4a40);
    row.addChildAt(card, 0);
    if (entry.cardTier) {
      row.addChildAt(this._tierSheenLayer(cardW, y, 14, entry.cardTier), 1);
    }
    this._registerListBlock(row, entry);
    return row;
  }

  /** 多条目：固定高度紧凑行 */
  private _makeCompactRow(entry: CodexEntry): Container {
    const row = new Container();
    const cardW = this._listCardW;
    const px = M16 + M12;
    const py = M12 + M12;
    const hFix = 80 + M12 * 2;
    const card = new Graphics();
    this._fillListCardFace(card, cardW, hFix, 12, entry.cardTier, 0x1a1612, 0x4a4038);
    row.addChild(card);
    if (entry.cardTier) {
      row.addChild(this._tierSheenLayer(cardW, hFix, 12, entry.cardTier));
    }

    const title = new Text({
      text: entry.title,
      style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 17, fontWeight: 'bold', fill: 0xf2ebe4 }),
    });
    title.position.set(px, py);
    const chevCol = 32;
    const sum = new Text({
      text: entry.listSummary ?? entry.body.split('\n')[0] ?? '',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 13,
        fill: 0xa89888,
        wordWrap: true,
        wordWrapWidth: Math.max(60, cardW - px - chevCol - M12),
        breakWords: true,
      }),
    });
    sum.position.set(px, py + title.height + M8);
    const chevFill = entry.cardTier ? levelUpCardTierPresentation[entry.cardTier].rimHot : 0xc9a030;
    const chev = new Text({
      text: '›',
      style: new TextStyle({ fontFamily: HUD_FONT, fontSize: 28, fontWeight: 'bold', fill: chevFill }),
    });
    chev.anchor.set(0.5, 0.5);
    chev.position.set(cardW - M12 - 14, hFix * 0.5);
    row.addChild(title, sum, chev);
    this._registerListBlock(row, entry);
    return row;
  }

  private _makeEmptyState(): Container {
    const c = new Container();
    const cardW = this._listCardW;
    const h = 160 + M12 * 2;
    const g = new Graphics();
    g.roundRect(0, 0, cardW, h, 14).fill({ color: 0x1a1612, alpha: 0.75 });
    g.roundRect(0, 0, cardW, h, 14).stroke({ width: 1, color: 0x4a4038, alpha: 0.6 });
    const t = new Text({
      text: '暂无该分类图鉴内容\n快去战斗中探索吧～',
      style: new TextStyle({
        fontFamily: HUD_FONT,
        fontSize: 16,
        fill: 0x8a8078,
        align: 'center',
        lineHeight: 26,
        wordWrap: true,
        wordWrapWidth: Math.max(80, cardW - CARD_INNER_PAD * 2),
        breakWords: true,
      }),
    });
    t.anchor.set(0.5);
    t.position.set(cardW * 0.5, h * 0.5);
    c.addChild(g, t);
    return c;
  }

  private _rebuildList(): void {
    this._scrollInner.removeChildren();
    const entries = getCodexEntries(this._category);
    if (entries.length === 0) {
      const empty = this._makeEmptyState();
      empty.position.set(Math.max(0, (this._viewportW - this._listCardW) * 0.5), 0);
      this._scrollInner.addChild(empty);
      this._scrollInner.position.y = 0;
      return;
    }
    let y = 0;
    const gap = M16;
    const single = entries.length === 1;
    const listX = Math.max(0, (this._viewportW - this._listCardW) * 0.5);
    for (const ent of entries) {
      const block = single ? this._makeExpandedCard(ent) : this._makeCompactRow(ent);
      block.position.set(listX, y);
      this._scrollInner.addChild(block);
      y += block.getLocalBounds().height + gap;
    }
    const tailPad = new Graphics();
    tailPad.rect(0, y, this._viewportW, SCROLL_LIST_BOTTOM_PAD).fill({ color: 0xffffff, alpha: 0.02 });
    tailPad.eventMode = 'none';
    this._scrollInner.addChild(tailPad);
    this._scrollInner.position.y = 0;
    const { min, max } = this._scrollBounds(this._scrollInner, this._viewportH);
    this._scrollInner.position.y = Math.max(min, Math.min(max, this._scrollInner.position.y));
  }

  /** 排布 Tab 行；`tabY0` 为第一行 Tab 中心 Y；返回 Tab 区域底边 Y。 */
  private _layoutTabs(w: number, tabY0: number): number {
    const narrow = w < 420;
    const tabTotalW = w - SIDE * 2;
    const tabGap = narrow ? M8 : M8;
    const rowGap = narrow ? M8 : 0;
    const hTab = narrow ? 36 : 38;
    this._tabH = hTab;
    const tabW = narrow ? (tabTotalW - tabGap) / 2 : (tabTotalW - tabGap * 3) / 4;
    this._tabBtnW = tabW;
    for (let i = 0; i < this._tabHits.length; i++) {
      const t = this._tabHits[i]!;
      const col = narrow ? i % 2 : i;
      const row = narrow ? Math.floor(i / 2) : 0;
      const tx = SIDE + tabW * 0.5 + col * (tabW + tabGap);
      const ty = tabY0 + row * (hTab + rowGap);
      t.root.position.set(tx, ty);
      t.root.hitArea = new Rectangle(-tabW * 0.5, -hTab * 0.5, tabW, hTab);
      const fs = Math.min(14, Math.max(11, Math.floor(tabW * 0.19)));
      t.label.style.fontSize = fs;
    }
    this._paintAllTabs();
    const lastRow = narrow ? 1 : 0;
    const lastCenterY = tabY0 + lastRow * (hTab + rowGap);
    return lastCenterY + hTab * 0.5;
  }

  public resize(w: number, h: number): void {
    this._dim.clear();
    const dimGrad = new FillGradient({
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
      textureSpace: 'local',
    });
    dimGrad.addColorStop(0, 0x121a1c);
    dimGrad.addColorStop(1, 0x0a0e10);
    this._dim.rect(0, 0, w, h).fill({ fill: dimGrad, alpha: 0.97 });

    const panelTop = 12;
    const panelBottom = h - 12;
    this._panel.clear();
    const pGrad = new FillGradient({ start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, textureSpace: 'local' });
    pGrad.addColorStop(0, 0x2c241c);
    pGrad.addColorStop(1, 0x161210);
    const pm = PANEL_SIDE;
    this._panel.roundRect(pm, panelTop, w - pm * 2, panelBottom - panelTop, 20).fill({ fill: pGrad, alpha: 0.5 });
    this._panel.roundRect(pm, panelTop, w - pm * 2, panelBottom - panelTop, 20).stroke({ width: 2, color: 0x5a4838, alpha: 0.55 });

    this._topBack.position.set(M16 + 6, 26);

    const headerTextW = Math.max(160, w - SIDE * 2);
    this._title.style.wordWrap = true;
    this._title.style.wordWrapWidth = headerTextW;
    this._title.style.breakWords = true;
    this._title.style.align = 'center';
    this._subtitle.style.wordWrapWidth = headerTextW;
    this._progressLine.style.wordWrapWidth = headerTextW;

    const titleY = 50;
    this._title.position.set(w * 0.5, titleY);
    this._subtitle.position.set(w * 0.5, titleY + this._title.height + M16);
    this._progressLine.position.set(w * 0.5, this._subtitle.y + this._subtitle.height + M16);

    const narrowTabs = w < 420;
    const hTabProbe = narrowTabs ? 36 : 38;
    const progressBottom = this._progressLine.y + this._progressLine.height;
    const tabsStartY = progressBottom + M24 + hTabProbe * 0.5;
    const afterTabs = this._layoutTabs(w, tabsStartY);
    this._sectionRow.position.set(SIDE, afterTabs + M24);

    this._viewportW = w - SIDE * 2;
    this._listCardW = Math.max(200, this._viewportW - LIST_CARD_SIDE_INSET * 2);
    const sectionH = 22;
    this._viewportTopY = afterTabs + M24 + sectionH + M24;
    const bottomBarH = 52;
    const belowViewportGap = M24;
    this._viewportH = Math.max(140, h - this._viewportTopY - bottomBarH - belowViewportGap - M16);
    this._viewport.position.set(SIDE, this._viewportTopY);

    this._scrollMask.clear();
    this._scrollMask.rect(0, 0, this._viewportW, this._viewportH).fill({ color: 0xffffff });

    const bw = Math.min(240, w * 0.62);
    const bh = 46;
    this._backBg.clear();
    this._backBg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, bh * 0.5).fill({ color: 0xe8c878 });
    this._backBg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, bh * 0.5).stroke({ width: 2, color: 0x5a4020 });
    this._backBtn.position.set(w * 0.5, this._viewportTopY + this._viewportH + belowViewportGap + bh * 0.5);
    this._backBtn.hitArea = new Rectangle(-bw * 0.5, -bh * 0.5, bw, bh);

    const dPw = Math.min(w - M24 * 2, 400);
    this._detailPanelH = Math.min(h - 80, 560);
    this._detailInnerW = dPw - M24 * 2;
    this._detailDim.clear();
    this._detailDim.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.65 });
    const dPx = (w - dPw) * 0.5;
    const dPy = (h - this._detailPanelH) * 0.5;
    this._detailPanel.clear();
    this._detailPanel.roundRect(dPx, dPy, dPw, this._detailPanelH, 16).fill({ color: 0x1e1a16, alpha: 0.98 });
    this._detailPanel.roundRect(dPx, dPy, dPw, this._detailPanelH, 16).stroke({ width: 2, color: 0x8a7048 });
    this._detailTitle.position.set(dPx + M16, dPy + M16);
    this._detailTitle.style.wordWrapWidth = this._detailInnerW;
    const scrollTop = dPy + 52;
    const scrollH = this._detailPanelH - 52 - M16;
    this._detailScrollMask.clear();
    this._detailScrollMask.rect(dPx + M16, scrollTop, this._detailInnerW, scrollH).fill({ color: 0xffffff });
    this._detailScrollMask.position.set(0, 0);
    this._detailScroll.position.set(dPx + M16, scrollTop);
    this._detailBody.style.wordWrapWidth = this._detailInnerW;
    this._detailCloseBg.clear();
    this._detailCloseBg.circle(0, 0, 16).fill({ color: 0x3a3228, alpha: 0.95 });
    this._detailClose.position.set(dPx + dPw - 28, dPy + 28);
    this._detailClose.hitArea = new Rectangle(-20, -20, 40, 40);

    this._syncSectionRow();
    this._rebuildList();
  }
}
