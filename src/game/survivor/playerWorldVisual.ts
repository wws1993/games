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

/** 八路军灰蓝粗布上衣 */
const UNIFORM_BODY = 0x5c6d7c;

/** 军装暗部/滚边 */
const UNIFORM_SHADOW = 0x4a5a68;

/** 面部肤色 */
const SKIN = 0xc49a78;

/** 军帽主体（灰蓝） */
const CAP_BODY = 0x3a4858;

/** 帽檐略深 */
const CAP_BRIM = 0x2a3442;

/** 帽前红星 */
const CAP_STAR = 0xd82828;

/** 腰带棕 */
const BELT = 0x4a3828;

/** 绑腿/裤深色 */
const LEG_CLOTH = 0x3a342c;

/** 线描 */
const OUTLINE = 0x2a2218;

/** 步枪木托 */
const GUN_WOOD = 0x4a3528;

/** 枪管金属 */
const GUN_METAL = 0x2c3238;

/**
 * 局内主角世界层表现：程序化 idle / walk，锚点为逻辑碰撞圆心；后续可整体替换为 `AnimatedSprite` 序列帧
 */
export class PlayerWorldVisual {
  /** 挂到 `_worldRoot` 的节点，位置即 `playerX/playerY` */
  public readonly root = new Container();

  private readonly _bodyGfx = new Graphics();

  /** 枪管绕肩点旋转；与躯干分离以便 `rotation` 跟 `playerAim` 而非移动方向 */
  private readonly _gunPivot = new Container();

  private readonly _gunGfx = new Graphics();

  private _walkPhase = 0;

  private _lastFlipSign = 1;

  public constructor() {
    this.root.eventMode = 'none';
    this.root.addChild(this._bodyGfx, this._gunPivot);
    this._gunPivot.addChild(this._gunGfx);
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
    const sc = model.chestBuffPlayerScaleMult;
    const safeSc = Number.isFinite(sc) && sc > 0 ? sc : 1;
    this.root.scale.x = this._lastFlipSign * safeSc;
    this.root.scale.y = safeSc;
    const moving = model.playerMoving && !freezeMotion;
    const phaseSp = model.playerDashing ? WALK_PHASE_SPEED * 1.55 : WALK_PHASE_SPEED;
    if (moving) {
      this._walkPhase += dt * phaseSp;
    }
    const bob = moving ? Math.sin(this._walkPhase * 2) * BOB_AMPLITUDE : 0;
    const legSwing = moving ? Math.sin(this._walkPhase) * LEG_SWING_AMPLITUDE : 0;
    const bodyY = -4 + bob;

    const body = this._bodyGfx;
    body.clear();
    body.ellipse(0, bodyY, 9, 11)
      .fill({ color: UNIFORM_BODY })
      .stroke({ width: 2, color: OUTLINE });
    body.roundRect(-5, bodyY + 1, 10, 3, 1).fill({ color: UNIFORM_SHADOW });
    body.moveTo(-5, bodyY + 5)
      .lineTo(5, bodyY + 5)
      .stroke({ width: 2, color: BELT });
    body.circle(0, bodyY - 10, 5)
      .fill({ color: SKIN })
      .stroke({ width: 2, color: OUTLINE });
    body.ellipse(0, bodyY - 13, 8, 5)
      .fill({ color: CAP_BODY })
      .stroke({ width: 2, color: OUTLINE });
    body.roundRect(1, bodyY - 12, 9, 3, 1).fill({ color: CAP_BRIM });
    body.circle(4, bodyY - 12, 2.2).fill({ color: CAP_STAR });
    body.moveTo(-4, bodyY + 9)
      .lineTo(-4 + legSwing * 0.9, bodyY + 17)
      .stroke({ width: 3, color: LEG_CLOTH });
    body.moveTo(4, bodyY + 9)
      .lineTo(4 - legSwing * 0.9, bodyY + 17)
      .stroke({ width: 3, color: LEG_CLOTH });

    // 与原枪矩形左缘中点对齐，绕此点旋转使枪尖指向 `playerAim` 世界方向
    this._gunPivot.position.set(5, bodyY - 0.5);
    const aimWorld = Math.atan2(model.playerAimY, model.playerAimX);
    // 根 `scale.x = -1` 时仅水平翻转：世界角 θ 对应本地角 π - θ
    this._gunPivot.rotation = this._lastFlipSign >= 0 ? aimWorld : Math.PI - aimWorld;

    const gun = this._gunGfx;
    gun.clear();
    gun.roundRect(0, -2.5, 10, 5, 2).fill({ color: GUN_WOOD });
    gun.roundRect(9, -2, 8, 4, 1).fill({ color: GUN_METAL });
  }
}
