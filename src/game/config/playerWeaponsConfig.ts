/**
 * 局内 20 种主武器表：冷却/伤害/弹数/散布/穿透等为相对 `RIFLE_*` 常量的倍率或加性穿透；与升级卡「散射」「射速」叠乘
 */

/** 武器键，与 `PLAYER_WEAPON_ORDER` 顺序一致供 Q/E 循环 */
export type PlayerWeaponKind =
  | 'type38'
  | 'mauser_c96'
  | 'hanyang_88'
  | 'zhongzheng'
  | 'thompson'
  | 'double_barrel'
  | 'mosin_style'
  | 'burp_gun'
  | 'colt_revolver'
  | 'lever_action'
  | 'hunting_musket'
  | 'heavy_crossbow'
  | 'pepperbox'
  | 'anti_tank_rifle'
  | 'bren_style'
  | 'pistol_fast'
  | 'sawn_off'
  | 'throwing_blade'
  | 'red_tassel_dart'
  | 'iron_pipe_gun';

/** 无商店配装时的默认主武器（三八式）；与 `PLAYER_WEAPON_ORDER[0]` 一致 */
export const DEFAULT_PLAYER_WEAPON_KIND: PlayerWeaponKind = 'type38';

/** 单种武器数值与文案 */
export interface PlayerWeaponDef {
  kind: PlayerWeaponKind;
  /** HUD / 图鉴标题 */
  displayName: string;
  /** 图鉴列表一行说明 */
  codexSummary: string;
  /**
   * 射击间隔 = `RIFLE_COOLDOWN_SEC × cooldownScale ÷ rifleAttackSpeedMult × 宝箱扳机等`
   * 大于 1 更慢，小于 1 更快
   */
  cooldownScale: number;
  /** × `RIFLE_BASE_DAMAGE`，再叠全局 `damageMultiplier`、宝箱等 */
  damageMult: number;
  /** × `RIFLE_BULLET_SPEED` */
  bulletSpeedMult: number;
  /** × `RIFLE_BULLET_RADIUS`（再叠宝箱粗弹头等） */
  bulletRadiusMult: number;
  /**
   * 武器固有弹丸数；升级卡 `rifleBulletCount` 在 1 的基础上每 +1 多一发，总上限 12
   */
  baseBulletCount: number;
  /** 多发时以瞄准角为中心的扇形半宽（弧度） */
  spreadRad: number;
  /**
   * 额外可连续命中的敌人数：0 即命中即消；1 表示最多穿 2 名敌人，依此类推
   */
  pierceExtra: number;
  /** 世界层弹丸填充色（RGB） */
  bulletColor: number;
}

/** 全表：抗日敌后题材命名，手感区分射速/单发/霰弹/穿透 */
export const PLAYER_WEAPON_DEFS: Record<PlayerWeaponKind, PlayerWeaponDef> = {
  type38: {
    kind: 'type38',
    displayName: '三八式步枪',
    codexSummary: '均衡标尺：射速与单发兼顾，默认武装。',
    cooldownScale: 1,
    damageMult: 1,
    bulletSpeedMult: 1,
    bulletRadiusMult: 1,
    baseBulletCount: 1,
    spreadRad: 0.11,
    pierceExtra: 0,
    bulletColor: 0xfff3b0,
  },
  mauser_c96: {
    kind: 'mauser_c96',
    displayName: '驳壳枪',
    codexSummary: '连扣快射，单发偏弱，双点射压制。',
    cooldownScale: 0.52,
    damageMult: 0.62,
    bulletSpeedMult: 0.96,
    bulletRadiusMult: 0.88,
    baseBulletCount: 2,
    spreadRad: 0.09,
    pierceExtra: 0,
    bulletColor: 0xddb892,
  },
  hanyang_88: {
    kind: 'hanyang_88',
    displayName: '汉阳造',
    codexSummary: '老式单发，略慢略狠，适合点杀。',
    cooldownScale: 1.12,
    damageMult: 1.14,
    bulletSpeedMult: 1.02,
    bulletRadiusMult: 1,
    baseBulletCount: 1,
    spreadRad: 0.06,
    pierceExtra: 0,
    bulletColor: 0xc4a574,
  },
  zhongzheng: {
    kind: 'zhongzheng',
    displayName: '中正式',
    codexSummary: '制式步枪，单发稳重，伤害略高。',
    cooldownScale: 1.06,
    damageMult: 1.18,
    bulletSpeedMult: 1.04,
    bulletRadiusMult: 0.98,
    baseBulletCount: 1,
    spreadRad: 0.05,
    pierceExtra: 0,
    bulletColor: 0xd8c898,
  },
  thompson: {
    kind: 'thompson',
    displayName: '手提机枪',
    codexSummary: '泼水压制，弹丸多、单发轻。',
    cooldownScale: 0.42,
    damageMult: 0.36,
    bulletSpeedMult: 1,
    bulletRadiusMult: 0.72,
    baseBulletCount: 5,
    spreadRad: 0.19,
    pierceExtra: 0,
    bulletColor: 0xb87333,
  },
  double_barrel: {
    kind: 'double_barrel',
    displayName: '双管猎枪',
    codexSummary: '扇面霰弹，近距清场，射速慢。',
    cooldownScale: 1.05,
    damageMult: 0.38,
    bulletSpeedMult: 0.92,
    bulletRadiusMult: 0.95,
    baseBulletCount: 8,
    spreadRad: 0.34,
    pierceExtra: 0,
    bulletColor: 0x8b5a2b,
  },
  mosin_style: {
    kind: 'mosin_style',
    displayName: '骑步枪',
    codexSummary: '长弹高速，可贯穿一名敌人。',
    cooldownScale: 1.48,
    damageMult: 1.42,
    bulletSpeedMult: 1.14,
    bulletRadiusMult: 0.82,
    baseBulletCount: 1,
    spreadRad: 0.03,
    pierceExtra: 1,
    bulletColor: 0x8899aa,
  },
  burp_gun: {
    kind: 'burp_gun',
    displayName: '冲锋枪',
    codexSummary: '短点射四连，高射速扫线。',
    cooldownScale: 0.4,
    damageMult: 0.4,
    bulletSpeedMult: 1.02,
    bulletRadiusMult: 0.78,
    baseBulletCount: 4,
    spreadRad: 0.14,
    pierceExtra: 0,
    bulletColor: 0x997755,
  },
  colt_revolver: {
    kind: 'colt_revolver',
    displayName: '左轮',
    codexSummary: '一轮六响，扇形散布，单发尚可。',
    cooldownScale: 1.18,
    damageMult: 0.52,
    bulletSpeedMult: 1,
    bulletRadiusMult: 0.92,
    baseBulletCount: 6,
    spreadRad: 0.21,
    pierceExtra: 0,
    bulletColor: 0x556688,
  },
  lever_action: {
    kind: 'lever_action',
    displayName: '拉杆猎枪',
    codexSummary: '杠杆速射两连，中距折中。',
    cooldownScale: 0.68,
    damageMult: 0.82,
    bulletSpeedMult: 1.03,
    bulletRadiusMult: 1,
    baseBulletCount: 2,
    spreadRad: 0.1,
    pierceExtra: 0,
    bulletColor: 0x8b6914,
  },
  hunting_musket: {
    kind: 'hunting_musket',
    displayName: '土抬杆',
    codexSummary: '猎户改军械，单发沉、弹体大。',
    cooldownScale: 1.38,
    damageMult: 1.52,
    bulletSpeedMult: 0.86,
    bulletRadiusMult: 1.18,
    baseBulletCount: 1,
    spreadRad: 0.04,
    pierceExtra: 0,
    bulletColor: 0x6b5a4a,
  },
  heavy_crossbow: {
    kind: 'heavy_crossbow',
    displayName: '重弩',
    codexSummary: '弩箭迟滞但狠，可串三名敌人。',
    cooldownScale: 2.05,
    damageMult: 1.88,
    bulletSpeedMult: 0.72,
    bulletRadiusMult: 1.05,
    baseBulletCount: 1,
    spreadRad: 0.02,
    pierceExtra: 2,
    bulletColor: 0x4a3020,
  },
  pepperbox: {
    kind: 'pepperbox',
    displayName: '多管独撅',
    codexSummary: '一次喷七丸，近距抽奖。',
    cooldownScale: 0.55,
    damageMult: 0.32,
    bulletSpeedMult: 0.9,
    bulletRadiusMult: 0.68,
    baseBulletCount: 7,
    spreadRad: 0.24,
    pierceExtra: 0,
    bulletColor: 0xaa6633,
  },
  anti_tank_rifle: {
    kind: 'anti_tank_rifle',
    displayName: '战防枪',
    codexSummary: '单发巨弹，极慢极强，穿甲手感。',
    cooldownScale: 2.85,
    damageMult: 3.35,
    bulletSpeedMult: 1.22,
    bulletRadiusMult: 1.55,
    baseBulletCount: 1,
    spreadRad: 0,
    pierceExtra: 0,
    bulletColor: 0x2a2a3a,
  },
  bren_style: {
    kind: 'bren_style',
    displayName: '轻机枪',
    codexSummary: '短三连点，略低于手提机枪射速。',
    cooldownScale: 0.46,
    damageMult: 0.46,
    bulletSpeedMult: 1.01,
    bulletRadiusMult: 0.8,
    baseBulletCount: 3,
    spreadRad: 0.11,
    pierceExtra: 0,
    bulletColor: 0x5c6b3a,
  },
  pistol_fast: {
    kind: 'pistol_fast',
    displayName: '快机手枪',
    codexSummary: '三连速射，游走补刀。',
    cooldownScale: 0.48,
    damageMult: 0.55,
    bulletSpeedMult: 1,
    bulletRadiusMult: 0.85,
    baseBulletCount: 3,
    spreadRad: 0.11,
    pierceExtra: 0,
    bulletColor: 0x777788,
  },
  sawn_off: {
    kind: 'sawn_off',
    displayName: '截短喷',
    codexSummary: '锯短枪管，六丸宽扇，贴身爆发。',
    cooldownScale: 0.92,
    damageMult: 0.35,
    bulletSpeedMult: 0.88,
    bulletRadiusMult: 1.12,
    baseBulletCount: 6,
    spreadRad: 0.3,
    pierceExtra: 0,
    bulletColor: 0x886644,
  },
  throwing_blade: {
    kind: 'throwing_blade',
    displayName: '飞刀',
    codexSummary: '双刃连投，可穿两人。',
    cooldownScale: 0.62,
    damageMult: 0.68,
    bulletSpeedMult: 1.08,
    bulletRadiusMult: 0.7,
    baseBulletCount: 2,
    spreadRad: 0.07,
    pierceExtra: 1,
    bulletColor: 0xc0c0d8,
  },
  red_tassel_dart: {
    kind: 'red_tassel_dart',
    displayName: '红缨镖',
    codexSummary: '梭镖直刺，快而准，可双穿。',
    cooldownScale: 1.02,
    damageMult: 1.12,
    bulletSpeedMult: 1.22,
    bulletRadiusMult: 0.62,
    baseBulletCount: 1,
    spreadRad: 0.02,
    pierceExtra: 1,
    bulletColor: 0xd04040,
  },
  iron_pipe_gun: {
    kind: 'iron_pipe_gun',
    displayName: '铁匠土铳',
    codexSummary: '铁管灌药，单发粗重，伤害高弹慢。',
    cooldownScale: 1.52,
    damageMult: 1.58,
    bulletSpeedMult: 0.8,
    bulletRadiusMult: 1.22,
    baseBulletCount: 1,
    spreadRad: 0.05,
    pierceExtra: 0,
    bulletColor: 0x333322,
  },
};

/** Q/E 循环顺序（长度须与种类数一致） */
export const PLAYER_WEAPON_ORDER: readonly PlayerWeaponKind[] = [
  'type38',
  'mauser_c96',
  'hanyang_88',
  'zhongzheng',
  'thompson',
  'double_barrel',
  'mosin_style',
  'burp_gun',
  'colt_revolver',
  'lever_action',
  'hunting_musket',
  'heavy_crossbow',
  'pepperbox',
  'anti_tank_rifle',
  'bren_style',
  'pistol_fast',
  'sawn_off',
  'throwing_blade',
  'red_tassel_dart',
  'iron_pipe_gun',
] as const;

/** 由索引取表项（循环切换用） */
export function playerWeaponKindAtIndex(index: number): PlayerWeaponKind {
  const n = PLAYER_WEAPON_ORDER.length;
  const i = ((index % n) + n) % n;
  return PLAYER_WEAPON_ORDER[i]!;
}
