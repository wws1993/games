/**
 * 装备等阶 E～SSS：每升一阶多 1 条词条；S 起可有套装（见 `gearSetConfig`）
 */

/** 等阶序：E=1 词条 … SSS=8 词条 */
export const GEAR_GRADE_ORDER = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'] as const;

/** 装备等阶 id */
export type GearGradeId = (typeof GEAR_GRADE_ORDER)[number];

/** 等阶展示：中文档名、Pixi 色、CSS 背景 */
export const GEAR_GRADE_VISUAL: Readonly<
  Record<
    GearGradeId,
    {
      tierName: string;
      fillColor: number;
      bgCss: string;
    }
  >
> = {
  E: { tierName: 'E', fillColor: 0x6a6a72, bgCss: '#4a4a55' },
  D: { tierName: 'D', fillColor: 0x4d6a55, bgCss: '#2a3d32' },
  C: { tierName: 'C', fillColor: 0x2d5a8a, bgCss: '#1a3558' },
  B: { tierName: 'B', fillColor: 0x5a3d9a, bgCss: '#3a2568' },
  A: { tierName: 'A', fillColor: 0x8a4a9a, bgCss: '#5a2868' },
  S: { tierName: 'S', fillColor: 0xc9a020, bgCss: '#8a6a12' },
  SS: { tierName: 'SS', fillColor: 0xe87038, bgCss: '#a04820' },
  SSS: { tierName: 'SSS', fillColor: 0xff4060, bgCss: '#a01830' },
};

/** 等阶在 `GEAR_GRADE_ORDER` 中的下标 */
export function gearGradeIndex(g: GearGradeId): number {
  return GEAR_GRADE_ORDER.indexOf(g);
}

/** 该等阶总词条条数：E=1 … SSS=8 */
export function totalAffixLinesForGrade(g: GearGradeId): number {
  return gearGradeIndex(g) + 1;
}

/**
 * 稀有条数：A 及以下全走普通池；S 起掺稀有，总条数仍由 `totalAffixLinesForGrade` 约束
 * 依据：高阶装备语义更强，稀有池占位随 SS / SSS 略增
 */
export function splitNormalRareAffixCounts(g: GearGradeId): { normal: number; rare: number } {
  const total = totalAffixLinesForGrade(g);
  const i = gearGradeIndex(g);
  let rare = 0;
  if (i >= 7) {
    rare = Math.min(3, total);
  } else if (i === 6) {
    rare = Math.min(2, total);
  } else if (i === 5) {
    rare = Math.min(2, total);
  } else if (i === 4) {
    rare = Math.min(1, total);
  }
  rare = Math.min(rare, total);
  return { normal: total - rare, rare };
}

/**
 * 紫箱开箱件数：随击杀怪等级提高，最少 1、最多 5
 * 依据：`ml=1→1`，`ml=4→2`，`ml=7→3`，`ml=10→4`，`ml=13+→5`
 */
export function rollPurpleChestPieceCount(monsterLevel: number): number {
  const ml = Math.max(1, Math.floor(monsterLevel));
  return Math.min(5, Math.max(1, Math.floor((ml + 2) / 3)));
}

/**
 * 由怪物等级加权随机等阶；等级越高高阶权重略升
 */
export function rollGearGradeForDrop(monsterLevel: number): GearGradeId {
  const ml = Math.max(1, Math.floor(monsterLevel));
  const bias = Math.min(42, ml * 2.1);
  const t = Math.random() * 100 + bias;
  if (t < 30) {
    return 'E';
  }
  if (t < 50) {
    return 'D';
  }
  if (t < 64) {
    return 'C';
  }
  if (t < 76) {
    return 'B';
  }
  if (t < 86) {
    return 'A';
  }
  if (t < 93) {
    return 'S';
  }
  if (t < 97.5) {
    return 'SS';
  }
  return 'SSS';
}
