/**
 * S 级及以上装备可归属套装：三件 / 六件 / 九件阶段性加成（文案向；数值可由局外系统接入）
 */

/** 单套装定义 */
export interface GearSetDef {
  id: string;
  name: string;
  /** 穿戴 3 件同套 */
  bonus3: string;
  /** 穿戴 6 件同套 */
  bonus6: string;
  /** 穿戴 9 件同套 */
  bonus9: string;
}

/** 与 `gearEquipmentCatalog` 中 `setId` 对应 */
export const GEAR_SET_DEFS: readonly GearSetDef[] = [
  {
    id: 'set_tiexue',
    name: '铁血先锋',
    bonus3: '造成伤害 +5%',
    bonus6: '受到伤害 -8%，移速 +4%',
    bonus9: '生命低于 40% 时暴击率 +12%，直至回到 55% 以上',
  },
  {
    id: 'set_yexi',
    name: '暗影猎手',
    bonus3: '暴击伤害 +8%',
    bonus6: '穿透几率 +6%，拾取半径 +12',
    bonus9: '首次进入战斗后 8s 内射速 +15%',
  },
  {
    id: 'set_judi',
    name: '根据地之光',
    bonus3: '经验获取 +6%',
    bonus6: '宝箱增益 +10%，经验获取 +6%',
    bonus9: '全属性词条效果 +5%（含普通与稀有描述类）',
  },
];

/** 按套装 id 取定义，未找到返回 undefined */
export function getGearSetDefById(id: string): GearSetDef | undefined {
  return GEAR_SET_DEFS.find((s) => s.id === id);
}
