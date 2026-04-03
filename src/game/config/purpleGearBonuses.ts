/**
 * 九部位紫箱装备词条聚合为局外档案加成，供 `SurvivorGameModel.syncGearLoadoutFromProfile` 与装备页预览对齐
 */

import type { RolledPurpleGearPiece } from './gearAffixConfig';

/** 与 `SurvivorGameModel` 护具/战术叠乘字段同构的紫装聚合结果 */
export interface PurpleProfileBonuses {
  /** 乘在承伤上；1 为无减伤词条 */
  damageTakenMult: number;
  maxHpAdd: number;
  moveSpeedMult: number;
  critChanceAdd: number;
  pickupRadiusAdd: number;
  rifleAttackSpeedMult: number;
  rifleDamageMult: number;
  bulletRadiusMult: number;
  regenAdd: number;
  expMult: number;
  rifleRangeAdd: number;
  luckMult: number;
}

/** 无紫装时的单位元 */
export function emptyPurpleProfileBonuses(): PurpleProfileBonuses {
  return {
    damageTakenMult: 1,
    maxHpAdd: 0,
    moveSpeedMult: 1,
    critChanceAdd: 0,
    pickupRadiusAdd: 0,
    rifleAttackSpeedMult: 1,
    rifleDamageMult: 1,
    bulletRadiusMult: 1,
    regenAdd: 0,
    expMult: 1,
    rifleRangeAdd: 0,
    luckMult: 1,
  };
}

function sumAffixTotalsFromPieces(pieces: readonly RolledPurpleGearPiece[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of pieces) {
    const t = p.affixStatTotals ?? {};
    for (const k of Object.keys(t)) {
      const v = t[k];
      if (typeof v === 'number' && Number.isFinite(v)) {
        out[k] = (out[k] ?? 0) + v;
      }
    }
  }
  return out;
}

/**
 * 将已装备在各部位的紫装词条合计为一套乘区（百分比类先按 id 加总再换算，避免多件爆炸）
 * @param pieces - 通常为 `equippedPurpleBySlot` 的非空值列表
 */
export function aggregatePurpleProfileBonuses(pieces: readonly RolledPurpleGearPiece[]): PurpleProfileBonuses {
  const t = sumAffixTotalsFromPieces(pieces);
  const armorPct = Math.max(0, t.armor_pct ?? 0);
  const dr = Math.min(0.85, armorPct);
  const movePct = Math.max(0, t.move_pct ?? 0);
  const critPct = Math.max(0, t.crit_pct ?? 0);
  const cdPct = Math.max(0, t.cd_pct ?? 0);
  const dmgPct = Math.max(0, t.dmg_pct ?? 0);
  const brPct = Math.max(0, t.bullet_r_pct ?? 0);
  const xpPct = Math.max(0, t.xp_pct ?? 0);
  const luckFlat = Math.max(0, t.luck_flat ?? 0);
  const rMeritFind = Math.max(0, t.r_merit_find ?? 0);
  const rFortune = Math.max(0, t.r_fortune ?? 0);
  return {
    damageTakenMult: 1 - dr,
    maxHpAdd: Math.max(0, t.hp_flat ?? 0),
    moveSpeedMult: Math.max(0.2, 1 + movePct),
    critChanceAdd: Math.min(0.55, critPct),
    pickupRadiusAdd: Math.max(0, t.pickup_flat ?? 0),
    rifleAttackSpeedMult: Math.max(0.2, 1 + cdPct),
    rifleDamageMult: Math.max(0.2, 1 + dmgPct),
    bulletRadiusMult: Math.max(0.2, 1 + brPct),
    regenAdd: Math.max(0, t.regen_flat ?? 0),
    expMult: Math.max(0.2, 1 + xpPct + rMeritFind),
    rifleRangeAdd: Math.max(0, t.range_flat ?? 0),
    luckMult: Math.max(0.2, 1 + luckFlat * 0.03 + rFortune * 0.02),
  };
}
