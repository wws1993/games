import { Container, Graphics } from 'pixi.js';

import type { EnemyKind } from './enemyDefs';
import type { Enemy } from './types';

/** 水平分量超过此值才更新左右镜像，避免顶底往返时翻转抖动 */
const FACING_FLIP_EPS = 0.06;

/** 相对 `PLAYER_RADIUS` 参考体型的缩放上下限，避免极小/极大怪变形过度 */
const SCALE_MIN = 0.52;

const SCALE_MAX = 1.55;

const REF_RADIUS = 12;

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
   */
  public sync(enemy: Enemy, freezeMotion: boolean, fill: number, stroke: number): void {
    this.root.position.set(enemy.x, enemy.y);
    const fx = enemy.facingX;
    if (Math.abs(fx) > FACING_FLIP_EPS) {
      this._lastFlipSign = fx >= 0 ? 1 : -1;
    }
    const s0 = enemy.radius / REF_RADIUS;
    const s = Math.max(SCALE_MIN, Math.min(SCALE_MAX, s0));
    this.root.scale.x = this._lastFlipSign * s;
    this.root.scale.y = s;
    const phase = enemy.animPhase;
    const moving = !freezeMotion;
    const bob = moving ? Math.sin(phase * 2) * 2.1 : 0;
    const legSwing = moving ? Math.sin(phase) * 3.4 : 0;
    const g = this._gfx;
    g.clear();
    const bodyY = -4 + bob;
    g.ellipse(0, bodyY, 9, 11)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const headR = enemy.kind === 'dog' ? 5 : 6;
    const headY = enemy.kind === 'dog' ? bodyY - 9 : bodyY - 12;
    g.circle(0, headY, headR)
      .fill({ color: fill })
      .stroke({ width: 2, color: stroke });
    const gunW = enemy.kind === 'mg' ? 22 : enemy.kind === 'artillery' ? 14 : 17;
    const gunH = enemy.kind === 'artillery' ? 7 : 5;
    const gunC = ((fill & 0xfefefe) >> 1) | 0x101010;
    g.roundRect(5, bodyY - 3, gunW, gunH, 2).fill({ color: gunC });
    g.moveTo(-4, bodyY + 9)
      .lineTo(-4 + legSwing * 0.9, bodyY + 17)
      .stroke({ width: 3, color: stroke });
    g.moveTo(4, bodyY + 9)
      .lineTo(4 - legSwing * 0.9, bodyY + 17)
      .stroke({ width: 3, color: stroke });
  }
}

/** 供 `GameScreen` 与视觉层共用的兵种主色（占位矢量，阶段 4 可换精灵） */
export function enemyKindFill(kind: EnemyKind): number {
  switch (kind) {
    case 'infantry':
      return 0x7a2424;
    case 'puppet':
      return 0x6a4a42;
    case 'dog':
      return 0x5c4030;
    case 'cavalry':
      return 0x6a2828;
    case 'mg':
      return 0x4a3832;
    case 'artillery':
      return 0x353028;
    case 'officer':
      return 0x5a2060;
    default:
      return 0x7a2424;
  }
}

/** 兵种描边：军官略提亮便于辨认 */
export function enemyKindStroke(kind: EnemyKind): number {
  return kind === 'officer' ? 0xd4a020 : 0x2a0a0a;
}
