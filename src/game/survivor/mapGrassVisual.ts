import { Graphics } from 'pixi.js';

/** 与 `drawMapGrassDecor` 内格点哈希混合同一命名空间，保证跨平台可复现 */
function grassCellHash(cx: number, cy: number, seed: number): number {
  let h = (cx * 374761393 + cy * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * 在世界矩形内用确定性哈希撒点绘制小草簇，避免每帧重算；障碍层叠在上层故可与土房重叠
 * @param g - 地图装饰层 `Graphics`（仅在此处 `clear` 由调用方决定）
 * @param worldSize - 与 `WORLD_SIZE` 一致的正方形边长
 * @param seed - 固定种子（如局 id），换局可换草分布
 */
export function drawMapGrassDecor(g: Graphics, worldSize: number, seed: number): void {
  const cell = 86;
  const cols = Math.ceil(worldSize / cell);
  const rows = Math.ceil(worldSize / cell);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const h = grassCellHash(i, j, seed);
      // 约 42% 格点放置一簇，疏密随哈希变化
      if ((h & 0xff) > 108) {
        continue;
      }
      const r1 = (h >>> 8) & 0xffff;
      const r2 = (h >>> 16) & 0xffff;
      const margin = 14;
      const bx = i * cell + margin + (r1 % Math.max(1, cell - margin * 2));
      const by = j * cell + margin + (r2 % Math.max(1, cell - margin * 2));
      if (bx >= worldSize - 4 || by >= worldSize - 4) {
        continue;
      }
      const nBlade = 2 + (h % 4);
      const baseA = ((h % 360) / 360) * 0.5 - 0.25;
      /** 与局内暖色战场底协调的草叶色（略偏黄绿） */
      const palette = [0x5a8c48, 0x4a7038, 0x6a9858, 0x6ba060, 0x3d5a30] as const;
      for (let k = 0; k < nBlade; k++) {
        const ang = baseA + (k - nBlade * 0.5) * 0.42;
        const len = 3.2 + ((h >> (k * 5)) & 7) * 0.6;
        const col = palette[(h + k * 17) % palette.length]!;
        const al = 0.62 + ((h >> k) & 5) * 0.06;
        g.moveTo(bx, by);
        // 顶视草叶：略向两侧撇开，尖端朝地图上方（y 减小）
        g.lineTo(bx + Math.sin(ang) * len * 0.65, by - len);
        g.stroke({ width: 1.15, color: col, alpha: al });
      }
    }
  }
}
