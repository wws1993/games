/**
 * 紫装部位基础攻防移速：与等阶倍率相乘；聚合入 `aggregatePurpleProfileBonuses` 与装备详情展示
 */

import type { RolledPurpleGearPiece } from './gearAffixConfig';
import type { GearGradeId } from './gearGradeConfig';
import { gearGradeIndex } from './gearGradeConfig';
import type { GearDropSlotId } from './gearSlotTypes';

/** 单件基础三维（展示为整数或一位小数） */
export interface GearBaseStatTriple {
  attack: number;
  defense: number;
  moveSpeed: number;
}

/**
 * 部位类型权重：主战/副武偏攻击；躯干/头/肩偏防御；战靴偏移速；腰带与饰物折中
 */
const SLOT_BASE_WEIGHT: Readonly<Record<GearDropSlotId, GearBaseStatTriple>> = {
  primary: { attack: 18, defense: 0, moveSpeed: 0 },
  secondary: { attack: 14, defense: 0, moveSpeed: 0 },
  torso: { attack: 0, defense: 20, moveSpeed: 0 },
  helmet: { attack: 0, defense: 16, moveSpeed: 0 },
  shoulder: { attack: 0, defense: 14, moveSpeed: 0 },
  hands: { attack: 4, defense: 8, moveSpeed: 0 },
  belt: { attack: 0, defense: 10, moveSpeed: 4 },
  boots: { attack: 0, defense: 8, moveSpeed: 16 },
  trinket: { attack: 3, defense: 3, moveSpeed: 3 },
};

/** 等阶倍率：E=1.00，每升一档 +0.05，SSS≈1.35 */
function gradeBaseMultiplier(grade: GearGradeId): number {
  return 1 + gearGradeIndex(grade) * 0.05;
}

/**
 * 单件基础攻防移速（部位 × 等阶）
 * @param slotId - 九部位之一
 * @param grade - 装备等阶
 */
export function getGearBaseStatsForPiece(slotId: GearDropSlotId, grade: GearGradeId): GearBaseStatTriple {
  const w = SLOT_BASE_WEIGHT[slotId];
  const m = gradeBaseMultiplier(grade);
  const round1 = (n: number): number => Math.round(n * 10) / 10;
  return {
    attack: round1(w.attack * m),
    defense: round1(w.defense * m),
    moveSpeed: round1(w.moveSpeed * m),
  };
}

/** 多件已装备基础三维求和，供局外加成聚合 */
export function sumBaseStatsFromPieces(pieces: readonly RolledPurpleGearPiece[]): GearBaseStatTriple {
  let attack = 0;
  let defense = 0;
  let moveSpeed = 0;
  for (const p of pieces) {
    const b = getGearBaseStatsForPiece(p.slotId, p.grade);
    attack += b.attack;
    defense += b.defense;
    moveSpeed += b.moveSpeed;
  }
  return {
    attack: Math.round(attack * 10) / 10,
    defense: Math.round(defense * 10) / 10,
    moveSpeed: Math.round(moveSpeed * 10) / 10,
  };
}
