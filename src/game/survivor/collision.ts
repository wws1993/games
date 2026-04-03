import type { Obstacle } from './types';

/** 圆与轴对齐矩形是否相交（闭包略放宽避免数值抖动） */
export function circleAabbOverlap(cx: number, cy: number, r: number, o: Obstacle): boolean {
  const nx = Math.max(o.x, Math.min(cx, o.x + o.w));
  const ny = Math.max(o.y, Math.min(cy, o.y + o.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r - 1e-6;
}

/**
 * 将圆心推出矩形外；若圆心在矩形内则推到最近边外
 * @param cx - 圆心 x
 * @param cy - 圆心 y
 * @param r - 半径
 * @param o - 障碍 AABB
 */
export function pushCircleOutOfAabb(cx: number, cy: number, r: number, o: Obstacle): { x: number; y: number } {
  const l = o.x;
  const t = o.y;
  const rgt = o.x + o.w;
  const b = o.y + o.h;
  const nx = Math.max(l, Math.min(cx, rgt));
  const ny = Math.max(t, Math.min(cy, b));
  let dx = cx - nx;
  let dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r - 1e-8) {
    return { x: cx, y: cy };
  }
  if (d2 < 1e-10) {
    const dl = cx - l;
    const dr = rgt - cx;
    const dtop = cy - t;
    const db = b - cy;
    const m = Math.min(dl, dr, dtop, db);
    if (m === dl) {
      return { x: l - r - 0.25, y: cy };
    }
    if (m === dr) {
      return { x: rgt + r + 0.25, y: cy };
    }
    if (m === dtop) {
      return { x: cx, y: t - r - 0.25 };
    }
    return { x: cx, y: b + r + 0.25 };
  }
  const d = Math.sqrt(d2);
  const pen = r - d + 0.35;
  return { x: cx + (dx / d) * pen, y: cy + (dy / d) * pen };
}

/**
 * 对多个障碍迭代解算，使圆不与任一矩形穿透（玩家 / 敌人共用）
 * @param iterations - 迭代次数，略多可减轻卡角
 */
export function resolveCircleWithObstacles(
  x: number,
  y: number,
  r: number,
  obstacles: readonly Obstacle[],
  iterations = 7,
): { x: number; y: number } {
  let cx = x;
  let cy = y;
  for (let it = 0; it < iterations; it++) {
    for (const o of obstacles) {
      if (!circleAabbOverlap(cx, cy, r, o)) {
        continue;
      }
      const p = pushCircleOutOfAabb(cx, cy, r, o);
      cx = p.x;
      cy = p.y;
    }
  }
  return { x: cx, y: cy };
}

/** 圆与障碍重叠时推出 AABB 外并按接触面法向镜面反射速度；未重叠返回 null；用于玩家子弹障碍反弹 */
export function resolveBulletObstacleBounce(
  bx: number,
  by: number,
  bulletRadius: number,
  vx: number,
  vy: number,
  o: Obstacle,
): { x: number; y: number; vx: number; vy: number } | null {
  if (!circleAabbOverlap(bx, by, bulletRadius, o)) {
    return null;
  }
  // 先分离，避免圆心在矩形内时法向退化
  const p = pushCircleOutOfAabb(bx, by, bulletRadius, o);
  const cx = p.x;
  const cy = p.y;
  const l = o.x;
  const t = o.y;
  const rgt = o.x + o.w;
  const btm = o.y + o.h;
  // 矩形上距圆心最近点；指向圆心的向量即外法向（从障碍指向外）
  const qx = Math.max(l, Math.min(cx, rgt));
  const qy = Math.max(t, Math.min(cy, btm));
  let nx = cx - qx;
  let ny = cy - qy;
  const nlen2 = nx * nx + ny * ny;
  if (nlen2 < 1e-12) {
    // 角点或数值退化：按到四边最短距离取轴法向
    const dl = cx - l;
    const dr = rgt - cx;
    const dtop = cy - t;
    const db = btm - cy;
    const m = Math.min(dl, dr, dtop, db);
    if (m === dl) {
      nx = -1;
      ny = 0;
    } else if (m === dr) {
      nx = 1;
      ny = 0;
    } else if (m === dtop) {
      nx = 0;
      ny = -1;
    } else {
      nx = 0;
      ny = 1;
    }
  } else {
    const inv = 1 / Math.sqrt(nlen2);
    nx *= inv;
    ny *= inv;
  }
  // v' = v - 2 (v·n) n，仅当朝向障碍内侧（v·n<0）时翻转
  const dot = vx * nx + vy * ny;
  let nvx = vx;
  let nvy = vy;
  if (dot < 0) {
    nvx -= 2 * dot * nx;
    nvy -= 2 * dot * ny;
  }
  return { x: cx, y: cy, vx: nvx, vy: nvy };
}

/** 玩家普通子弹（圆形）是否被障碍挡住；`ignoresObstacles` 为 true 时（如手榴弹）恒 false */
export function playerBulletBlockedByObstacles(
  bx: number,
  by: number,
  bulletRadius: number,
  ignoresObstacles: boolean | undefined,
  obstacles: readonly Obstacle[],
): boolean {
  if (ignoresObstacles) {
    return false;
  }
  for (const o of obstacles) {
    if (circleAabbOverlap(bx, by, bulletRadius, o)) {
      return true;
    }
  }
  return false;
}

/** 两轴对齐矩形是否相交（用于障碍互斥） */
export function aabbIntersectsAabb(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/** 障碍矩形完全落在方形世界内 */
export function obstacleFitsInWorld(o: Obstacle, worldSize: number): boolean {
  return o.x >= 0 && o.y >= 0 && o.x + o.w <= worldSize && o.y + o.h <= worldSize;
}

/**
 * 障碍当前位置是否合法：贴世界边界且不与其他障碍穿透
 * @param skipIndex - `obstacles` 中自身下标，校验时跳过
 */
export function obstaclePlacementValid(
  o: Obstacle,
  worldSize: number,
  obstacles: readonly Obstacle[],
  skipIndex: number,
): boolean {
  if (!obstacleFitsInWorld(o, worldSize)) {
    return false;
  }
  for (let i = 0; i < obstacles.length; i++) {
    if (i === skipIndex) {
      continue;
    }
    const b = obstacles[i]!;
    if (aabbIntersectsAabb(o.x, o.y, o.w, o.h, b.x, b.y, b.w, b.h)) {
      return false;
    }
  }
  return true;
}
