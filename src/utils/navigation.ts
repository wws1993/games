import { Assets, Container, Ticker } from 'pixi.js';

import { app } from './application';

/** 与 bubbo-bubbo `navigation.ts` 中 `AppScreen` 对齐的屏幕契约 */
export interface AppScreen extends Container {
  prepare?: (data?: unknown) => void | Promise<void>;
  show?: () => Promise<void>;
  hide?: () => Promise<void>;
  update?: (time: Ticker) => void;
  resize?: (w: number, h: number) => void;
}

/** 屏幕构造函数类型：含 `SCREEN_ID` 与可选资源包列表 */
export interface AppScreenConstructor<T extends AppScreen = AppScreen> {
  readonly SCREEN_ID: string;
  readonly assetBundles?: string[];
  new (): T;
}

/**
 * 屏幕与遮罩导航（简化版：无 LoadScreen、无 AssetPack，仅保留 bubbo 的状态机结构；`prepare` 可返回 Promise 以异步加载资源）
 */
class Navigation {
  /** 主屏幕层 */
  public readonly screenView = new Container();
  /** 遮罩层（始终叠在主屏幕之上） */
  public readonly overlayView = new Container();

  private currentScreen?: AppScreen;
  private currentOverlay?: AppScreen;
  private _w = 0;
  private _h = 0;

  private readonly _screenMap = new Map<string, AppScreen>();

  /** 将导航根节点挂到舞台（在 `app.init` 之后调用一次） */
  public init(): void {
    app.stage.addChild(this.screenView, this.overlayView);
  }

  /**
   * 从映射表取或创建屏幕单例
   * @param Ctor - 屏幕类
   */
  private _getScreen(Ctor: AppScreenConstructor): AppScreen {
    let screen = this._screenMap.get(Ctor.SCREEN_ID);
    if (!screen) {
      screen = new Ctor();
      this._screenMap.set(Ctor.SCREEN_ID, screen);
    }
    return screen;
  }

  /**
   * 挂载屏幕：参与 resize / ticker，并执行 `show`
   * @param screen - 屏幕实例
   * @param isOverlay - 是否挂在遮罩层
   */
  private async _addScreen(screen: AppScreen, isOverlay = false): Promise<void> {
    (isOverlay ? this.overlayView : this.screenView).addChild(screen);
    if (screen.resize) {
      screen.resize(this._w, this._h);
    }
    if (screen.update) {
      app.ticker.add(screen.update, screen);
    }
    if (screen.show) {
      await screen.show();
    }
  }

  /**
   * 卸载屏幕：执行 `hide`、移除 ticker 与舞台节点
   * @param screen - 屏幕实例
   * @param isOverlay - 是否为遮罩层
   */
  private async _removeScreen(screen: AppScreen, isOverlay = false): Promise<void> {
    if (screen.hide) {
      await screen.hide();
    }
    if (screen.update) {
      app.ticker.remove(screen.update, screen);
    }
    screen.parent?.removeChild(screen);
  }

  /**
   * 切换主屏幕：可选加载 bundle 后再展示（与 bubbo `_showScreen` 流程一致，此处省略 Loading UI）
   * @param Ctor - 目标屏幕类
   * @param data - 传给 `prepare` 的载荷
   */
  public async goToScreen<T extends AppScreen>(Ctor: AppScreenConstructor<T>, data?: unknown): Promise<void> {
    if (this.currentScreen) {
      await this._removeScreen(this.currentScreen, false);
    }
    if (Ctor.assetBundles?.length) {
      await Assets.loadBundle(Ctor.assetBundles);
    }
    const next = this._getScreen(Ctor) as T;
    await Promise.resolve(next.prepare?.(data));
    this.currentScreen = next;
    await this._addScreen(next, false);
  }

  /**
   * 显示遮罩屏（不替换主屏幕）
   * @param Ctor - 遮罩屏幕类
   * @param data - 传给 `prepare` 的载荷
   */
  public async showOverlay<T extends AppScreen>(Ctor: AppScreenConstructor<T>, data?: unknown): Promise<void> {
    if (this.currentOverlay) {
      await this._removeScreen(this.currentOverlay, true);
    }
    if (Ctor.assetBundles?.length) {
      await Assets.loadBundle(Ctor.assetBundles);
    }
    const next = this._getScreen(Ctor) as T;
    await Promise.resolve(next.prepare?.(data));
    this.currentOverlay = next;
    await this._addScreen(next, true);
  }

  /** 关闭当前遮罩 */
  public async hideOverlay(): Promise<void> {
    if (!this.currentOverlay) return;
    await this._removeScreen(this.currentOverlay, true);
    this.currentOverlay = undefined;
  }

  /**
   * 窗口或渲染尺寸变化时转发给当前屏与遮罩（与 bubbo `navigation.resize` 一致）
   * @param w - 逻辑宽（渲染缓冲区）
   * @param h - 逻辑高（渲染缓冲区）
   */
  public resize(w: number, h: number): void {
    this._w = w;
    this._h = h;
    this.currentScreen?.resize?.(w, h);
    this.currentOverlay?.resize?.(w, h);
  }
}

/** 全局导航单例 */
export const navigation = new Navigation();
