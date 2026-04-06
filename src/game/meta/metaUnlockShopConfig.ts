/**
 * 局外商店：角色外观矢量配色、武器枪皮（木托/金属/弹丸色）；主武器由紫箱掉落解锁，非金币购买
 */


/** 与 `PlayerWorldVisual` 矢量小人一致的配色字段 */
export interface PlayerVectorPalette {
  uniformBody: number;
  uniformShadow: number;
  skin: number;
  capBody: number;
  capBrim: number;
  capStar: number;
  belt: number;
  legCloth: number;
  outline: number;
}

/** 默认八路军灰蓝（与历史 `playerWorldVisual` 常量一致） */
export const DEFAULT_PLAYER_VECTOR_PALETTE: PlayerVectorPalette = {
  uniformBody: 0x5c6d7c,
  uniformShadow: 0x4a5a68,
  skin: 0xc49a78,
  capBody: 0x3a4858,
  capBrim: 0x2a3442,
  capStar: 0xd82828,
  belt: 0x4a3828,
  legCloth: 0x3a342c,
  outline: 0x2a2218,
};

/** 单套可购买角色外观 */
export interface CharacterSkinShopDef {
  /** 存档用 id，与 `PlayerProfileSave.unlockedCharacterIds` 一致 */
  id: string;
  /** 商店展示名 */
  name: string;
  /** 短说明 */
  description: string;
  /** 金币价格；0 为默认赠送 */
  costCoins: number;
  /** 矢量配色 */
  palette: PlayerVectorPalette;
}

/** 默认可用：八路军经典 */
export const DEFAULT_CHARACTER_SKIN_ID = 'char_default';

/** 可解锁角色外观（首项必须 id=`DEFAULT_CHARACTER_SKIN_ID` 且 cost=0） */
export const CHARACTER_SKIN_SHOP_DEFS: readonly CharacterSkinShopDef[] = [
  {
    id: DEFAULT_CHARACTER_SKIN_ID,
    name: '敌后武工队',
    description: '灰蓝粗布、八角帽红星，经典造型。',
    costCoins: 0,
    palette: DEFAULT_PLAYER_VECTOR_PALETTE,
  },
  {
    id: 'char_olive',
    name: '青灰游击',
    description: '偏橄榄绿被服，便于林地隐蔽。',
    costCoins: 180,
    palette: {
      uniformBody: 0x4a5c48,
      uniformShadow: 0x3a4a38,
      skin: 0xb88a68,
      capBody: 0x2d4034,
      capBrim: 0x243028,
      capStar: 0xe03028,
      belt: 0x3a3020,
      legCloth: 0x2e2c24,
      outline: 0x1c1810,
    },
  },
  {
    id: 'char_winter',
    name: '雪地侦察',
    description: '浅色披挂与帽，雪地轮廓略浅。',
    costCoins: 420,
    palette: {
      uniformBody: 0x7a8a98,
      uniformShadow: 0x5c6a78,
      skin: 0xd0a890,
      capBody: 0x5a6878,
      capBrim: 0x485058,
      capStar: 0xf04038,
      belt: 0x5a5048,
      legCloth: 0x4a4850,
      outline: 0x2a2830,
    },
  },
  {
    id: 'char_sand',
    name: '沙地黄',
    description: '土黄被服与深褐帽，荒漠与土坡伪装。',
    costCoins: 320,
    palette: {
      uniformBody: 0x8a7848,
      uniformShadow: 0x6a5838,
      skin: 0xc89868,
      capBody: 0x5a4830,
      capBrim: 0x403020,
      capStar: 0xe83828,
      belt: 0x4a3828,
      legCloth: 0x3a3428,
      outline: 0x221810,
    },
  },
  {
    id: 'char_night_ops',
    name: '夜袭深青',
    description: '深蓝灰被服，低光环境下轮廓更收。',
    costCoins: 560,
    palette: {
      uniformBody: 0x2c3848,
      uniformShadow: 0x1c2834,
      skin: 0xa88870,
      capBody: 0x1a2430,
      capBrim: 0x101820,
      capStar: 0xc82820,
      belt: 0x302820,
      legCloth: 0x242018,
      outline: 0x100c08,
    },
  },
  {
    id: 'char_rust',
    name: '铁锈褐',
    description: '棕褐染布偏暖，泥尘与锈迹不显脏。',
    costCoins: 260,
    palette: {
      uniformBody: 0x6a5040,
      uniformShadow: 0x4a3828,
      skin: 0xb89078,
      capBody: 0x483028,
      capBrim: 0x382018,
      capStar: 0xe02018,
      belt: 0x403428,
      legCloth: 0x322c24,
      outline: 0x1c1410,
    },
  },
];

/** 枪皮：仅影响木托/金属与弹丸着色；`bulletColor` 为 null 时沿用武器表 `bulletColor` */
export interface WeaponCosmeticShopDef {
  id: string;
  name: string;
  description: string;
  costCoins: number;
  gunWood: number;
  gunMetal: number;
  /** 非 null 时局内弹丸 `displayColor` 用此值（与武器种类解耦的纯外观） */
  bulletColor: number | null;
}

export const DEFAULT_WEAPON_COSMETIC_ID = 'ws_default';

export const WEAPON_COSMETIC_SHOP_DEFS: readonly WeaponCosmeticShopDef[] = [
  {
    id: DEFAULT_WEAPON_COSMETIC_ID,
    name: '原装木托',
    description: '缴获啥样就啥样。',
    costCoins: 0,
    gunWood: 0x4a3528,
    gunMetal: 0x2c3238,
    bulletColor: null,
  },
  {
    id: 'ws_brass',
    name: '黄铜件',
    description: '木托略红、机匣偏黄铜色，弹头偏琥珀高光。',
    costCoins: 220,
    gunWood: 0x5c4030,
    gunMetal: 0xb89840,
    bulletColor: 0xe8c060,
  },
  {
    id: 'ws_steel_blue',
    name: '烤蓝钢',
    description: '冷蓝机匣，弹头银蓝。',
    costCoins: 380,
    gunWood: 0x3a3028,
    gunMetal: 0x3a4a58,
    bulletColor: 0xa8c0d8,
  },
  {
    id: 'ws_copper',
    name: '铜绿机匣',
    description: '木托偏栗、机匣氧化铜绿，弹头偏青金。',
    costCoins: 300,
    gunWood: 0x4c3828,
    gunMetal: 0x4a6858,
    bulletColor: 0x88c0a0,
  },
  {
    id: 'ws_obsidian',
    name: '黑曜木',
    description: '深炭木托与近黑机匣，弹头冷灰。',
    costCoins: 480,
    gunWood: 0x1c1814,
    gunMetal: 0x2a2c30,
    bulletColor: 0x889098,
  },
  {
    id: 'ws_tracer',
    name: '曳光橙',
    description: '暖色木纹、枪身略锈橙，弹头亮橙易辨认。',
    costCoins: 620,
    gunWood: 0x5a4030,
    gunMetal: 0x8a5030,
    bulletColor: 0xff9040,
  },
];

