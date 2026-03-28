import { Container } from 'pixi.js';

/** 将容器透明度从 `from` 线性过渡到 `to`，时长 `ms` 毫秒 */
export function fadeAlpha(target: Container, from: number, to: number, ms: number): Promise<void> {
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
