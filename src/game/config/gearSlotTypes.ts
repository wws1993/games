/**
 * 紫箱 / 装备掉落九部位：与装备页身位一致，供 `gearAffixConfig`、`gearEquipmentCatalog` 共用，避免循环依赖
 */

/** 九部位 id */
export type GearDropSlotId =
  | 'helmet'
  | 'torso'
  | 'shoulder'
  | 'primary'
  | 'secondary'
  | 'hands'
  | 'belt'
  | 'boots'
  | 'trinket';

/** 单部位元数据：中文名供 HUD / 卡片 */
export const GEAR_DROP_SLOT_ORDER: readonly { id: GearDropSlotId; label: string }[] = [
  { id: 'helmet', label: '头盔' },
  { id: 'torso', label: '躯干' },
  { id: 'shoulder', label: '护肩' },
  { id: 'primary', label: '主战武装' },
  { id: 'secondary', label: '副武器' },
  { id: 'hands', label: '护手' },
  { id: 'belt', label: '腰带' },
  { id: 'boots', label: '战靴' },
  { id: 'trinket', label: '饰物' },
];
