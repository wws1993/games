import { Container, Graphics } from 'pixi.js';

import { MELEE_SWING_VISUAL_SEC } from './constants';
import { drawMeleeWeaponSwingArc } from './meleeWeaponSwingVisual';
import { DEFAULT_PLAYER_VECTOR_PALETTE } from '../meta/metaUnlockShopConfig';
import type { PlayerVectorPalette } from '../meta/metaUnlockShopConfig';
import type { SurvivorGameModel } from './SurvivorGameModel';

/** 走路正弦相位对时间的倍率，略快于真实步频以保持可读性 */
const WALK_PHASE_SPEED = 14;

/** 躯干上下起伏振幅（世界单位） */
const BOB_AMPLITUDE = 2.2;

/** 两腿摆动振幅（世界单位） */
const LEG_SWING_AMPLITUDE = 3.5;

/** 水平速度分量超过此阈值才刷新左右镜像，纯垂移时保留上次朝向 */
const FACING_FLIP_EPS = 0.06;

/** 步枪木托默认（与 `WEAPON_COSMETIC_SHOP_DEFS` 默认一致） */
const DEFAULT_GUN_WOOD = 0x4a3528;

/** 枪管金属默认 */
const DEFAULT_GUN_METAL = 0x2c3238;

/**
 * 局内主角世界层表现：程序化 idle / walk，锚点为逻辑碰撞圆心；后续可整体替换为 `AnimatedSprite` 序列帧
 */
export class PlayerWorldVisual {
  /** 挂到 `_worldRoot` 的节点，位置即 `playerX/playerY` */
  public readonly root = new Container();

  private readonly _bodyGfx = new Graphics();

  /** 近战挥击图层（与躯干同根、位于枪下层）；`position` 与 `_gunPivot` 同为肩部、`rotation` 同瞄准角；刃形见 `meleeWeaponSwingVisual` */
  private readonly _meleeSwingGfx = new Graphics();

  /** 枪管绕肩点旋转；与躯干分离以便 `rotation` 跟 `playerAim` 而非移动方向 */
  private readonly _gunPivot = new Container();

  private readonly _gunGfx = new Graphics();

  private _walkPhase = 0;

  private _lastFlipSign = 1;

  /** 当前角色矢量配色（局外商店可改） */
  private _palette: PlayerVectorPalette = { ...DEFAULT_PLAYER_VECTOR_PALETTE };

  private _gunWood = DEFAULT_GUN_WOOD;

  private _gunMetal = DEFAULT_GUN_METAL;

  public constructor() {
    this.root.eventMode = 'none';
    this.root.addChild(this._bodyGfx, this._meleeSwingGfx, this._gunPivot);
    this._gunPivot.addChild(this._gunGfx);
  }

  /**
   * 每局开始前由 `GameScreen` 根据档案设置角色配色与枪皮木托/金属色
   * @param palette - 躯干/帽/肤等矢量色
   * @param gunWood - 步枪木托 RGB
   * @param gunMetal - 枪管机匣 RGB
   */
  public setPlayerAppearance(palette: PlayerVectorPalette, gunWood: number, gunMetal: number): void {
    this._palette = { ...palette };
    this._gunWood = gunWood;
    this._gunMetal = gunMetal;
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

    const p = this._palette;
    const body = this._bodyGfx;
    body.clear();
    body.ellipse(0, bodyY, 9, 11)
      .fill({ color: p.uniformBody })
      .stroke({ width: 2, color: p.outline });
    body.roundRect(-5, bodyY + 1, 10, 3, 1).fill({ color: p.uniformShadow });
    body.moveTo(-5, bodyY + 5)
      .lineTo(5, bodyY + 5)
      .stroke({ width: 2, color: p.belt });
    body.circle(0, bodyY - 10, 5)
      .fill({ color: p.skin })
      .stroke({ width: 2, color: p.outline });
    body.ellipse(0, bodyY - 13, 8, 5)
      .fill({ color: p.capBody })
      .stroke({ width: 2, color: p.outline });
    body.roundRect(1, bodyY - 12, 9, 3, 1).fill({ color: p.capBrim });
    body.circle(4, bodyY - 12, 2.2).fill({ color: p.capStar });
    body.moveTo(-4, bodyY + 9)
      .lineTo(-4 + legSwing * 0.9, bodyY + 17)
      .stroke({ width: 3, color: p.legCloth });
    body.moveTo(4, bodyY + 9)
      .lineTo(4 - legSwing * 0.9, bodyY + 17)
      .stroke({ width: 3, color: p.legCloth });

    // 近战刀光：半角先张开，再以 slashP 沿弧扫出（与 _drawMeleeBladeSwing 一致）
    const meleeG = this._meleeSwingGfx;
    const showMeleeFan =
      model.meleeSwingVisualRemain > 0 &&
      model.meleeSwingRangePx > 0 &&
      MELEE_SWING_VISUAL_SEC > 1e-6;
    if (showMeleeFan) {
      const progress = 1 - model.meleeSwingVisualRemain / MELEE_SWING_VISUAL_SEC;
      const halfFull = model.meleeSwingArcHalfRad;
      const expand = Math.min(1, progress * 1.18);
      const halfNow = Math.max(halfFull * expand, halfFull > 0 ? 0.05 : 0);
      const r = model.meleeSwingRangePx;
      const slashP = Math.min(1, progress * 1.42);
      const sweepA0 = -halfNow;
      const sweepA1 = sweepA0 + 2 * halfNow * slashP;
      const fade = 1 - progress * 0.92;
      const aimWorld = Math.atan2(model.playerAimY, model.playerAimX);
      meleeG.position.set(5, bodyY - 0.5);
      meleeG.rotation = this._lastFlipSign >= 0 ? aimWorld : Math.PI - aimWorld;
      meleeG.visible = true;
      meleeG.clear();
      drawMeleeWeaponSwingArc(meleeG, model.equippedWeaponKind, r, sweepA0, sweepA1, fade);
    } else {
      meleeG.clear();
      meleeG.position.set(0, 0);
      meleeG.visible = false;
    }

    // 与原枪矩形左缘中点对齐，绕此点旋转使枪尖指向 `playerAim` 世界方向
    this._gunPivot.position.set(5, bodyY - 0.5);
    const aimWorld = Math.atan2(model.playerAimY, model.playerAimX);
    // 根 `scale.x = -1` 时仅水平翻转：世界角 θ 对应本地角 π - θ
    this._gunPivot.rotation = this._lastFlipSign >= 0 ? aimWorld : Math.PI - aimWorld;

    const gun = this._gunGfx;
    gun.clear();
    gun.roundRect(0, -2.5, 10, 5, 2).fill({ color: this._gunWood });
    gun.roundRect(9, -2, 8, 4, 1).fill({ color: this._gunMetal });
  }
}
