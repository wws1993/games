import { Graphics } from 'pixi.js';

import type { Obstacle } from './types';

/** 与 `toward` 按 t 混合 RGB（0～1） */
function mixRgb(color: number, toward: number, t: number): number {
  const ar = (color >> 16) & 0xff;
  const ag = (color >> 8) & 0xff;
  const ab = color & 0xff;
  const br = (toward >> 16) & 0xff;
  const bg = (toward >> 8) & 0xff;
  const bb = toward & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | b;
}

/** 稳定 0～1 伪随机，避免 `Math.random` 在绘制侧重复调用 */
function seeded01(seed: number, salt: number): number {
  const v = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * 在世界坐标下绘制单块障碍：底色 + 四种程序化纹理之一 + 外框与顶沿高光
 * @param g - 地图 `Graphics`（与障碍同属世界根）
 * @param o - 含 `fillColor`、`textureVariant`、`textureSeed` 的障碍数据
 */
export function drawObstacleOnMap(g: Graphics, o: Obstacle): void {
  const { x, y, w, h } = o;
  const fill = o.fillColor;
  const stroke = o.strokeColor;
  const seed = o.textureSeed;
  const v = o.textureVariant;

  g.rect(x, y, w, h).fill({ color: fill, alpha: 0.93 });

  const dark = mixRgb(fill, 0x101008, 0.35);
  const light = mixRgb(fill, 0xffffff, 0.18);

  if (v === 0) {
    const brickH = 6 + seeded01(seed, 0) * 7;
    for (let yy = y + brickH; yy < y + h; yy += brickH) {
      g.moveTo(x, yy).lineTo(x + w, yy).stroke({ width: 1, color: dark, alpha: 0.38 });
    }
    let row = 0;
    for (let yy = y; yy < y + h; yy += brickH, row++) {
      const shift = (row % 2) * (brickH * 0.5);
      for (let xx = x + shift; xx < x + w + brickH; xx += brickH) {
        const y1 = yy;
        const y2 = Math.min(y + h, yy + brickH);
        g.moveTo(xx, y1).lineTo(xx, y2).stroke({ width: 1, color: stroke, alpha: 0.26 });
      }
    }
  } else if (v === 1) {
    const plankW = 5 + seeded01(seed, 1) * 5;
    const off = seeded01(seed, 2) * plankW;
    for (let xx = x + off; xx < x + w; xx += plankW) {
      g.moveTo(xx, y).lineTo(xx, y + h).stroke({ width: 1, color: dark, alpha: 0.4 });
      const pw = Math.max(0, Math.min(plankW - 1, x + w - xx - 0.5));
      if (pw > 0) {
        g.rect(xx + 0.5, y, pw, h).fill({ color: light, alpha: 0.05 });
      }
    }
  } else if (v === 2) {
    const step = 10 + seeded01(seed, 3) * 4;
    const ox = step * seeded01(seed, 5);
    const oy = step * seeded01(seed, 6);
    for (let xx = x + ox; xx < x + w; xx += step) {
      g.moveTo(xx, y).lineTo(xx, y + h).stroke({ width: 1, color: dark, alpha: 0.16 });
    }
    for (let yy = y + oy; yy < y + h; yy += step) {
      g.moveTo(x, yy).lineTo(x + w, yy).stroke({ width: 1, color: stroke, alpha: 0.13 });
    }
  } else {
    const count = 8 + Math.floor(seeded01(seed, 4) * 9);
    for (let i = 0; i < count; i++) {
      const t1 = seeded01(seed, 10 + i);
      const t2 = seeded01(seed, 30 + i);
      const t3 = seeded01(seed, 50 + i);
      const px = x + 3 + t1 * (w - 9);
      const py = y + 3 + t2 * (h - 9);
      const sw = 2 + t3 * 4;
      const sh = 1.5 + seeded01(seed, 70 + i) * 3;
      const pebble = mixRgb(fill, t3 > 0.5 ? 0x1a1814 : 0x5a5248, 0.55);
      g.roundRect(px, py, sw, sh, 1).fill({ color: pebble, alpha: 0.5 });
    }
  }

  g.rect(x, y, w, h).stroke({ width: 2, color: stroke, alpha: 0.84 });
  g.rect(x + 2, y + 1, Math.max(0, w - 4), 2).fill({ color: light, alpha: 0.28 });
}
