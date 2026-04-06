/**
 * 紫箱装备掉落：件数随怪等级 1～5；等阶 E～B 无词条，A=1 / S=2 / SS=3 / SSS=4 条；属性与词条等级（T1～T4）随机；配置表见 `gearEquipmentCatalog`
 */

import { pickRandomCatalogEntry } from './gearEquipmentCatalog';
import type { GearGradeId } from './gearGradeConfig';
import {
  GEAR_GRADE_VISUAL,
  rollGearGradeForDrop,
  rollPurpleChestPieceCount,
  totalAffixLinesForGrade,
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

/** 词条等级上限（与 `rollAffixTier` 一致） */
const AFFIX_TIER_MAX = 4;

/** 稀有词条 id 集合，用于拆分展示行 */
const RARE_AFFIX_ID_SET: ReadonlySet<string> = new Set(GEAR_RARE_AFFIX_DEFS.map((d) => d.id));

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

/** 词条 id → 配置，供装备页比对与格式化 */
const GEAR_AFFIX_DEF_BY_ID: ReadonlyMap<string, GearNormalAffixDef | GearRareAffixDef> = (() => {
  const m = new Map<string, GearNormalAffixDef | GearRareAffixDef>();
  for (const d of GEAR_NORMAL_AFFIX_DEFS) {
    m.set(d.id, d);
  }
  for (const d of GEAR_RARE_AFFIX_DEFS) {
    m.set(d.id, d);
  }
  return m;
})();

/**
 * 词条短名（表头用）：含 `{0}` 的模板取占位符前一段，否则为整句文案
 * @param id - `affixStatTotals` 键
 */
export function getAffixIdShortLabel(id: string): string {
  const d = GEAR_AFFIX_DEF_BY_ID.get(id);
  if (!d) {
    return id;
  }
  const t = d.labelTpl;
  const i = t.indexOf('{0}');
  if (i >= 0) {
    return t.slice(0, i).replace(/\s+\+?\s*$/, '').trim();
  }
  return t;
}

/**
 * 将单件词条合计格式化为与掉落行一致的展示串（含稀有无数值词条）
 * @param id - `affixStatTotals` 键
 * @param raw - 该 id 合计 roll 值
 */
export function formatAffixStatLineForDisplay(id: string, raw: number): string {
  const d = GEAR_AFFIX_DEF_BY_ID.get(id);
  if (!d) {
    return `${id}: ${raw.toFixed(3)}`;
  }
  if (d.min === undefined || d.max === undefined) {
    return raw < 0.5 ? '—' : d.labelTpl;
  }
  return formatAffixLineFromRaw(d, raw);
}

/**
 * 合并两件装备的词条 id 并按配置表顺序排序，未知 id 按字典序排在末尾
 * @param a - 第一件 `affixStatTotals`
 * @param b - 第二件 `affixStatTotals`
 */
export function sortedAffixIdsFromTwoTotals(
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>,
): string[] {
  const ids = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  const order = [...GEAR_NORMAL_AFFIX_DEFS.map((x) => x.id), ...GEAR_RARE_AFFIX_DEFS.map((x) => x.id)];
  const out: string[] = [];
  for (const id of order) {
    if (ids.has(id)) {
      out.push(id);
      ids.delete(id);
    }
  }
  for (const id of Array.from(ids).sort()) {
    out.push(id);
  }
  return out;
}

/**
 * 装备比对「差」列：无数值区间的稀有词条用「获得/失去」，否则为数值差格式化
 * @param id - 词条 id
 * @param rawEq - 当前穿戴合计
 * @param rawCand - 备选件合计
 */
export function formatAffixCompareDeltaLine(id: string, rawEq: number, rawCand: number): string {
  const d = GEAR_AFFIX_DEF_BY_ID.get(id);
  if (!d) {
    const delta = rawCand - rawEq;
    return Math.abs(delta) < 1e-9 ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;
  }
  if (d.min === undefined || d.max === undefined) {
    const before = rawEq >= 0.5;
    const after = rawCand >= 0.5;
    if (before === after) {
      return '—';
    }
    return after ? '获得' : '失去';
  }
  const delta = rawCand - rawEq;
  if (Math.abs(delta) < 1e-9) {
    return '—';
  }
  if (d.unitPercent) {
    return `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(d.fractionDigits ?? 0)}%`;
  }
  if (d.fractionDigits !== undefined) {
    return `${delta >= 0 ? '+' : ''}${delta.toFixed(d.fractionDigits)}`;
  }
  return `${delta >= 0 ? '+' : ''}${Math.round(delta)}`;
}

/** 乘区词条：主值按 1+raw 两位小数展示（射速/伤害/移速/弹径），与「1.25」「.5↓」类读法一致 */
const AFFIX_MULT_IDS_SHOW_AS_ONE_PLUS: ReadonlySet<string> = new Set([
  'cd_pct',
  'dmg_pct',
  'move_pct',
  'bullet_r_pct',
]);

/** 去掉多余尾零后，将 0.x 写成 `.x` 便于行内紧凑排版 */
function compactPositiveDisplay(n: number, fractionDigits: number): string {
  let s = n.toFixed(fractionDigits);
  if (s.includes('.')) {
    s = s.replace(/\.?0+$/, '');
  }
  if (s.startsWith('0.')) {
    return s.slice(1);
  }
  return s;
}

/**
 * 装备比对单行中间段：展示用原始合计（无标签）；乘区 id 为倍率 1+raw；详情浮层主列一般为「候选件」合计
 * @param id - 词条 id
 * @param raw - 该 id 的合计 roll（如候选件或已穿戴）
 */
export function formatAffixCompareCurrentValue(id: string, raw: number): string {
  const d = GEAR_AFFIX_DEF_BY_ID.get(id);
  if (!d) {
    return Math.abs(raw) < 1e-9 ? '—' : Number.isInteger(raw) ? String(raw) : raw.toFixed(2);
  }
  if (d.min === undefined || d.max === undefined) {
    return raw < 0.5 ? '—' : '✓';
  }
  if (AFFIX_MULT_IDS_SHOW_AS_ONE_PLUS.has(id)) {
    return (1 + raw).toFixed(2);
  }
  if (d.unitPercent) {
    return `${(raw * 100).toFixed(d.fractionDigits ?? 0)}%`;
  }
  if (d.fractionDigits !== undefined) {
    return raw.toFixed(d.fractionDigits);
  }
  return String(Math.round(raw));
}

/**
 * 装备比对行尾：相对当前穿戴的差值 + ↑/↓；无变化时返回空串（稀有开关类为「获↑」「失↓」）
 * @param id - 词条 id
 * @param rawEq - 当前穿戴合计
 * @param rawCand - 查看中的仓库件合计
 */
export function formatAffixCompareDeltaArrowSuffix(id: string, rawEq: number, rawCand: number): string {
  const d = GEAR_AFFIX_DEF_BY_ID.get(id);
  if (!d) {
    const delta = rawCand - rawEq;
    if (Math.abs(delta) < 1e-9) {
      return '';
    }
    return `${compactPositiveDisplay(Math.abs(delta), 2)}${delta > 0 ? '↑' : '↓'}`;
  }
  if (d.min === undefined || d.max === undefined) {
    const before = rawEq >= 0.5;
    const after = rawCand >= 0.5;
    if (before === after) {
      return '';
    }
    return after ? '获↑' : '失↓';
  }
  const delta = rawCand - rawEq;
  if (Math.abs(delta) < 1e-9) {
    return '';
  }
  const up = delta > 0;
  const abs = Math.abs(delta);
  if (AFFIX_MULT_IDS_SHOW_AS_ONE_PLUS.has(id)) {
    return `${compactPositiveDisplay(abs, 2)}${up ? '↑' : '↓'}`;
  }
  if (d.unitPercent) {
    const fd = d.fractionDigits ?? 0;
    let mag = (abs * 100).toFixed(fd);
    if (mag.includes('.')) {
      mag = mag.replace(/\.?0+$/, '');
    }
    if (mag.startsWith('0.')) {
      mag = mag.slice(1);
    }
    return `${mag}${up ? '↑' : '↓'}`;
  }
  if (d.fractionDigits !== undefined) {
    return `${compactPositiveDisplay(abs, d.fractionDigits)}${up ? '↑' : '↓'}`;
  }
  return `${Math.round(abs)}${up ? '↑' : '↓'}`;
}

function mergeStatTotals(
  into: Record<string, number>,
  id: string,
  raw: number,
): void {
  into[id] = (into[id] ?? 0) + raw;
}

/** 随机词条等级 T1～T4（数值落在该档对应 `min`～`max` 子区间内） */
function rollAffixTier(): number {
  return 1 + Math.floor(Math.random() * AFFIX_TIER_MAX);
}

/**
 * 按等级在 `def` 的区间内取子段并 uniform 抽样；无数值稀有词条写入等级作层数合计
 */
function rollRawInTierBand(def: GearNormalAffixDef | GearRareAffixDef, tier: number): number {
  if (def.min === undefined || def.max === undefined) {
    return tier;
  }
  const lo = def.min + (def.max - def.min) * ((tier - 1) / AFFIX_TIER_MAX);
  const hi = def.min + (def.max - def.min) * (tier / AFFIX_TIER_MAX);
  return lo + Math.random() * Math.max(1e-12, hi - lo);
}

/** 展示行末尾附词条等级，与 `rollAffixTier` 对应 */
function formatAffixLineWithTier(def: GearNormalAffixDef | GearRareAffixDef, raw: number, tier: number): string {
  const base =
    def.min === undefined || def.max === undefined ? def.labelTpl : formatAffixLineFromRaw(def, raw);
  return `${base} ·T${tier}`;
}

/**
 * 从普通+稀有合并池无重复优先抽取 `count` 条词条，每条随机属性与 T1～T4；不足条数时允许重复 id
 * @param count - `totalAffixLinesForGrade(等阶)`，E～B 为 0
 */
function pickUnifiedAffixRolls(count: number): {
  normalLines: string[];
  rareLines: string[];
  totals: Record<string, number>;
} {
  const totals: Record<string, number> = {};
  const normalLines: string[] = [];
  const rareLines: string[] = [];
  if (count <= 0) {
    return { normalLines, rareLines, totals };
  }
  const allDefs = [...GEAR_NORMAL_AFFIX_DEFS, ...GEAR_RARE_AFFIX_DEFS];
  shuffleInPlace(allDefs);
  const picked: (GearNormalAffixDef | GearRareAffixDef)[] = [];
  const seen = new Set<string>();
  for (const def of allDefs) {
    if (picked.length >= count) {
      break;
    }
    if (seen.has(def.id)) {
      continue;
    }
    seen.add(def.id);
    picked.push(def);
  }
  while (picked.length < count) {
    picked.push(allDefs[Math.floor(Math.random() * allDefs.length)]!);
  }
  for (const def of picked) {
    const tier = rollAffixTier();
    const raw = rollRawInTierBand(def, tier);
    mergeStatTotals(totals, def.id, raw);
    const line = formatAffixLineWithTier(def, raw, tier);
    if (RARE_AFFIX_ID_SET.has(def.id)) {
      rareLines.push(line);
    } else {
      normalLines.push(line);
    }
  }
  return { normalLines, rareLines, totals };
}

/** 按怪物等级随机部位（均匀） */
function rollRandomSlotRow(): (typeof GEAR_DROP_SLOT_ORDER)[number] {
  return GEAR_DROP_SLOT_ORDER[Math.floor(Math.random() * GEAR_DROP_SLOT_ORDER.length)]!;
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
    const affixCount = totalAffixLinesForGrade(grade);
    const roll = pickUnifiedAffixRolls(affixCount);
    const affixStatTotals = roll.totals;
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
      normalLines: roll.normalLines,
      rareLines: roll.rareLines,
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
