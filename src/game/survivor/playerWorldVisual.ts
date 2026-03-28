import { Container, Graphics } from 'pixi.js';

import type { SurvivorGameModel } from './SurvivorGameModel';

/** 走路正弦相位对时间的倍率，略快于真实步频以保持可读性 */
const WALK_PHASE_SPEED = 14;

/** 躯干上下起伏振幅（世界单位） */
const BOB_AMPLITUDE = 2.2;

/** 两腿摆动振幅（世界单位） */
const LEG_SWING_AMPLITUDE = 3.5;

/** 水平速度分量超过此阈值才刷新左右镜像，纯垂移时保留上次朝向 */
const FACING_FLIP_EPS = 0.06;

/**
 * 局内主角世界层表现：程序化 idle / walk，锚点为逻辑碰撞圆心；后续可整体替换为 `AnimatedSprite` 序列帧
 */
export class PlayerWorldVisual {
  /** 挂到 `_worldRoot` 的节点，位置即 `playerX/playerY` */
  public readonly root = new Container();

  private readonly _gfx = new Graphics();

  private _walkPhase = 0;

  private _lastFlipSign = 1;

  public constructor() {
    this.root.eventMode = 'none';
    this.root.addChild(this._gfx);
  }

  /** 新一局时清零步态相位，避免继承上一局的 sin 相位 */
  public resetPhase(): void {
    this._walkPhase = 0;
  }

  /**
   * 与 `SurvivorGameModel` 对齐位置、左右翻转与走路相位，并重绘矢量小人
   * @param model - 局内模型（读朝向、是否移动）
   * @param dt - 帧间隔秒
   * @param freezeMotion - 升级弹窗、阵亡等暂停推进时冻结 walk 相位与起伏
   */
  public sync(model: SurvivorGameModel, dt: number, freezeMotion = false): void {
    this.root.position.set(model.playerX, model.playerY);
    const fx = model.playerFacingX;
    if (Math.abs(fx) > FACING_FLIP_EPS) {
      this._lastFlipSign = fx >= 0 ? 1 : -1;
    }
    this.root.scale.x = this._lastFlipSign;
    const moving = model.playerMoving && !freezeMotion;
    if (moving) {
      this._walkPhase += dt * WALK_PHASE_SPEED;
    }
    const bob = moving ? Math.sin(this._walkPhase * 2) * BOB_AMPLITUDE : 0;
    const legSwing = moving ? Math.sin(this._walkPhase) * LEG_SWING_AMPLITUDE : 0;
    const g = this._gfx;
    g.clear();
    const bodyY = -4 + bob;
    g.ellipse(0, bodyY, 9, 11)
      .fill({ color: 0xffcc44 })
      .stroke({ width: 2, color: 0x5c3a12 });
    g.circle(0, bodyY - 12, 6)
      .fill({ color: 0xffcc44 })
      .stroke({ width: 2, color: 0x5c3a12 });
    g.roundRect(5, bodyY - 3, 17, 5, 2).fill({ color: 0x4a3a2a });
    g.moveTo(-4, bodyY + 9)
      .lineTo(-4 + legSwing * 0.9, bodyY + 17)
      .stroke({ width: 3, color: 0x5c3a12 });
    g.moveTo(4, bodyY + 9)
      .lineTo(4 - legSwing * 0.9, bodyY + 17)
      .stroke({ width: 3, color: 0x5c3a12 });
  }
}
