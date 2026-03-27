import { Application } from 'pixi.js';

/** 全局共享的 PixiJS Application，与 pixijs/open-games bubbo-bubbo 中 `export const app = new Application()` 一致，供 navigation 与各 Screen 使用 */
export const app = new Application();
