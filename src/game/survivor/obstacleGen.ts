import type { Obstacle } from './types';

/** 与已有障碍膨胀间距，避免完全贴死 */
function inflatesOverlap(ax: number, ay: number, aw: number, ah: number, pad: number, o: Obstacle): boolean {
  return ax < o.x + o.w + pad && ax + aw + pad > o.x && ay < o.y + o.h + pad && ay + ah + pad > o.y;
}

/**
 * 在方形世界内随机生成矩形障碍，避开出生点周围；用于无缝大地图村庄土房占位
 * @param worldSize - 世界边长
 * @param startX - 玩家出生 x
 * @param startY - 玩家出生 y
 * @param clearRadius - 出生净空半径
 * @param targetCount - 期望数量（失败重试有上限）
 * @param rng - 可注入种子随机（测试用）
 */
export function generateObstacles(
  worldSize: number,
  startX: number,
  startY: number,
  clearRadius: number,
  targetCount: number,
  rng: () => number = Math.random,
): Obstacle[] {
  const list: Obstacle[] = [];
  const margin = 100;
  const maxAttempts = targetCount * 50;
  let attempts = 0;
  const gap = 22;

  while (list.length < targetCount && attempts < maxAttempts) {
    attempts++;
    const w = 44 + rng() * 100;
    const h = 44 + rng() * 100;
    if (w > worldSize - 2 * margin || h > worldSize - 2 * margin) {
      continue;
    }
    const x = margin + rng() * (worldSize - 2 * margin - w);
    const y = margin + rng() * (worldSize - 2 * margin - h);
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    const clear = clearRadius + Math.hypot(w, h) * 0.45;
    if (Math.hypot(cx - startX, cy - startY) < clear) {
      continue;
    }
    let ok = true;
    for (const o of list) {
      if (inflatesOverlap(x, y, w, h, gap, o)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      list.push({ x, y, w, h });
    }
  }
  return list;
}
