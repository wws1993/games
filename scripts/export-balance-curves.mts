/**
 * 从与 `constants.ts` / `enemyDefs.ts` / `survivorBalance.ts` 一致的公式导出平衡曲线 SVG；运行：`npx tsx scripts/export-balance-curves.mts`
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import * as SurvivorConstants from '../src/game/survivor/constants.ts';

const { PLAYER_MAX_LEVEL, xpToReachNextLevel, XP_TO_NEXT_LEVEL_DIFFICULTY_MULT } = SurvivorConstants;

const outPath = join(process.cwd(), 'docs', 'balance-curves.svg');

/** 须与 `src/game/config/survivorBalance.ts` 的 `enemy.difficultyPerMinuteFactor` 一致 */
const DIFFICULTY_PER_MINUTE_FACTOR = 1.05;

/** 同步 `src/game/survivor/enemyDefs.ts` */
function difficultyMultiplier(gameTimeSec: number): number {
  const g = Math.max(0, gameTimeSec);
  return Math.pow(DIFFICULTY_PER_MINUTE_FACTOR, g / 60);
}

/** 同步 `src/game/survivor/enemyDefs.ts` 与 `enemyGameConfig.curve` */
function spawnIntervalForTime(gameTimeSec: number): number {
  const rampSec = 300;
  const hi = 0.42;
  const lo = 0.055;
  const g = Math.max(0, gameTimeSec);
  if (g <= rampSec) {
    const t = g / rampSec;
    return hi + (lo - hi) * t;
  }
  const overMin = (g - rampSec) / 60;
  return Math.max(0.028, lo * Math.pow(0.985, overMin));
}

/** 同步 `src/game/config/survivorBalance.ts` */
const spawnIntervalScale = (1.5 / 0.7) * 1.25;

/** 同步 `enemyGameConfig.stats.infantry.baseHp` */
const INFANTRY_BASE_HP = 30;

/** 同步 `RIFLE_BASE_DAMAGE` / `RIFLE_COOLDOWN_SEC` */
const RIFLE_BASE_DAMAGE = 12;
const RIFLE_COOLDOWN_SEC = 0.38;

function norm(
  v: number,
  vmin: number,
  vmax: number,
  pmin: number,
  pmax: number,
): number {
  if (vmax <= vmin) {
    return (pmin + pmax) * 0.5;
  }
  const t = (v - vmin) / (vmax - vmin);
  return pmin + t * (pmax - pmin);
}

function polyline(
  pts: { x: number; y: number }[],
  xmin: number,
  xmax: number,
  ymin: number,
  ymax: number,
  px0: number,
  py0: number,
  pw: number,
  ph: number,
): string {
  return pts
    .map((p) => {
      const sx = norm(p.x, xmin, xmax, px0, px0 + pw);
      const sy = norm(p.y, ymin, ymax, py0 + ph, py0);
      return `${sx.toFixed(2)},${sy.toFixed(2)}`;
    })
    .join(' ');
}

const maxTargetLevel = PLAYER_MAX_LEVEL;
const maxSec = 900;

const xpPts: { x: number; y: number }[] = [];
let cumXp = 0;
for (let targetLv = 2; targetLv <= maxTargetLevel; targetLv++) {
  cumXp += xpToReachNextLevel(targetLv - 1);
  xpPts.push({ x: targetLv, y: cumXp });
}

const tArr: number[] = [];
for (let t = 0; t <= maxSec; t += 2) {
  tArr.push(t);
}

const diffArr = tArr.map((t) => difficultyMultiplier(t));
const spawnArr = tArr.map((t) => spawnIntervalForTime(t) * spawnIntervalScale);

const baseDps = RIFLE_BASE_DAMAGE / RIFLE_COOLDOWN_SEC;
const ttkArr = tArr.map((t) => {
  const hp = INFANTRY_BASE_HP * difficultyMultiplier(t);
  return hp / baseDps;
});

const W = 920;
const H = 780;
const margin = { l: 56, r: 24, t: 44, b: 48 };
const rowH = (H - margin.t - margin.b) / 2;
const colW = (W - margin.l - margin.r) / 2;

function panel(
  title: string,
  x: number,
  y: number,
  w: number,
  h: number,
  pathD: string,
  xLabel: string,
  yLabel: string,
  ymin: number,
  ymax: number,
  xmin: number,
  xmax: number,
): string {
  const px0 = x + 52;
  const py0 = y + 28;
  const pw = w - 64;
  const ph = h - 52;
  const gridY = 4;
  let g = '';
  for (let i = 0; i <= gridY; i++) {
    const gy = py0 + (ph * i) / gridY;
    g += `<line x1="${px0}" y1="${gy.toFixed(1)}" x2="${(px0 + pw).toFixed(1)}" y2="${gy.toFixed(1)}" stroke="#e8e4dc" stroke-width="1"/>`;
  }
  return `
  <g>
    <text x="${x + 8}" y="${y + 18}" font-size="14" font-family="system-ui,sans-serif" fill="#2a2620">${title}</text>
    <text x="${x + w * 0.5}" y="${y + h - 6}" text-anchor="middle" font-size="11" fill="#666" font-family="system-ui,sans-serif">${xLabel}</text>
    <text transform="rotate(-90 ${x + 14} ${y + h * 0.5})" x="${x + 14}" y="${y + h * 0.5}" text-anchor="middle" font-size="11" fill="#666" font-family="system-ui,sans-serif">${yLabel}</text>
    ${g}
    <polyline fill="none" stroke="#1a6b4a" stroke-width="2" points="${pathD}"/>
    <rect x="${px0}" y="${py0}" width="${pw}" height="${ph}" fill="none" stroke="#b8b0a4" stroke-width="1"/>
    <text x="${px0}" y="${py0 - 6}" font-size="10" fill="#555" font-family="monospace">${ymax.toFixed(3)}</text>
    <text x="${px0}" y="${py0 + ph + 14}" font-size="10" fill="#555" font-family="monospace">${ymin.toFixed(3)}</text>
    <text x="${px0 + pw}" y="${py0 - 6}" text-anchor="end" font-size="10" fill="#555" font-family="monospace">${xmax}</text>
  </g>`;
}

const xpPath = polyline(
  xpPts,
  2,
  maxTargetLevel,
  0,
  Math.max(...xpPts.map((p) => p.y)),
  margin.l,
  margin.t,
  colW - 8,
  rowH - 8,
);

const diffPath = polyline(
  tArr.map((t, i) => ({ x: t, y: diffArr[i]! })),
  0,
  maxSec,
  Math.min(...diffArr) * 0.98,
  Math.max(...diffArr) * 1.02,
  margin.l + colW,
  margin.t,
  colW - 8,
  rowH - 8,
);

const spawnPath = polyline(
  tArr.map((t, i) => ({ x: t, y: spawnArr[i]! })),
  0,
  maxSec,
  Math.min(...spawnArr) * 0.95,
  Math.max(...spawnArr) * 1.05,
  margin.l,
  margin.t + rowH,
  colW - 8,
  rowH - 8,
);

const ttkPath = polyline(
  tArr.map((t, i) => ({ x: t, y: ttkArr[i]! })),
  0,
  maxSec,
  0,
  Math.max(...ttkArr) * 1.05,
  margin.l + colW,
  margin.t + rowH,
  colW - 8,
  rowH - 8,
);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#faf8f4"/>
  <text x="${W * 0.5}" y="28" text-anchor="middle" font-size="17" font-weight="600" font-family="system-ui,sans-serif" fill="#1a1814">敌后幸存者 · 数值曲线（与源码公式一致）</text>
  ${panel(
    '累计经验（从 1 级升到目标等级所需总经验）',
    margin.l,
    margin.t,
    colW,
    rowH,
    xpPath,
    '目标等级（升到该级）',
    '累计 XP',
    0,
    Math.max(...xpPts.map((p) => p.y)),
    2,
    maxTargetLevel,
  )}
  ${panel(
    `难度倍率 difficultyMultiplier(t) = ${DIFFICULTY_PER_MINUTE_FACTOR}^{t/60}`,
    margin.l + colW,
    margin.t,
    colW,
    rowH,
    diffPath,
    '局内时间 t（秒）',
    '倍率',
    Math.min(...diffArr) * 0.98,
    Math.max(...diffArr) * 1.02,
    0,
    maxSec,
  )}
  ${panel(
    `有效刷怪间隔 spawnIntervalForTime(t)×${spawnIntervalScale.toFixed(3)}`,
    margin.l,
    margin.t + rowH,
    colW,
    rowH,
    spawnPath,
    '局内时间 t（秒）',
    '秒',
    Math.min(...spawnArr) * 0.95,
    Math.max(...spawnArr) * 1.05,
    0,
    maxSec,
  )}
  ${panel(
    `理论步兵击杀时间 ≈ (步兵 HP×难度) / 步枪基础 DPS（无升级卡、无暴击）`,
    margin.l + colW,
    margin.t + rowH,
    colW,
    rowH,
    ttkPath,
    '局内时间 t（秒）',
    '秒',
    0,
    Math.max(...ttkArr) * 1.05,
    0,
    maxSec,
  )}
  <text x="${margin.l}" y="${H - 6}" font-size="10" fill="#888" font-family="system-ui,sans-serif">经验掉落：GEM_XP_VALUE×gemMultiplier，不随难度；敌人 HP/接触伤/远程伤随难度。升级：分段基准×${XP_TO_NEXT_LEVEL_DIFFICULTY_MULT}（见 constants.ts），等级上限 ${PLAYER_MAX_LEVEL}。</text>
</svg>`;

writeFileSync(outPath, svg, 'utf8');
console.log('Wrote', outPath);
