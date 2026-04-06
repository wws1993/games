/**
 * 主页与局内共享的开发者向参数：游戏时间倍率、下局开局生效的生命与步枪攻速加成
 */

/** 可循环切换的局内逻辑时间倍率（与 `GameScreen` 的 dt 乘子一致） */
export const DEV_TIME_SCALES = [1, 2, 3] as const;

/** 合法时间倍率字面量类型 */
export type DevTimeScale = (typeof DEV_TIME_SCALES)[number];

let _timeScaleIdx = 0;
/** 下一局 `playerMaxHp` 在基础上额外增加的量 */
let _bonusMaxHp = 0;
/** 下一局 `rifleAttackSpeedMult` 在基础 1 之上额外增加的量（+999 即约 1000 倍射速） */
let _bonusRifleAttackSpeed = 0;

/** 当前选中的时间倍率 */
export function getDevTimeScale(): DevTimeScale {
  return DEV_TIME_SCALES[_timeScaleIdx]!;
}

/** 按 1→2→3→1 循环并返回新倍率 */
export function cycleDevTimeScale(): DevTimeScale {
  _timeScaleIdx = (_timeScaleIdx + 1) % DEV_TIME_SCALES.length;
  return getDevTimeScale();
}

/** 与局内开发者面板芯片同步 */
export function setDevTimeScale(scale: DevTimeScale): void {
  const i = DEV_TIME_SCALES.indexOf(scale);
  if (i >= 0) {
    _timeScaleIdx = i;
  }
}

/** 开局加到最大生命上的额外值（0 或 999） */
export function getDevBonusMaxHp(): number {
  return _bonusMaxHp;
}

/** 切换生命加成：0 ↔ 999；返回当前生效值 */
export function toggleDevBonusMaxHp(): number {
  _bonusMaxHp = _bonusMaxHp > 0 ? 0 : 999;
  return _bonusMaxHp;
}

/** 开局加到步枪攻速倍率上的额外值 */
export function getDevBonusRifleAttackSpeed(): number {
  return _bonusRifleAttackSpeed;
}

/** 切换攻速加成：0 ↔ 999 */
export function toggleDevBonusRifleAttackSpeed(): number {
  _bonusRifleAttackSpeed = _bonusRifleAttackSpeed > 0 ? 0 : 999;
  return _bonusRifleAttackSpeed;
}
