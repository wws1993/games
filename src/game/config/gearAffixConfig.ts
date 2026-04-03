/**
 * 紫箱装备掉落：件数随怪等级 1～5；单件等阶 E～SSS 决定词条条数；词条自池随机；配置表见 `gearEquipmentCatalog`
 */

import { pickRandomCatalogEntry } from './gearEquipmentCatalog';
import type { GearGradeId } from './gearGradeConfig';
import {
  GEAR_GRADE_VISUAL,
  rollGearGradeForDrop,
  rollPurpleChestPieceCount,
  splitNormalRareAffixCounts,
} from './gearGradeConfig';
import { getGearSetDefById } from './gearSetConfig';
import type { GearDropSlotId } from './gearSlotTypes';
import { GEAR_DROP_SLOT_ORDER } from './gearSlotTypes';

export type { GearDropSlotId } from './gearSlotTypes';
export { GEAR_DROP_SLOT_ORDER } from './gearSlotTypes';

/** 兼容旧逻辑：旧版 1～6 档（新逻辑已改用 E～SSS，保留常量避免外部引用报错） */
export const GEAR_DROP_LEVEL_MAX = 6;

/** 旧等级视觉（新掉落以 `GEAR_GRADE_VISUAL` 为准） */
export const GEAR_LEVEL_VISUAL: Readonly<
  Record<
    number,
    {
      tierName: string;
      fillColor: number;
      bgCss: string;
    }
  >
> = {
  1: { tierName: '普通', fillColor: 0x5c5c66, bgCss: '#3d3d45' },
  2: { tierName: '优良', fillColor: 0x2d6a3a, bgCss: '#1e4a28' },
  3: { tierName: '精良', fillColor: 0x2a5fa8, bgCss: '#1a3d6e' },
  4: { tierName: '史诗', fillColor: 0x7a3cb8, bgCss: '#4a2570' },
  5: { tierName: '传说', fillColor: 0xc9a020, bgCss: '#8a6a12' },
  6: { tierName: '神话', fillColor: 0xd84850, bgCss: '#8a2028' },
};

/** 普通词条：区间 roll 后填入 `{0}` */
export interface GearNormalAffixDef {
  id: string;
  labelTpl: string;
  min: number;
  max: number;
  unitPercent?: boolean;
  fractionDigits?: number;
}

/** 稀有词条 */
export interface GearRareAffixDef {
  id: string;
  labelTpl: string;
  min?: number;
  max?: number;
  unitPercent?: boolean;
  fractionDigits?: number;
}

export const GEAR_NORMAL_AFFIX_DEFS: readonly GearNormalAffixDef[] = [
  { id: 'hp_flat', labelTpl: '生命 +{0}', min: 5, max: 28 },
  { id: 'armor_pct', labelTpl: '减伤 +{0}', min: 0.01, max: 0.05, unitPercent: true, fractionDigits: 1 },
  { id: 'move_pct', labelTpl: '移速 +{0}', min: 0.008, max: 0.04, unitPercent: true, fractionDigits: 1 },
  { id: 'pickup_flat', labelTpl: '拾取 +{0}', min: 4, max: 22 },
  { id: 'crit_pct', labelTpl: '暴击 +{0}', min: 0.006, max: 0.035, unitPercent: true, fractionDigits: 1 },
  { id: 'cd_pct', labelTpl: '射速 +{0}', min: 0.01, max: 0.06, unitPercent: true, fractionDigits: 1 },
  { id: 'dmg_pct', labelTpl: '伤害 +{0}', min: 0.012, max: 0.055, unitPercent: true, fractionDigits: 1 },
  { id: 'bullet_r_pct', labelTpl: '弹径 +{0}', min: 0.01, max: 0.06, unitPercent: true, fractionDigits: 1 },
  { id: 'regen_flat', labelTpl: '回复 +{0}/s', min: 0.2, max: 1.8, fractionDigits: 1 },
  { id: 'xp_pct', labelTpl: '经验 +{0}', min: 0.015, max: 0.07, unitPercent: true, fractionDigits: 1 },
  { id: 'range_flat', labelTpl: '射程 +{0}', min: 6, max: 38 },
  { id: 'pierce_chance', labelTpl: '穿透几率 +{0}', min: 0.02, max: 0.09, unitPercent: true, fractionDigits: 0 },
  { id: 'luck_flat', labelTpl: '幸运 +{0}', min: 1, max: 8 },
  { id: 'tenacity', labelTpl: '韧性 +{0}', min: 3, max: 16 },
  { id: 'focus', labelTpl: '专注 +{0}', min: 2, max: 12 },
];

export const GEAR_RARE_AFFIX_DEFS: readonly GearRareAffixDef[] = [
  { id: 'r_double_tap', labelTpl: '二连触发的额外 1 发' },
  { id: 'r_shrapnel', labelTpl: '击杀小范围溅射' },
  { id: 'r_blood_rage', labelTpl: '低血时伤害 +{0}', min: 0.08, max: 0.22, unitPercent: true, fractionDigits: 0 },
  { id: 'r_guardian', labelTpl: '受击后短时效护盾' },
  { id: 'r_vamp', labelTpl: '吸血 +{0}', min: 0.015, max: 0.045, unitPercent: true, fractionDigits: 1 },
  { id: 'r_fortune', labelTpl: '宝箱增益强度 +{0}', min: 0.06, max: 0.18, unitPercent: true, fractionDigits: 0 },
  { id: 'r_chrono', labelTpl: '技能类增益时长 +{0}', min: 0.05, max: 0.15, unitPercent: true, fractionDigits: 0 },
  { id: 'r_phantom', labelTpl: '首次受伤抵消 {0}%', min: 18, max: 40, fractionDigits: 0 },
  { id: 'r_merit_find', labelTpl: '经验获取 +{0}', min: 0.04, max: 0.12, unitPercent: true, fractionDigits: 0 },
];

/** 生成仓库内唯一实例 id，供锁定与出售时稳定引用（与词条无关） */
export function genPurpleGearInstanceId(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') {
      return c.randomUUID();
    }
  } catch {
    /* 忽略 */
  }
  return `g${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/** 紫箱单件结果 */
export interface RolledPurpleGearPiece {
  slotId: GearDropSlotId;
  slotLabel: string;
  /** 等阶 E～SSS */
  grade: GearGradeId;
  /** 仓库内唯一实例 id；旧存档加载时由 `achievementStore` 补齐 */
  stashInstanceId: string;
  /** `gearEquipmentCatalog` 中的 id */
  catalogId: string;
  /** 装备名 */
  displayName: string;
  /** 套装 id；非套装为 null */
  setId: string | null;
  /** 套装中文名；非套装为 null */
  setName: string | null;
  tierName: string;
  displayFillColor: number;
  displayBgCss: string;
  normalLines: string[];
  rareLines: string[];
  /**
   * 单件内各词条 id 的 roll 值合计（普通+稀有合并）；供 `aggregatePurpleProfileBonuses` 聚合到局外加成
   */
  affixStatTotals: Record<string, number>;
}

/** 一整箱多件 */
export interface PurpleChestBundle {
  pieces: RolledPurpleGearPiece[];
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

function formatAffixLineFromRaw(d: GearNormalAffixDef | GearRareAffixDef, raw: number): string {
  if (d.min === undefined || d.max === undefined) {
    return d.labelTpl;
  }
  let v: string;
  if (d.unitPercent) {
    v = `${(raw * 100).toFixed(d.fractionDigits ?? 0)}%`;
  } else if (d.fractionDigits !== undefined) {
    v = raw.toFixed(d.fractionDigits);
  } else {
    v = String(Math.round(raw));
  }
  return d.labelTpl.replace(/\{0\}/g, v);
}

function mergeStatTotals(
  into: Record<string, number>,
  id: string,
  raw: number,
): void {
  into[id] = (into[id] ?? 0) + raw;
}

/** 随机普通词条：同步产出展示行与 `affixStatTotals` 增量 */
function pickNormalAffixRolls(count: number): { lines: string[]; totals: Record<string, number> } {
  const totals: Record<string, number> = {};
  const pool = [...GEAR_NORMAL_AFFIX_DEFS];
  const lines: string[] = [];
  while (lines.length < count) {
    shuffleInPlace(pool);
    for (const def of pool) {
      if (lines.length >= count) {
        break;
      }
      const raw = def.min + Math.random() * (def.max - def.min);
      mergeStatTotals(totals, def.id, raw);
      lines.push(formatAffixLineFromRaw(def, raw));
    }
  }
  return { lines, totals };
}

/** 随机稀有词条：无 min/max 的仅文案，有区间的写入 `totals` */
function pickRareAffixRolls(count: number): { lines: string[]; totals: Record<string, number> } {
  const totals: Record<string, number> = {};
  if (count <= 0) {
    return { lines: [], totals };
  }
  const pool = [...GEAR_RARE_AFFIX_DEFS];
  shuffleInPlace(pool);
  const pick = pool.slice(0, Math.min(count, pool.length));
  const lines = pick.map((def) => {
    if (def.min === undefined || def.max === undefined) {
      return def.labelTpl;
    }
    const raw = def.min + Math.random() * (def.max - def.min);
    mergeStatTotals(totals, def.id, raw);
    return formatAffixLineFromRaw(def, raw);
  });
  return { lines, totals };
}

/** 按怪物等级随机部位（均匀） */
function rollRandomSlotRow(): (typeof GEAR_DROP_SLOT_ORDER)[number] {
  return GEAR_DROP_SLOT_ORDER[Math.floor(Math.random() * GEAR_DROP_SLOT_ORDER.length)]!;
}

function mergeAffixTotals(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const k of Object.keys(b)) {
    const v = b[k];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

/** 按怪物等级生成 1～5 件装备，等阶与词条见配置表 */
export function rollPurpleChestBundle(monsterLevel: number): PurpleChestBundle {
  const ml = Math.max(1, Math.floor(monsterLevel));
  const count = rollPurpleChestPieceCount(ml);
  const pieces: RolledPurpleGearPiece[] = [];
  for (let i = 0; i < count; i++) {
    const row = rollRandomSlotRow();
    const grade = rollGearGradeForDrop(ml);
    const entry = pickRandomCatalogEntry(row.id, grade);
    const vis = GEAR_GRADE_VISUAL[grade];
    const { normal: nN, rare: nR } = splitNormalRareAffixCounts(grade);
    const nRoll = pickNormalAffixRolls(nN);
    const rRoll = pickRareAffixRolls(nR);
    const affixStatTotals = mergeAffixTotals(nRoll.totals, rRoll.totals);
    const setDef = entry.setId ? getGearSetDefById(entry.setId) : undefined;
    pieces.push({
      slotId: row.id,
      slotLabel: row.label,
      grade,
      stashInstanceId: genPurpleGearInstanceId(),
      catalogId: entry.id,
      displayName: entry.displayName,
      setId: entry.setId,
      setName: setDef?.name ?? null,
      tierName: vis.tierName,
      displayFillColor: vis.fillColor,
      displayBgCss: vis.bgCss,
      normalLines: nRoll.lines,
      rareLines: rRoll.lines,
      affixStatTotals,
    });
  }
  return { pieces };
}

/**
 * 多行 HUD 文案：首行摘要，以下每件一行；词条过多时只展示前两条普通 + 全部稀有 +「等」
 * @param bundle - `rollPurpleChestBundle` 产物
 */
export function formatPurpleChestToast(bundle: PurpleChestBundle): string {
  const lines: string[] = [];
  lines.push(`紫箱 · ${bundle.pieces.length} 件装备`);
  for (const p of bundle.pieces) {
    const n0 = p.normalLines.slice(0, 2).join(' ');
    const nRest = p.normalLines.length > 2 ? '…' : '';
    const r0 = p.rareLines.map((s) => `【${s}】`).join('');
    const setHint = p.setName ? ` · ${p.setName}` : '';
    lines.push(`〔${p.tierName}〕${p.displayName} · ${p.slotLabel}${setHint} ${n0}${nRest}${r0}`);
  }
  return lines.join('\n');
}
