/** 近战挥击矢量绘制：与 `WeaponIcon` 剪影一致的程序化描边，刃长按 `meleeRangePx·MELEE_SWING_VISUAL_LENGTH_FACTOR` 缩放 */
import type { Graphics } from 'pixi.js';

import { PLAYER_WEAPON_DEFS, type PlayerWeaponKind } from '../config/playerWeaponsConfig';

/**
 * 挥击视觉刃长相对 `meleeRangePx` 的比例：略短于判定半径，避免刀光比命中区更长（与 `WeaponIcon` 剪影同尺度思路）
 */
const MELEE_SWING_VISUAL_LENGTH_FACTOR = 0.82;

/** 将点绕原点旋转 `ang` 弧度（与扇形局部角一致，+x 为朝敌） */
function rot(x: number, y: number, ang: number): { x: number; y: number } {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: x * c - y * s, y: x * s + y * c };
}

/** 在局部 +x 为刃向的坐标系中画大刀剪影（与 `WeaponIcon` dao 一致：斜刃+护手），再绕 `ang` 摆入扇面 */
function drawDaoBlade(g: Graphics, capR: number, accent: number, alpha: number, ang: number): void {
  const p1 = rot(0.92 * capR, 0.06 * capR, ang);
  g.moveTo(0, 0);
  g.lineTo(p1.x, p1.y).stroke({ width: 3.4, color: 0x4a5058, alpha });
  const h0 = rot(-0.08 * capR, -0.04 * capR, ang);
  const h1 = rot(-0.06 * capR, 0.05 * capR, ang);
  g.moveTo(h0.x, h0.y);
  g.lineTo(h1.x, h1.y).stroke({ width: 2.2, color: 0x5c4030, alpha: alpha * 0.95 });
  const g0 = rot(0.04 * capR, 0.05 * capR, ang);
  const g1 = rot(0.1 * capR, 0.08 * capR, ang);
  g.moveTo(g0.x, g0.y);
  g.lineTo(g1.x, g1.y).stroke({ width: 1.8, color: 0x5c4030, alpha: alpha * 0.9 });
  const tc = rot(0.92 * capR * 0.98, 0.06 * capR * 0.98, ang);
  g.circle(tc.x, tc.y, Math.max(1.2, capR * 0.035)).fill({ color: accent, alpha: alpha * 0.55 });
}

/** 红缨枪：长杆 + 缨（竖杆图标转水平 +x） */
function drawSpearBlade(g: Graphics, capR: number, accent: number, alpha: number, ang: number): void {
  const tip = rot(capR, 0, ang);
  g.moveTo(0, 0);
  g.lineTo(tip.x, tip.y).stroke({ width: 2.2, color: 0x4a5058, alpha });
  const y0 = -0.06 * capR;
  const y1 = 0.06 * capR;
  const t0 = rot(0.12 * capR, y0, ang);
  const t1 = rot(0.12 * capR, y1, ang);
  g.moveTo(t0.x, t0.y);
  g.lineTo(t1.x, t1.y).stroke({ width: 2.6, color: accent, alpha: alpha * 0.95 });
  const u0 = rot(0.08 * capR, y0 * 0.5, ang);
  const u1 = rot(0.16 * capR, 0, ang);
  g.moveTo(u0.x, u0.y);
  g.lineTo(u1.x, u1.y).stroke({ width: 1.2, color: 0x5c4030, alpha: alpha * 0.5 });
  const v0 = rot(0.08 * capR, -y0 * 0.5, ang);
  g.moveTo(v0.x, v0.y);
  g.lineTo(u1.x, u1.y).stroke({ width: 1.2, color: 0x5c4030, alpha: alpha * 0.5 });
}

/** 拼刺刀：短枪身 + 三角枪尖 */
function drawBayonetBlade(g: Graphics, capR: number, accent: number, alpha: number, ang: number): void {
  const shaft = capR * 0.52;
  const s0 = rot(-0.06 * capR, 0, ang);
  const s1 = rot(shaft, 0, ang);
  g.moveTo(s0.x, s0.y);
  g.lineTo(s1.x, s1.y).stroke({ width: 2.4, color: 0x5c4030, alpha });
  const tip = rot(capR, 0, ang);
  const b0 = rot(shaft, -0.12 * capR, ang);
  const b1 = rot(shaft, 0.12 * capR, ang);
  g.moveTo(b0.x, b0.y);
  g.lineTo(tip.x, tip.y);
  g.lineTo(b1.x, b1.y).stroke({ width: 2.2, color: 0x4a5058, alpha: alpha * 0.98 });
  const h0 = rot(-0.08 * capR, -0.12 * capR, ang);
  const h1 = rot(-0.08 * capR, 0.12 * capR, ang);
  g.moveTo(h0.x, h0.y);
  g.lineTo(h1.x, h1.y).stroke({ width: 1.6, color: 0x2c3038, alpha: alpha * 0.85 });
  const tc = rot(capR * 0.96, 0, ang);
  g.circle(tc.x, tc.y, Math.max(1, capR * 0.028)).fill({ color: accent, alpha: alpha * 0.45 });
}

function drawGenericMeleeBlade(g: Graphics, capR: number, accent: number, alpha: number, ang: number): void {
  const p = rot(capR * 0.92, 0.04 * capR, ang);
  g.moveTo(0, 0);
  g.lineTo(p.x, p.y).stroke({ width: 3, color: 0x6a7078, alpha });
  g.circle(p.x * 0.98, p.y * 0.98, 1.8).fill({ color: accent, alpha: alpha * 0.5 });
}

function drawBladeForKind(
  g: Graphics,
  kind: PlayerWeaponKind,
  capR: number,
  accent: number,
  alpha: number,
  ang: number,
): void {
  switch (kind) {
    case 'dao_broadsword':
      drawDaoBlade(g, capR, accent, alpha, ang);
      break;
    case 'spear_red_tassel':
      drawSpearBlade(g, capR, accent, alpha, ang);
      break;
    case 'bayonet_spike':
      drawBayonetBlade(g, capR, accent, alpha, ang);
      break;
    default:
      drawGenericMeleeBlade(g, capR, accent, alpha, ang);
      break;
  }
}

/**
 * 在 `Graphics` 上绘制近战挥击：沿扇形扫过当前武器剪影（与 UI `WeaponIcon` 同源造型），刃长由 `rangePx` 缩放。
 * @param g - 已置于手部枢轴、已旋转至瞄准方向的图层（局部 +x 为朝敌方向）
 * @param kind - 主武器键
 * @param rangePx - 局内 `meleeRangePx`
 * @param sweepA0 - 扇形左缘角（弧度，相对局部 +x）
 * @param sweepA1 - 扫掠当前前沿角
 * @param fade - 0~1 淡出系数
 */
export function drawMeleeWeaponSwingArc(
  g: Graphics,
  kind: PlayerWeaponKind,
  rangePx: number,
  sweepA0: number,
  sweepA1: number,
  fade: number,
): void {
  const capR = Math.max(6, rangePx * MELEE_SWING_VISUAL_LENGTH_FACTOR);
  const accent = PLAYER_WEAPON_DEFS[kind].bulletColor;
  const wedgeAlpha = 0.09 * fade;
  const segs = 14;
  g.moveTo(0, 0);
  g.lineTo(Math.cos(sweepA0) * capR * 0.22, Math.sin(sweepA0) * capR * 0.22);
  for (let i = 1; i <= segs; i++) {
    const t = sweepA0 + ((sweepA1 - sweepA0) * i) / segs;
    g.lineTo(Math.cos(t) * capR * 0.28, Math.sin(t) * capR * 0.28);
  }
  g.closePath().fill({ color: 0xffe8aa, alpha: wedgeAlpha });

  const trailAngles: number[] = [];
  for (let k = 0; k <= 3; k++) {
    trailAngles.push(sweepA0 + ((sweepA1 - sweepA0) * k) / 3);
  }
  const trailAlphas = [0.1 * fade, 0.18 * fade, 0.32 * fade, 0.82 * fade];
  for (let i = 0; i < trailAngles.length; i++) {
    const ang = trailAngles[i]!;
    const a = trailAlphas[i] ?? 0.4 * fade;
    drawBladeForKind(g, kind, capR, accent, a, ang);
  }
}
