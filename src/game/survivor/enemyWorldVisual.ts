import { Container, Graphics } from 'pixi.js';

import type { EnemyKind } from './enemyDefs';
import type { Enemy } from './types';

/** 水平分量超过此值才更新左右镜像，避免顶底往返时翻转抖动 */
const FACING_FLIP_EPS = 0.06;

/** 相对 `PLAYER_RADIUS` 参考体型的缩放上下限，避免极小/极大怪变形过度 */
const SCALE_MIN = 0.52;

const SCALE_MAX = 1.55;

const REF_RADIUS = 12;

/** 单帧采样后的兵种动画分量，供各 `_draw*` 使用 */
interface EnemyMotionSample {
  /** 躯干竖直起伏 */
  bob: number;
  /** 左腿摆动（世界 X 方向位移系数已在外层乘算） */
  legL: number;
  /** 右腿摆动 */
  legR: number;
  /** 狗尾摆动角系数 */
  tail: number;
  /** 上半身横摆（机枪架枪、军官仪态） */
  swayX: number;
  /** 骑兵：骑乘起伏与马身错频 */
  mountBob: number;
  /** 狗：四足相位前左/前右/后左/后右 */
  pawFL: number;
  pawFR: number;
  pawBL: number;
  pawBR: number;
}

/** 由 `animPhase` 与各兵种步频推导本帧姿态；静止时全零 */
function sampleEnemyMotion(kind: EnemyKind, phase: number, moving: boolean): EnemyMotionSample {
  const z: EnemyMotionSample = {
    bob: 0,
    legL: 0,
    legR: 0,
    tail: 0,
    swayX: 0,
    mountBob: 0,
    pawFL: 0,
    pawFR: 0,
    pawBL: 0,
    pawBR: 0,
  };
  if (!moving) {
    return z;
  }
  const s = Math.sin;
  const c = Math.cos;
  switch (kind) {
    case 'infantry': {
      const bob = s(phase * 2) * 2.1;
      const leg = s(phase) * 3.4;
      z.bob = bob;
      z.legL = leg;
      z.legR = -leg;
      break;
    }
    case 'puppet': {
      // 伪军步态略拖沓：起伏慢、步幅略碎
      z.bob = s(phase * 1.45) * 1.65;
      const leg = s(phase * 0.82) * 2.75;
      z.legL = leg * 0.92;
      z.legR = -leg * 1.08;
      break;
    }
    case 'dog': {
      z.bob = s(phase * 2.4) * 0.75;
      z.tail = s(phase * 3.1) * 4.2;
      const trot = phase * 2.8;
      z.pawFL = s(trot) * 2.2;
      z.pawFR = s(trot + Math.PI) * 2.2;
      z.pawBL = s(trot + Math.PI * 0.5) * 1.9;
      z.pawBR = s(trot + Math.PI * 1.5) * 1.9;
      break;
    }
    case 'cavalry': {
      // 马身与骑手错频模拟小跑
      z.mountBob = s(phase * 2.6) * 2.4;
      z.bob = s(phase * 2.6 + 0.4) * 1.35;
      const gallop = s(phase * 2.45) * 4.2;
      z.legL = gallop;
      z.legR = -gallop;
      break;
    }
    case 'mg': {
      z.swayX = s(phase * 1.2) * 1.1;
      z.bob = s(phase * 1.35) * 1.35;
      const stomp = s(phase * 0.95) * 2.55;
      z.legL = stomp;
      z.legR = -stomp;
      break;
    }
    case 'artillery': {
      // 扛炮筒：重心低、左右晃
      z.bob = s(phase * 0.72) * 1.9;
      z.swayX = c(phase * 0.65) * 1.8;
      const waddle = s(phase * 0.7) * 3.6;
      z.legL = waddle;
      z.legR = -waddle;
      break;
    }
    case 'officer': {
      z.bob = s(phase * 1.05) * 0.85;
      const stride = s(phase * 0.88) * 1.95;
      z.legL = stride;
      z.legR = -stride;
      z.swayX = s(phase * 0.55) * 0.55;
      break;
    }
    case 'sniper': {
      z.bob = s(phase * 1.15) * 1.1;
      z.swayX = s(phase * 0.65) * 0.75;
      const leg = s(phase * 0.88) * 2.8;
      z.legL = leg;
      z.legR = -leg;
      break;
    }
    case 'grenadier': {
      z.bob = s(phase * 0.78) * 1.7;
      z.swayX = c(phase * 0.62) * 1.5;
      const w = s(phase * 0.74) * 3.2;
      z.legL = w;
      z.legR = -w;
      break;
    }
    case 'engineer': {
      z.bob = s(phase * 2.1) * 2;
      const leg = s(phase * 1.05) * 3.5;
      z.legL = leg;
      z.legR = -leg;
      break;
    }
    case 'heavy_infantry': {
      z.bob = s(phase * 1.2) * 1.25;
      const stomp = s(phase * 0.82) * 2.4;
      z.legL = stomp;
      z.legR = -stomp;
      break;
    }
    case 'scout_car': {
      z.bob = s(phase * 3.6) * 1.35;
      z.swayX = s(phase * 2.2) * 0.9;
      break;
    }
    case 'recon_plane':
    case 'fighter_plane':
    case 'bomber_plane':
    case 'gunship': {
      z.bob = s(phase * 2.85) * 1.75;
      z.swayX = s(phase * 2.05) * 2.35;
      break;
    }
    case 'paratrooper': {
      z.bob = s(phase * 1.4) * 2.2;
      z.swayX = s(phase * 0.95) * 1.65;
      const leg = s(phase * 0.92) * 2.85;
      z.legL = leg;
      z.legR = -leg;
      break;
    }
    case 'motor_scout': {
      z.bob = s(phase * 2.2) * 1.85;
      z.swayX = s(phase * 1.55) * 1.2;
      const leg = s(phase * 1.2) * 3.1;
      z.legL = leg;
      z.legR = -leg;
      break;
    }
    case 'military_police': {
      z.bob = s(phase * 1.35) * 1.5;
      const leg = s(phase * 0.92) * 2.65;
      z.legL = leg;
      z.legR = -leg;
      break;
    }
    case 'mortar_team': {
      z.bob = s(phase * 0.78) * 1.6;
      z.swayX = c(phase * 0.58) * 1.2;
      const w = s(phase * 0.72) * 3;
      z.legL = w;
      z.legR = -w;
      break;
    }
    case 'light_tank': {
      z.bob = s(phase * 3.2) * 1.2;
      z.swayX = s(phase * 1.9) * 0.75;
      break;
    }
    default: {
      const bob = s(phase * 2) * 2.1;
      const leg = s(phase) * 3.4;
      z.bob = bob;
      z.legL = leg;
      z.legR = -leg;
    }
  }
  return z;
}

/**
 * 单个敌人的世界层矢量小人：与 `PlayerWorldVisual` 同构，按 `radius` 缩放；锚点为碰撞圆心
 */
export class EnemyWorldVisual {
  /** 挂到敌人层容器，世界坐标与 `Enemy.x/y` 一致 */
  public readonly root = new Container();

  private readonly _gfx = new Graphics();

  private _lastFlipSign = 1;

  public constructor() {
    this.root.eventMode = 'none';
    this.root.addChild(this._gfx);
  }

  /**
   * 根据模型朝向、动画相位与兵种色绘制；暂停时改为 idle 姿势
   * @param enemy - 敌人实例
   * @param freezeMotion - 与主角一致：升级/阵亡暂停时不播走路形变
   * @param fill - 躯干主色
   * @param stroke - 描边色
   * @param detail - `simple` 时每帧仅单圆剪影，怪海时显著减少 `Graphics` 指令；`full` 为各兵种完整步态
   */
  public sync(
    enemy: Enemy,
    freezeMotion: boolean,
    fill: number,
    stroke: number,
    detail: 'full' | 'simple' = 'full',
  ): void {
    this.root.position.set(enemy.x, enemy.y);
    const fx = enemy.facingX;
    if (Math.abs(fx) > FACING_FLIP_EPS) {
      this._lastFlipSign = fx >= 0 ? 1 : -1;
    }
    const s0 = enemy.radius / REF_RADIUS;
    const s = Math.max(SCALE_MIN, Math.min(SCALE_MAX, s0));
    this.root.scale.x = this._lastFlipSign * s;
    this.root.scale.y = s;
    const g = this._gfx;
    g.clear();
    if (detail === 'simple') {
      g.circle(0, -4, 10).fill({ color: fill }).stroke({ width: 2, color: stroke });
      return;
    }
    const m = sampleEnemyMotion(enemy.kind, enemy.animPhase, !freezeMotion);
    const bodyY = -4 + m.bob;

    switch (enemy.kind) {
      case 'infantry':
        this._drawInfantry(g, bodyY, fill, stroke, m);
        break;
      case 'puppet':
        this._drawPuppet(g, bodyY, fill, stroke, m);
        break;
      case 'dog':
        this._drawDog(g, bodyY, fill, stroke, m);
        break;
      case 'cavalry':
        this._drawCavalry(g, bodyY, fill, stroke, m);
        break;
      case 'mg':
        this._drawMg(g, bodyY, fill, stroke, m);
        break;
      case 'artillery':
        this._drawArtillery(g, bodyY, fill, stroke, m);
        break;
      case 'officer':
        this._drawOfficer(g, bodyY, fill, stroke, m);
        break;
      case 'sniper':
        this._drawSniper(g, bodyY, fill, stroke, m);
        break;
      case 'grenadier':
        this._drawGrenadier(g, bodyY, fill, stroke, m);
        break;
      case 'engineer':
        this._drawEngineer(g, bodyY, fill, stroke, m);
        break;
      case 'heavy_infantry':
        this._drawHeavyInfantry(g, bodyY, fill, stroke, m);
        break;
      case 'scout_car':
        this._drawScoutCar(g, bodyY, fill, stroke, m);
        break;
      case 'recon_plane':
        this._drawPlaneRecon(g, bodyY, fill, stroke, m);
        break;
      case 'fighter_plane':
        this._drawPlaneFighter(g, bodyY, fill, stroke, m);
        break;
      case 'bomber_plane':
        this._drawPlaneBomber(g, bodyY, fill, stroke, m);
        break;
      case 'gunship':
        this._drawPlaneGunship(g, bodyY, fill, stroke, m);
        break;
      case 'paratrooper':
        this._drawParatrooper(g, bodyY, fill, stroke, m);
        break;
      case 'motor_scout':
        this._drawMotorScout(g, bodyY, fill, stroke, m);
        break;
      case 'military_police':
        this._drawMilitaryPolice(g, bodyY, fill, stroke, m);
        break;
      case 'mortar_team':
        this._drawMortarTeam(g, bodyY, fill, stroke, m);
        break;
      case 'light_tank':
        this._drawLightTank(g, bodyY, fill, stroke, m);
        break;
      default:
        this._drawInfantry(g, bodyY, fill, stroke, m);
    }
  }

  /** 步兵：标准双足 + 步枪 */
  private _drawInfantry(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    g.ellipse(0, bodyY, 9, 11)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(0, bodyY - 12, 6)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(5, bodyY - 3, 17, 5, 2).fill({ color: gunC });
    g.moveTo(-4, bodyY + 9)
      .lineTo(-4 + m.legL * 0.9, bodyY + 17)
      .stroke({ width: 3, color: stroke });
    g.moveTo(4, bodyY + 9)
      .lineTo(4 + m.legR * 0.9, bodyY + 17)
      .stroke({ width: 3, color: stroke });
  }

  /** 伪军：步态见 `sampleEnemyMotion`，胸布补丁 */
  private _drawPuppet(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    g.ellipse(0, bodyY, 9, 11)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.roundRect(-4, bodyY - 2, 7, 6, 2).fill({ color: 0x9a9088, alpha: 0.9 });
    g.circle(0, bodyY - 12, 6)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(4, bodyY - 3, 15, 5, 2).fill({ color: gunC });
    g.moveTo(-4, bodyY + 9)
      .lineTo(-4 + m.legL * 0.9, bodyY + 17)
      .stroke({ width: 3, color: stroke });
    g.moveTo(4, bodyY + 9)
      .lineTo(4 + m.legR * 0.9, bodyY + 17)
      .stroke({ width: 3, color: stroke });
  }

  /** 军犬：四足小跑 + 摆尾 */
  private _drawDog(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const hy = bodyY + 1;
    g.ellipse(0, hy, 11, 7)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(8, hy - 1, 4.5)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.moveTo(6, hy - 4)
      .lineTo(9, hy - 7)
      .lineTo(7, hy - 5)
      .stroke({ width: 2, color: stroke });
    const tailBaseX = -9;
    const tailBaseY = hy - 2;
    const tw = m.tail * 0.08;
    g.moveTo(tailBaseX, tailBaseY)
      .lineTo(tailBaseX - 5 + m.tail * 0.15, tailBaseY - 3 + tw)
      .stroke({ width: 2.5, color: stroke });
    g.moveTo(-3, hy + 4)
      .lineTo(-3 + m.pawFL * 0.35, hy + 10)
      .stroke({ width: 2.5, color: stroke });
    g.moveTo(3, hy + 4)
      .lineTo(3 + m.pawFR * 0.35, hy + 10)
      .stroke({ width: 2.5, color: stroke });
    g.moveTo(-6, hy + 5)
      .lineTo(-6 + m.pawBL * 0.3, hy + 10)
      .stroke({ width: 2.5, color: stroke });
    g.moveTo(6, hy + 5)
      .lineTo(6 + m.pawBR * 0.3, hy + 10)
      .stroke({ width: 2.5, color: stroke });
  }

  /** 骑兵：马身起伏 + 骑手；腿随马 */
  private _drawCavalry(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const horseY = bodyY + 5 + m.mountBob;
    const horseFill = ((fill & 0xfefefe) >> 1) | 0x181008;
    g.ellipse(0, horseY, 13, 8)
      .fill({ color: horseFill })
      .stroke({ width: 2, color: stroke });
    g.moveTo(-8, horseY + 5)
      .lineTo(-8 + m.legL * 0.35, horseY + 11)
      .stroke({ width: 2.5, color: stroke });
    g.moveTo(-2, horseY + 6)
      .lineTo(-2 + m.legR * 0.32, horseY + 11)
      .stroke({ width: 2.5, color: stroke });
    g.moveTo(2, horseY + 6)
      .lineTo(2 - m.legL * 0.32, horseY + 11)
      .stroke({ width: 2.5, color: stroke });
    g.moveTo(8, horseY + 5)
      .lineTo(8 - m.legR * 0.35, horseY + 11)
      .stroke({ width: 2.5, color: stroke });
    const riderY = bodyY - 5 + m.bob;
    g.ellipse(m.swayX * 0.2, riderY, 7, 9)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(m.swayX * 0.2, riderY - 11, 5)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(4 + m.swayX * 0.2, riderY - 3, 14, 4, 2).fill({ color: gunC });
  }

  /** 机枪手：架枪横摆 + 重踏 */
  private _drawMg(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const ox = m.swayX;
    g.ellipse(ox, bodyY, 10, 12)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(ox, bodyY - 12, 6)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(5 + ox, bodyY - 4, 22, 6, 2).fill({ color: gunC });
    g.roundRect(2 + ox, bodyY + 1, 5, 4, 1).fill({ color: gunC, alpha: 0.85 });
    g.moveTo(-4 + ox, bodyY + 9)
      .lineTo(-4 + ox + m.legL * 0.88, bodyY + 17)
      .stroke({ width: 3, color: stroke });
    g.moveTo(4 + ox, bodyY + 9)
      .lineTo(4 + ox + m.legR * 0.88, bodyY + 17)
      .stroke({ width: 3, color: stroke });
  }

  /** 炮兵：扛筒、左右晃 */
  private _drawArtillery(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const ox = m.swayX;
    g.ellipse(ox, bodyY, 11, 10)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(ox, bodyY - 11, 5.5)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const tube = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(3 + ox, bodyY - 14, 5, 16, 2).fill({ color: tube });
    g.moveTo(-5 + ox, bodyY + 8)
      .lineTo(-5 + ox + m.legL * 0.85, bodyY + 16)
      .stroke({ width: 3, color: stroke });
    g.moveTo(5 + ox, bodyY + 8)
      .lineTo(5 + ox + m.legR * 0.85, bodyY + 16)
      .stroke({ width: 3, color: stroke });
  }

  /** 军官：慢步、军帽、手枪、绶带 */
  private _drawOfficer(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const ox = m.swayX;
    g.ellipse(ox, bodyY, 9, 11)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.moveTo(ox - 3, bodyY + 2)
      .lineTo(ox + 4, bodyY + 8)
      .stroke({ width: 3, color: 0x7a2828, alpha: 0.92 });
    g.circle(ox, bodyY - 12, 6)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.ellipse(ox, bodyY - 14, 7, 4)
      .fill({ color: ((fill & 0xfefefe) >> 1) | 0x101010 })
      .stroke({ width: 1.5, color: stroke });
    g.moveTo(ox - 2, bodyY - 16)
      .lineTo(ox + 6, bodyY - 13)
      .stroke({ width: 2, color: stroke });
    const pistol = 0x2a2420;
    g.roundRect(5 + ox, bodyY - 1, 6, 3, 1).fill({ color: pistol });
    g.moveTo(-4 + ox, bodyY + 9)
      .lineTo(-4 + ox + m.legL * 0.9, bodyY + 17)
      .stroke({ width: 3, color: stroke });
    g.moveTo(4 + ox, bodyY + 9)
      .lineTo(4 + ox + m.legR * 0.9, bodyY + 17)
      .stroke({ width: 3, color: stroke });
  }

  /** 狙击手：长枪管步兵轮廓 */
  private _drawSniper(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const ox = m.swayX;
    g.ellipse(ox, bodyY, 9, 11)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(ox, bodyY - 12, 6)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(4 + ox, bodyY - 4, 24, 4, 2).fill({ color: gunC });
    g.moveTo(-4 + ox, bodyY + 9)
      .lineTo(-4 + ox + m.legL * 0.88, bodyY + 17)
      .stroke({ width: 3, color: stroke });
    g.moveTo(4 + ox, bodyY + 9)
      .lineTo(4 + ox + m.legR * 0.88, bodyY + 17)
      .stroke({ width: 3, color: stroke });
  }

  /** 掷弹兵：胸挂弹药 + 短枪 */
  private _drawGrenadier(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const ox = m.swayX;
    g.ellipse(ox, bodyY, 10, 11)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(ox, bodyY - 12, 5.5)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(ox - 3, bodyY + 1, 2.2).fill({ color: 0x2a2218, alpha: 0.85 });
    g.circle(ox + 1, bodyY + 2, 2.2).fill({ color: 0x2a2218, alpha: 0.85 });
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(4 + ox, bodyY - 2, 12, 4, 1).fill({ color: gunC });
    g.moveTo(-4 + ox, bodyY + 9)
      .lineTo(-4 + ox + m.legL * 0.85, bodyY + 16)
      .stroke({ width: 3, color: stroke });
    g.moveTo(4 + ox, bodyY + 9)
      .lineTo(4 + ox + m.legR * 0.85, bodyY + 16)
      .stroke({ width: 3, color: stroke });
  }

  /** 工兵：背包 + 短工具 */
  private _drawEngineer(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    g.ellipse(0, bodyY, 9, 11)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.roundRect(-6, bodyY - 4, 5, 8, 1).fill({ color: ((fill & 0xfefefe) >> 1) | 0x101010 });
    g.circle(0, bodyY - 12, 6)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.roundRect(5, bodyY - 2, 8, 3, 1).fill({ color: 0x3a3530 });
    g.moveTo(-4, bodyY + 9)
      .lineTo(-4 + m.legL * 0.9, bodyY + 17)
      .stroke({ width: 3, color: stroke });
    g.moveTo(4, bodyY + 9)
      .lineTo(4 + m.legR * 0.9, bodyY + 17)
      .stroke({ width: 3, color: stroke });
  }

  /** 重装步兵：宽肩、头盔加强 */
  private _drawHeavyInfantry(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    g.ellipse(0, bodyY, 11, 12)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(0, bodyY - 12, 6.5)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.ellipse(0, bodyY - 14, 7, 4).fill({ color: ((fill & 0xfefefe) >> 1) | 0x101010 }).stroke({ width: 1.5, color: stroke });
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(5, bodyY - 3, 16, 5, 2).fill({ color: gunC });
    g.moveTo(-5, bodyY + 9)
      .lineTo(-5 + m.legL * 0.82, bodyY + 17)
      .stroke({ width: 3, color: stroke });
    g.moveTo(5, bodyY + 9)
      .lineTo(5 + m.legR * 0.82, bodyY + 17)
      .stroke({ width: 3, color: stroke });
  }

  /** 装甲侦察车顶视 */
  private _drawScoutCar(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const cy = bodyY + 2;
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(-14, cy - 4, 28, 12, 3)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(-9, cy + 7 + m.bob * 0.15, 2.5).fill({ color: 0x1a1814 });
    g.circle(9, cy + 7 + m.bob * 0.15, 2.5).fill({ color: 0x1a1814 });
    g.circle(-9, cy - 5 + m.bob * 0.15, 2.5).fill({ color: 0x1a1814 });
    g.circle(9, cy - 5 + m.bob * 0.15, 2.5).fill({ color: 0x1a1814 });
    g.circle(0 + m.swayX * 0.3, cy - 2, 4).fill({ color: gunC }).stroke({ width: 1.5, color: stroke });
    g.roundRect(2 + m.swayX * 0.3, cy - 5, 10, 3, 1).fill({ color: gunC });
  }

  /** 侦察机顶视：细长机身 + 平直翼 */
  private _drawPlaneRecon(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const cy = bodyY + 1;
    const w = m.swayX * 0.4;
    g.ellipse(0, cy, 4, 14)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.moveTo(-16 + w, cy)
      .lineTo(16 + w, cy)
      .stroke({ width: 2.5, color: stroke });
    g.moveTo(0, cy - 10)
      .lineTo(-3 + w * 0.5, cy - 14)
      .lineTo(3 + w * 0.5, cy - 14)
      .closePath()
      .fill({ color: ((fill & 0xfefefe) >> 1) | 0x101010 })
      .stroke({ width: 1.5, color: stroke });
  }

  /** 战斗机：后掠翼示意 */
  private _drawPlaneFighter(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const cy = bodyY + 1;
    const w = m.swayX * 0.35;
    g.ellipse(0, cy, 5, 13)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.moveTo(-4 + w, cy - 2)
      .lineTo(-18 + w, cy + 6)
      .lineTo(-6 + w, cy + 4)
      .closePath()
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.moveTo(4 + w, cy - 2)
      .lineTo(18 + w, cy + 6)
      .lineTo(6 + w, cy + 4)
      .closePath()
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
  }

  /** 轰炸机：粗机身 + 宽翼 */
  private _drawPlaneBomber(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const cy = bodyY + 2;
    const w = m.swayX * 0.3;
    g.ellipse(0, cy, 7, 12)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.moveTo(-22 + w, cy + 2)
      .lineTo(22 + w, cy + 2)
      .stroke({ width: 2.5, color: stroke });
    g.circle(0, cy + 5, 2.5).fill({ color: 0x2a2018 });
  }

  /** 攻击机：机身 + 侧挂短翼 */
  private _drawPlaneGunship(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const cy = bodyY + 1;
    const w = m.swayX * 0.35;
    g.ellipse(0, cy, 6, 13)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.roundRect(-11 + w, cy - 1, 6, 4, 1).fill({ color: ((fill & 0xfefefe) >> 1) | 0x080808 });
    g.roundRect(5 + w, cy - 1, 6, 4, 1).fill({ color: ((fill & 0xfefefe) >> 1) | 0x080808 });
    g.moveTo(-14 + w, cy + 5)
      .lineTo(14 + w, cy + 5)
      .stroke({ width: 2, color: stroke });
  }

  /** 空降兵：伞绳弧 + 步兵身 */
  private _drawParatrooper(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const ox = m.swayX * 0.4;
    const chY = bodyY - 18 + m.bob * 0.2;
    g.moveTo(-8 + ox, chY)
      .quadraticCurveTo(0 + ox, chY - 8, 8 + ox, chY)
      .stroke({ width: 2, color: stroke, alpha: 0.75 });
    g.ellipse(ox, bodyY, 8, 10)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(ox, bodyY - 11, 5)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(4 + ox, bodyY - 3, 14, 4, 2).fill({ color: gunC });
    g.moveTo(-3 + ox, bodyY + 8)
      .lineTo(-3 + ox + m.legL * 0.75, bodyY + 15)
      .stroke({ width: 2.5, color: stroke });
    g.moveTo(3 + ox, bodyY + 8)
      .lineTo(3 + ox + m.legR * 0.75, bodyY + 15)
      .stroke({ width: 2.5, color: stroke });
  }

  /** 摩托侦察：双轮 + 骑手 + 短枪 */
  private _drawMotorScout(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const cy = bodyY + 4;
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.circle(-7, cy + 6, 4).fill({ color: 0x1a1814 });
    g.circle(7, cy + 6, 4).fill({ color: 0x1a1814 });
    g.roundRect(-10 + m.swayX * 0.15, cy - 2, 20, 6, 2)
      .fill({ color: gunC })
      .stroke({ width: 1.5, color: stroke });
    const ry = bodyY - 5 + m.bob * 0.15;
    g.ellipse(m.swayX * 0.2, ry, 7, 9)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(m.swayX * 0.2, ry - 11, 5)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.roundRect(5 + m.swayX * 0.2, ry - 4, 12, 3, 1).fill({ color: gunC });
  }

  /** 宪兵：步兵轮廓 + 红臂章 + 短枪 */
  private _drawMilitaryPolice(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    g.ellipse(0, bodyY, 9, 11)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.roundRect(-5, bodyY + 1, 5, 3, 1).fill({ color: 0x8a2828, alpha: 0.95 });
    g.circle(0, bodyY - 12, 6)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(4, bodyY - 2, 11, 4, 1).fill({ color: gunC });
    g.moveTo(-4, bodyY + 9)
      .lineTo(-4 + m.legL * 0.88, bodyY + 17)
      .stroke({ width: 3, color: stroke });
    g.moveTo(4, bodyY + 9)
      .lineTo(4 + m.legR * 0.88, bodyY + 17)
      .stroke({ width: 3, color: stroke });
  }

  /** 迫击炮组：座钣 + 尾管 + 短身 */
  private _drawMortarTeam(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const ox = m.swayX;
    g.roundRect(-9 + ox, bodyY + 4, 18, 4, 1).fill({ color: 0x3a3530, alpha: 0.92 });
    g.ellipse(ox, bodyY, 10, 11)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(ox, bodyY - 12, 5.5)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const tube = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(2 + ox, bodyY - 10, 4, 12, 3).fill({ color: tube });
    g.moveTo(-4 + ox, bodyY + 9)
      .lineTo(-4 + ox + m.legL * 0.88, bodyY + 16)
      .stroke({ width: 3, color: stroke });
    g.moveTo(4 + ox, bodyY + 9)
      .lineTo(4 + ox + m.legR * 0.88, bodyY + 16)
      .stroke({ width: 3, color: stroke });
  }

  /** 轻型坦克：宽车体 + 履带 + 炮塔 */
  private _drawLightTank(
    g: Graphics,
    bodyY: number,
    fill: number,
    stroke: number,
    m: EnemyMotionSample,
  ): void {
    const cy = bodyY + 3;
    const gunC = ((fill & 0xfefefe) >> 1) | 0x080808;
    g.roundRect(-18, cy - 5, 36, 14, 4)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    g.circle(-12, cy + 8 + m.bob * 0.12, 3).fill({ color: 0x1a1814 });
    g.circle(12, cy + 8 + m.bob * 0.12, 3).fill({ color: 0x1a1814 });
    const tx = m.swayX * 0.25;
    g.circle(tx, cy - 2, 5).fill({ color: gunC }).stroke({ width: 1.5, color: stroke });
    g.roundRect(-3 + tx, cy - 9, 10, 15, 2).fill({ color: gunC });
  }
}

/** 供 `GameScreen` 与视觉层共用的兵种主色：陆空分队、色相错开便于辨认 */
export function enemyKindFill(kind: EnemyKind): number {
  switch (kind) {
    case 'infantry':
      return 0x5a6b48;
    case 'puppet':
      return 0x5a6878;
    case 'dog':
      return 0x7a5640;
    case 'cavalry':
      return 0x5c6638;
    case 'mg':
      return 0x4a5542;
    case 'artillery':
      return 0x625040;
    case 'officer':
      return 0x4a3830;
    case 'sniper':
      return 0x3d5240;
    case 'grenadier':
      return 0x6b5a42;
    case 'engineer':
      return 0x586058;
    case 'heavy_infantry':
      return 0x454050;
    case 'scout_car':
      return 0x3a4552;
    case 'recon_plane':
      return 0x7a8aa8;
    case 'fighter_plane':
      return 0x5a7090;
    case 'bomber_plane':
      return 0x4a5568;
    case 'gunship':
      return 0x4a6868;
    case 'paratrooper':
      return 0x6b7a90;
    case 'motor_scout':
      return 0x5a5448;
    case 'military_police':
      return 0x4a3538;
    case 'mortar_team':
      return 0x5c5040;
    case 'light_tank':
      return 0x3a4038;
    default:
      return 0x5a6b48;
  }
}

/** 兵种描边：陆军偏橄榄/褐，空军偏青灰，军官金色点缀 */
export function enemyKindStroke(kind: EnemyKind): number {
  switch (kind) {
    case 'officer':
      return 0xc9a85c;
    case 'recon_plane':
    case 'fighter_plane':
    case 'bomber_plane':
    case 'gunship':
      return 0x2a5080;
    case 'paratrooper':
      return 0x3a6098;
    case 'puppet':
      return 0x3a4550;
    case 'scout_car':
      return 0x2a3848;
    case 'light_tank':
      return 0x2a3028;
    default:
      return 0x243220;
  }
}
