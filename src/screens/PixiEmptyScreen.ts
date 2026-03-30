import { Container } from 'pixi.js';

import type { AppScreen } from '../utils/navigation';

/** Pixi 主层占位：菜单路由由 React 绘制时保持舞台无内容，仅保留画布清屏 */
export class PixiEmptyScreen extends Container implements AppScreen {
  /** 屏幕唯一标识，供导航缓存 */
  public static SCREEN_ID = 'pixi_empty';
}
