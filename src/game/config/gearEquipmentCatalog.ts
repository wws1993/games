/**
 * 紫箱装备配置表：200 条独立条目；掉落时按部位 + 等阶从表中随机；S/SS/SSS 部分绑定套装 id（见 `gearSetConfig`）
 */

import type { GearGradeId } from './gearGradeConfig';
import type { GearDropSlotId } from './gearSlotTypes';

/** 单条装备模板 */
export interface GearEquipmentCatalogEntry {
  id: string;
  displayName: string;
  slot: GearDropSlotId;
  grade: GearGradeId;
  /** S 及以上可为套装件；非套装为 null */
  setId: string | null;
}

const SLOTS: readonly GearDropSlotId[] = [
  'helmet',
  'torso',
  'shoulder',
  'primary',
  'secondary',
  'hands',
  'belt',
  'boots',
  'trinket',
];

const SLOT_TAG = ['盔', '衣', '肩', '武', '副', '手', '带', '靴', '饰'] as const;

/** 构建 200 条：27 件套装 + 173 件散件，保证每部位×等阶池非空 */
function buildGearEquipmentCatalog(): GearEquipmentCatalogEntry[] {
  const out: GearEquipmentCatalogEntry[] = [];
  let n = 0;
  const nid = (): string => `ge_${String(++n).padStart(3, '0')}`;

  const setRows: readonly { setId: string; prefix: string; grade: GearGradeId }[] = [
    { setId: 'set_tiexue', prefix: '铁血', grade: 'S' },
    { setId: 'set_yexi', prefix: '夜袭', grade: 'SS' },
    { setId: 'set_judi', prefix: '根据地', grade: 'SSS' },
  ];
  const setPart = ['钢盔', '胸甲', '护肩', '主战火器', '副武器', '护手', '武装带', '军靴', '纪念章'];

  for (let s = 0; s < setRows.length; s++) {
    const row = setRows[s]!;
    for (let i = 0; i < 9; i++) {
      out.push({
        id: nid(),
        displayName: `${row.prefix}·${setPart[i]}`,
        slot: SLOTS[i]!,
        grade: row.grade,
        setId: row.setId,
      });
    }
  }

  /** 按部位轮转写入若干条同阶散件 */
  const addRotating = (grade: GearGradeId, total: number, label: (slotIdx: number, seq: number) => string): void => {
    let slotIdx = 0;
    for (let k = 0; k < total; k++) {
      const seq = Math.floor(k / 9);
      out.push({
        id: nid(),
        displayName: label(slotIdx, seq),
        slot: SLOTS[slotIdx]!,
        grade,
        setId: null,
      });
      slotIdx = (slotIdx + 1) % 9;
    }
  };

  addRotating('E', 45, (si, seq) => `民兵${SLOT_TAG[si]}·${seq + 1}`);
  addRotating('D', 40, (si, seq) => `补给${SLOT_TAG[si]}·${seq + 1}`);
  addRotating('C', 35, (si, seq) => `制式${SLOT_TAG[si]}·${seq + 1}`);
  addRotating('B', 30, (si, seq) => `加强${SLOT_TAG[si]}·${seq + 1}`);
  addRotating('A', 23, (si, seq) => `精锐${SLOT_TAG[si]}·${seq + 1}`);

  return out;
}

/** 全表只读，供掉落检索 */
export const GEAR_EQUIPMENT_CATALOG: readonly GearEquipmentCatalogEntry[] = buildGearEquipmentCatalog();

/** 按部位 + 等阶随机一条；表内已保证池非空 */
export function pickRandomCatalogEntry(slot: GearDropSlotId, grade: GearGradeId): GearEquipmentCatalogEntry {
  const pool = GEAR_EQUIPMENT_CATALOG.filter((e) => e.slot === slot && e.grade === grade);
  return pool[Math.floor(Math.random() * pool.length)]!;
}
