/**
 * 护具 / 战术配件表（历史/图鉴占位）；局外加成已改为九部位紫箱装备词条聚合
 */

/** 护具槽 id */
export type ArmorGearId =
  | 'cloth_tunic'
  | 'padded_vest'
  | 'leather_jerkin'
  | 'steel_insert'
  | 'winter_coat';

/** 战术配件槽 id */
export type TacticalGearId =
  | 'basic_pouch'
  | 'ammo_bandolier'
  | 'field_glass'
  | 'magnet_hook'
  | 'gaiter_wrap';

/** 护具单件：承伤乘子 <1 减伤；可选生命与移速 */
export interface ArmorGearDef {
  id: ArmorGearId;
  displayName: string;
  codexSummary: string;
  meritPrice: number;
  /** 叠在局内 `profileDamageTakenMult`（再与宝箱等相乘） */
  damageTakenMult?: number;
  maxHpAdd?: number;
  moveSpeedMult?: number;
}

/** 战术配件：射速/暴击/拾取/移速等，叠在开局基准上 */
export interface TacticalGearDef {
  id: TacticalGearId;
  displayName: string;
  codexSummary: string;
  meritPrice: number;
  /** 乘在 `rifleAttackSpeedMult` 上，>1 射更快 */
  rifleAttackSpeedMult?: number;
  critChanceAdd?: number;
  pickupRadiusAdd?: number;
  moveSpeedMult?: number;
}

/** 免费默认护具 */
export const DEFAULT_ARMOR_ID: ArmorGearId = 'cloth_tunic';

/** 免费默认战术 */
export const DEFAULT_TACTICAL_ID: TacticalGearId = 'basic_pouch';

export const ARMOR_GEAR_ORDER: readonly ArmorGearId[] = [
  'cloth_tunic',
  'padded_vest',
  'leather_jerkin',
  'steel_insert',
  'winter_coat',
];

export const TACTICAL_GEAR_ORDER: readonly TacticalGearId[] = [
  'basic_pouch',
  'ammo_bandolier',
  'field_glass',
  'magnet_hook',
  'gaiter_wrap',
];

export const ARMOR_GEAR_DEFS: Record<ArmorGearId, ArmorGearDef> = {
  cloth_tunic: {
    id: 'cloth_tunic',
    displayName: '粗布袄',
    codexSummary: '根据地常见装束，无额外防护。',
    meritPrice: 0,
  },
  padded_vest: {
    id: 'padded_vest',
    displayName: '棉马甲',
    codexSummary: '夹层缓冲，略增厚血条。',
    meritPrice: 95,
    maxHpAdd: 12,
  },
  leather_jerkin: {
    id: 'leather_jerkin',
    displayName: '皮坎肩',
    codexSummary: '软皮分散冲击，略减所受伤害。',
    meritPrice: 175,
    damageTakenMult: 0.94,
  },
  steel_insert: {
    id: 'steel_insert',
    displayName: '插钢板',
    codexSummary: '胸前衬板，减伤明显但略沉。',
    meritPrice: 310,
    damageTakenMult: 0.87,
    moveSpeedMult: 0.96,
  },
  winter_coat: {
    id: 'winter_coat',
    displayName: '厚棉袍',
    codexSummary: '御寒厚棉，生命与防护兼顾。',
    meritPrice: 240,
    maxHpAdd: 18,
    damageTakenMult: 0.96,
  },
};

export const TACTICAL_GEAR_DEFS: Record<TacticalGearId, TacticalGearDef> = {
  basic_pouch: {
    id: 'basic_pouch',
    displayName: '随身皮囊',
    codexSummary: '仅装杂物，无战斗加成。',
    meritPrice: 0,
  },
  ammo_bandolier: {
    id: 'ammo_bandolier',
    displayName: '弹带',
    codexSummary: '取弹顺手，略提射速。',
    meritPrice: 88,
    rifleAttackSpeedMult: 1.07,
  },
  field_glass: {
    id: 'field_glass',
    displayName: '望远具',
    codexSummary: '索敌更清晰，略增暴击率。',
    meritPrice: 155,
    critChanceAdd: 0.04,
  },
  magnet_hook: {
    id: 'magnet_hook',
    displayName: '磁力挂扣',
    codexSummary: '吸住近处宝石，扩大拾取范围。',
    meritPrice: 125,
    pickupRadiusAdd: 16,
  },
  gaiter_wrap: {
    id: 'gaiter_wrap',
    displayName: '绑腿束带',
    codexSummary: '长途奔袭更省力。',
    meritPrice: 72,
    moveSpeedMult: 1.045,
  },
};
