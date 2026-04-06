/**
 * 九部位紫箱装备词条聚合为局外档案加成，供 `SurvivorGameModel.syncGearLoadoutFromProfile` 与装备页预览对齐
 */

import { sumBaseStatsFromPieces } from './gearBaseStatsConfig';
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
  /** 穿透几率加总，单发齐射判定一次；与套装叠乘 */
  pierceChanceAdd: number;
  /** 专注词条：额外暴击率加算 */
  focusCritChanceAdd: number;
  /** 稀有低血伤：与升级卡 `lowHpDamageMult` 相乘（≤30% 血时步枪） */
  profileLowHpDamageMult: number;
  /** 稀有吸血，与升级卡相加 */
  profileLifestealAdd: number;
  /** 宝箱限时增益时长乘子：1 + 稀有 chrono 之和 */
  chestBuffDurationMult: number;
  /** 首次受伤抵消比例 0～0.75（`r_phantom` 为 18～40 的百分数累加） */
  phantomMitigatePct: number;
  /** 守护者层数：每层提供可吸收护盾池 */
  guardianStacks: number;
  /** 二连发层数：每层本发齐射 +1 发弹丸 */
  doubleTapStacks: number;
  /** 溅射层数：击杀时小范围追加伤害 */
  shrapnelStacks: number;
  /** 铁血 9 件：低血时额外暴击率（≤30% 血） */
  setTiexueNineLowCritAdd: number;
  /** 暗影 3 件：暴伤乘子加成区（叠在 critOnHit 上） */
  setYexiCritDamageMult: number;
  /** 全属性乘子（根据地 9 件） */
  gearAllStatMult: number;
  /** 荆棘套：叠乘到局内 `thornsDamageMult`（仅套装，不含升级卡） */
  profileThornsDamageMult: number;
  /** 弹幕套：步枪齐射额外弹丸数（与 `rifleBulletCount`、二连发层数相加后受单发上限约束） */
  profileDanmuBulletAdd: number;
  /** 血契 9 件：击杀回复最大生命比例（与 `killHealAdd` 相加结算） */
  profileKillHealMaxHpPct: number;
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
    pierceChanceAdd: 0,
    focusCritChanceAdd: 0,
    profileLowHpDamageMult: 1,
    profileLifestealAdd: 0,
    chestBuffDurationMult: 1,
    phantomMitigatePct: 0,
    guardianStacks: 0,
    doubleTapStacks: 0,
    shrapnelStacks: 0,
    setTiexueNineLowCritAdd: 0,
    setYexiCritDamageMult: 1,
    gearAllStatMult: 1,
    profileThornsDamageMult: 1,
    profileDanmuBulletAdd: 0,
    profileKillHealMaxHpPct: 0,
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

/** 统计各套装件数 */
function countSetPieces(pieces: readonly RolledPurpleGearPiece[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const p of pieces) {
    if (p.setId) {
      c[p.setId] = (c[p.setId] ?? 0) + 1;
    }
  }
  return c;
}

/**
 * 将已装备在各部位的紫装词条合计为一套乘区（百分比类先按 id 加总再换算，避免多件爆炸）
 * @param pieces - 通常为 `equippedPurpleBySlot` 的非空值列表
 */
export function aggregatePurpleProfileBonuses(pieces: readonly RolledPurpleGearPiece[]): PurpleProfileBonuses {
  const t = sumAffixTotalsFromPieces(pieces);
  const setN = countSetPieces(pieces);
  const nTiexue = setN.set_tiexue ?? 0;
  const nYexi = setN.set_yexi ?? 0;
  const nJudi = setN.set_judi ?? 0;
  const nFanshang = setN.set_fanshang ?? 0;
  const nXixue = setN.set_xixue ?? 0;
  const nDanmu = setN.set_danmu ?? 0;

  const armorPct = Math.max(0, t.armor_pct ?? 0);
  const dr = Math.min(0.85, armorPct);
  const tenacity = Math.max(0, t.tenacity ?? 0);
  const tenacityExtra = Math.min(0.22, tenacity * 0.004);
  const movePct = Math.max(0, t.move_pct ?? 0);
  const critPct = Math.max(0, t.crit_pct ?? 0);
  const cdPct = Math.max(0, t.cd_pct ?? 0);
  const dmgPct = Math.max(0, t.dmg_pct ?? 0);
  const brPct = Math.max(0, t.bullet_r_pct ?? 0);
  const xpPct = Math.max(0, t.xp_pct ?? 0);
  const luckFlat = Math.max(0, t.luck_flat ?? 0);
  const rMeritFind = Math.max(0, t.r_merit_find ?? 0);
  const rFortune = Math.max(0, t.r_fortune ?? 0);
  const pierceChance = Math.min(0.85, Math.max(0, t.pierce_chance ?? 0));
  const focus = Math.max(0, t.focus ?? 0);
  const focusCrit = Math.min(0.08, focus * 0.0022);
  const rBlood = Math.max(0, t.r_blood_rage ?? 0);
  const lowHpGear = Math.min(2.2, 1 + Math.min(1.2, rBlood));
  const rVamp = Math.max(0, t.r_vamp ?? 0);
  const rChrono = Math.max(0, t.r_chrono ?? 0);
  const rPhantomSum = Math.max(0, t.r_phantom ?? 0);
  const phantomPct = Math.min(0.75, rPhantomSum / 100);
  const guardianStacks = Math.min(12, Math.floor(t.r_guardian ?? 0));
  const doubleTapStacks = Math.min(5, Math.floor(t.r_double_tap ?? 0));
  const shrapnelStacks = Math.min(8, Math.floor(t.r_shrapnel ?? 0));

  let damageTakenMult = (1 - dr) * (1 - tenacityExtra);
  let moveSpeedMult = Math.max(0.2, 1 + movePct);
  let rifleDamageMult = Math.max(0.2, 1 + dmgPct);
  let expMult = Math.max(0.2, 1 + xpPct + rMeritFind);
  let luckMult = Math.max(0.2, 1 + luckFlat * 0.03 + rFortune * 0.02);
  let pierceChanceAdd = pierceChance;
  let pickupRadiusAdd = Math.max(0, t.pickup_flat ?? 0);

  if (nTiexue >= 3) {
    rifleDamageMult *= 1.05;
  }
  if (nTiexue >= 6) {
    damageTakenMult *= 0.92;
    moveSpeedMult *= 1.04;
  }

  let setTiexueNineLowCritAdd = 0;
  if (nTiexue >= 9) {
    setTiexueNineLowCritAdd = 0.12;
  }

  let setYexiCritDamageMult = 1;
  if (nYexi >= 3) {
    setYexiCritDamageMult *= 1.08;
  }
  if (nYexi >= 6) {
    pierceChanceAdd = Math.min(0.85, pierceChanceAdd + 0.06);
    pickupRadiusAdd += 12;
  }

  if (nJudi >= 3) {
    expMult *= 1.06;
  }
  if (nJudi >= 6) {
    expMult *= 1.06;
    luckMult *= 1.1;
  }

  let gearAllStatMult = 1;
  if (nJudi >= 9) {
    gearAllStatMult = 1.05;
    rifleDamageMult *= gearAllStatMult;
    moveSpeedMult *= gearAllStatMult;
    expMult *= gearAllStatMult;
    luckMult *= gearAllStatMult;
  }

  let profileThornsDamageMult = 1;
  if (nFanshang >= 3) {
    profileThornsDamageMult *= 1.12;
  }
  if (nFanshang >= 6) {
    profileThornsDamageMult *= 1.15;
  }
  if (nFanshang >= 9) {
    profileThornsDamageMult *= 1.18;
  }

  let setXixueLifestealAdd = 0;
  if (nXixue >= 3) {
    setXixueLifestealAdd += 0.02;
  }
  if (nXixue >= 6) {
    setXixueLifestealAdd += 0.03;
  }
  if (nXixue >= 9) {
    setXixueLifestealAdd += 0.05;
  }

  let profileDanmuBulletAdd = 0;
  if (nDanmu >= 3) {
    profileDanmuBulletAdd += 1;
  }
  if (nDanmu >= 6) {
    profileDanmuBulletAdd += 1;
  }
  if (nDanmu >= 9) {
    profileDanmuBulletAdd += 1;
  }

  let profileKillHealMaxHpPct = 0;
  if (nXixue >= 9) {
    profileKillHealMaxHpPct += 0.005;
  }

  const baseRifleAsp = Math.max(0.2, 1 + cdPct);
  const baseBulletR = Math.max(0.2, 1 + brPct);

  /** 部位基础攻防移速合计叠乘到乘区（系数偏小，避免压过词条） */
  const baseSum = sumBaseStatsFromPieces(pieces);
  const atkB = baseSum.attack;
  const defB = baseSum.defense;
  const moveB = baseSum.moveSpeed;
  rifleDamageMult *= 1 + atkB * 0.0012;
  damageTakenMult *= 1 - Math.min(0.22, defB * 0.0018);
  moveSpeedMult *= 1 + moveB * 0.001;

  return {
    damageTakenMult,
    maxHpAdd: Math.max(0, t.hp_flat ?? 0),
    moveSpeedMult,
    critChanceAdd: Math.min(0.55, critPct * (nJudi >= 9 ? gearAllStatMult : 1)),
    pickupRadiusAdd,
    rifleAttackSpeedMult: baseRifleAsp * (nJudi >= 9 ? gearAllStatMult : 1),
    rifleDamageMult,
    bulletRadiusMult: baseBulletR * (nJudi >= 9 ? gearAllStatMult : 1),
    regenAdd: Math.max(0, t.regen_flat ?? 0),
    expMult,
    rifleRangeAdd: Math.max(0, t.range_flat ?? 0),
    luckMult,
    pierceChanceAdd,
    focusCritChanceAdd: focusCrit,
    profileLowHpDamageMult: lowHpGear,
    profileLifestealAdd: Math.min(0.45, rVamp + setXixueLifestealAdd),
    chestBuffDurationMult: Math.max(0.5, 1 + Math.min(0.6, rChrono)),
    phantomMitigatePct: phantomPct,
    guardianStacks,
    doubleTapStacks,
    shrapnelStacks,
    setTiexueNineLowCritAdd,
    setYexiCritDamageMult,
    gearAllStatMult,
    profileThornsDamageMult,
    profileDanmuBulletAdd,
    profileKillHealMaxHpPct,
  };
}
