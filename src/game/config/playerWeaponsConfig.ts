/**
 * 局内主武器表：冷却/伤害/弹数/散布/穿透等为相对 `RIFLE_*` 常量的倍率或加性穿透；与升级卡「散射」「射速」叠乘；含手枪/步枪/冲锋枪等分类与近战扇形挥击
 */

/** 主武器玩法分类：手枪弹匣偏小、步枪均衡与索敌远、冲锋枪射速高、近战无弹体扇形挥击等 */
export type PlayerWeaponCategory =
  | 'rifle'
  | 'pistol'
  | 'smg'
  | 'lmg'
  | 'shotgun'
  | 'marksman'
  | 'sniper'
  | 'special'
  | 'crossbow'
  | 'thrown'
  | 'melee';

/** 分类在 HUD 等处的中文短标签，与 `PlayerWeaponCategory` 一一对应 */
export const PLAYER_WEAPON_CATEGORY_LABELS: Record<PlayerWeaponCategory, string> = {
  rifle: '步枪',
  pistol: '手枪',
  smg: '冲锋枪',
  lmg: '轻机枪',
  shotgun: '霰弹枪',
  marksman: '骑射/精确',
  sniper: '重型狙击',
  special: '特殊',
  crossbow: '弩',
  thrown: '投掷',
  melee: '近战',
};

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
  | 'iron_pipe_gun'
  | 'dao_broadsword'
  | 'spear_red_tassel'
  | 'bayonet_spike';

/** 默认开局主武器（三八式）；与 `PLAYER_WEAPON_ORDER[0]` 一致 */
export const DEFAULT_PLAYER_WEAPON_KIND: PlayerWeaponKind = 'type38';

/** 单种武器数值与文案 */
export interface PlayerWeaponDef {
  kind: PlayerWeaponKind;
  /** HUD 标题 */
  displayName: string;
  /** 玩法分类：决定索敌距离倾向与局内近战/射击分支 */
  category: PlayerWeaponCategory;
  /** 自动瞄准与扇形近战索敌共用：相对玩家的最大关注距离（像素），与 `profileRifleRangeAdd` 加算 */
  focusRangePx: number;
  /** 仅近战：扇形半角（弧度），以瞄准向为中线；升级「散射」与连发叠层会加宽 */
  meleeArcHalfRad?: number;
  /** 仅近战：挥击最远端距玩家中心的距离（像素），与敌人半径相加后做命中判定 */
  meleeRangePx?: number;
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
  /** 弹匣容量：每扣一发为一次齐射（与 `rifleCooldown` 一轮对应） */
  magazineSize: number;
  /**
   * 自空匣压满弹的换弹时间（秒）；乘 `rifleReloadSpeedMult`；战术换弹按缺弹比例折算时长
   */
  reloadSec: number;
}

/** 全表：抗日敌后题材命名，手感区分射速/单发/霰弹/穿透 */
export const PLAYER_WEAPON_DEFS: Record<PlayerWeaponKind, PlayerWeaponDef> = {
  type38: {
    kind: 'type38',
    displayName: '三八式步枪',
    category: 'rifle',
    focusRangePx: 420,
    cooldownScale: 1,
    damageMult: 1,
    bulletSpeedMult: 1,
    bulletRadiusMult: 1,
    baseBulletCount: 1,
    spreadRad: 0.11,
    pierceExtra: 0,
    bulletColor: 0xfff3b0,
    magazineSize: 5,
    reloadSec: 2.2,
  },
  mauser_c96: {
    kind: 'mauser_c96',
    displayName: '驳壳枪',
    category: 'pistol',
    focusRangePx: 300,
    cooldownScale: 0.52,
    damageMult: 0.62,
    bulletSpeedMult: 0.96,
    bulletRadiusMult: 0.88,
    baseBulletCount: 2,
    spreadRad: 0.09,
    pierceExtra: 0,
    bulletColor: 0xddb892,
    magazineSize: 10,
    reloadSec: 1.35,
  },
  hanyang_88: {
    kind: 'hanyang_88',
    displayName: '汉阳造',
    category: 'rifle',
    focusRangePx: 420,
    cooldownScale: 1.12,
    damageMult: 1.14,
    bulletSpeedMult: 1.02,
    bulletRadiusMult: 1,
    baseBulletCount: 1,
    spreadRad: 0.06,
    pierceExtra: 0,
    bulletColor: 0xc4a574,
    magazineSize: 5,
    reloadSec: 2.0,
  },
  zhongzheng: {
    kind: 'zhongzheng',
    displayName: '中正式',
    category: 'rifle',
    focusRangePx: 420,
    cooldownScale: 1.06,
    damageMult: 1.18,
    bulletSpeedMult: 1.04,
    bulletRadiusMult: 0.98,
    baseBulletCount: 1,
    spreadRad: 0.05,
    pierceExtra: 0,
    bulletColor: 0xd8c898,
    magazineSize: 5,
    reloadSec: 2.05,
  },
  thompson: {
    kind: 'thompson',
    displayName: '手提机枪',
    category: 'smg',
    focusRangePx: 390,
    cooldownScale: 0.42,
    damageMult: 0.36,
    bulletSpeedMult: 1,
    bulletRadiusMult: 0.72,
    baseBulletCount: 5,
    spreadRad: 0.19,
    pierceExtra: 0,
    bulletColor: 0xb87333,
    magazineSize: 30,
    reloadSec: 2.0,
  },
  double_barrel: {
    kind: 'double_barrel',
    displayName: '双管猎枪',
    category: 'shotgun',
    focusRangePx: 340,
    cooldownScale: 1.05,
    damageMult: 0.38,
    bulletSpeedMult: 0.92,
    bulletRadiusMult: 0.95,
    baseBulletCount: 8,
    spreadRad: 0.34,
    pierceExtra: 0,
    bulletColor: 0x8b5a2b,
    magazineSize: 2,
    reloadSec: 2.5,
  },
  mosin_style: {
    kind: 'mosin_style',
    displayName: '骑步枪',
    category: 'marksman',
    focusRangePx: 450,
    cooldownScale: 1.48,
    damageMult: 1.42,
    bulletSpeedMult: 1.14,
    bulletRadiusMult: 0.82,
    baseBulletCount: 1,
    spreadRad: 0.03,
    pierceExtra: 1,
    bulletColor: 0x8899aa,
    magazineSize: 5,
    reloadSec: 2.4,
  },
  burp_gun: {
    kind: 'burp_gun',
    displayName: '冲锋枪',
    category: 'smg',
    focusRangePx: 380,
    cooldownScale: 0.4,
    damageMult: 0.4,
    bulletSpeedMult: 1.02,
    bulletRadiusMult: 0.78,
    baseBulletCount: 4,
    spreadRad: 0.14,
    pierceExtra: 0,
    bulletColor: 0x997755,
    magazineSize: 35,
    reloadSec: 1.9,
  },
  colt_revolver: {
    kind: 'colt_revolver',
    displayName: '左轮',
    category: 'pistol',
    focusRangePx: 295,
    cooldownScale: 1.18,
    damageMult: 0.52,
    bulletSpeedMult: 1,
    bulletRadiusMult: 0.92,
    baseBulletCount: 6,
    spreadRad: 0.21,
    pierceExtra: 0,
    bulletColor: 0x556688,
    magazineSize: 6,
    reloadSec: 1.65,
  },
  lever_action: {
    kind: 'lever_action',
    displayName: '拉杆猎枪',
    category: 'rifle',
    focusRangePx: 410,
    cooldownScale: 0.68,
    damageMult: 0.82,
    bulletSpeedMult: 1.03,
    bulletRadiusMult: 1,
    baseBulletCount: 2,
    spreadRad: 0.1,
    pierceExtra: 0,
    bulletColor: 0x8b6914,
    magazineSize: 6,
    reloadSec: 2.0,
  },
  hunting_musket: {
    kind: 'hunting_musket',
    displayName: '土抬杆',
    category: 'special',
    focusRangePx: 400,
    cooldownScale: 1.38,
    damageMult: 1.52,
    bulletSpeedMult: 0.86,
    bulletRadiusMult: 1.18,
    baseBulletCount: 1,
    spreadRad: 0.04,
    pierceExtra: 0,
    bulletColor: 0x6b5a4a,
    magazineSize: 1,
    reloadSec: 2.2,
  },
  heavy_crossbow: {
    kind: 'heavy_crossbow',
    displayName: '重弩',
    category: 'crossbow',
    focusRangePx: 400,
    cooldownScale: 2.05,
    damageMult: 1.88,
    bulletSpeedMult: 0.72,
    bulletRadiusMult: 1.05,
    baseBulletCount: 1,
    spreadRad: 0.02,
    pierceExtra: 2,
    bulletColor: 0x4a3020,
    magazineSize: 1,
    reloadSec: 2.6,
  },
  pepperbox: {
    kind: 'pepperbox',
    displayName: '多管独撅',
    category: 'pistol',
    focusRangePx: 290,
    cooldownScale: 0.55,
    damageMult: 0.32,
    bulletSpeedMult: 0.9,
    bulletRadiusMult: 0.68,
    baseBulletCount: 7,
    spreadRad: 0.24,
    pierceExtra: 0,
    bulletColor: 0xaa6633,
    magazineSize: 6,
    reloadSec: 1.6,
  },
  anti_tank_rifle: {
    kind: 'anti_tank_rifle',
    displayName: '战防枪',
    category: 'sniper',
    focusRangePx: 500,
    cooldownScale: 2.85,
    damageMult: 3.35,
    bulletSpeedMult: 1.22,
    bulletRadiusMult: 1.55,
    baseBulletCount: 1,
    spreadRad: 0,
    pierceExtra: 0,
    bulletColor: 0x2a2a3a,
    magazineSize: 5,
    reloadSec: 3.2,
  },
  bren_style: {
    kind: 'bren_style',
    displayName: '轻机枪',
    category: 'lmg',
    focusRangePx: 400,
    cooldownScale: 0.46,
    damageMult: 0.46,
    bulletSpeedMult: 1.01,
    bulletRadiusMult: 0.8,
    baseBulletCount: 3,
    spreadRad: 0.11,
    pierceExtra: 0,
    bulletColor: 0x5c6b3a,
    magazineSize: 30,
    reloadSec: 2.6,
  },
  pistol_fast: {
    kind: 'pistol_fast',
    displayName: '快机手枪',
    category: 'pistol',
    focusRangePx: 310,
    cooldownScale: 0.48,
    damageMult: 0.55,
    bulletSpeedMult: 1,
    bulletRadiusMult: 0.85,
    baseBulletCount: 3,
    spreadRad: 0.11,
    pierceExtra: 0,
    bulletColor: 0x777788,
    magazineSize: 12,
    reloadSec: 1.5,
  },
  sawn_off: {
    kind: 'sawn_off',
    displayName: '截短喷',
    category: 'shotgun',
    focusRangePx: 330,
    cooldownScale: 0.92,
    damageMult: 0.35,
    bulletSpeedMult: 0.88,
    bulletRadiusMult: 1.12,
    baseBulletCount: 6,
    spreadRad: 0.3,
    pierceExtra: 0,
    bulletColor: 0x886644,
    magazineSize: 2,
    reloadSec: 2.4,
  },
  throwing_blade: {
    kind: 'throwing_blade',
    displayName: '飞刀',
    category: 'thrown',
    focusRangePx: 360,
    cooldownScale: 0.62,
    damageMult: 0.68,
    bulletSpeedMult: 1.08,
    bulletRadiusMult: 0.7,
    baseBulletCount: 2,
    spreadRad: 0.07,
    pierceExtra: 1,
    bulletColor: 0xc0c0d8,
    magazineSize: 8,
    reloadSec: 1.2,
  },
  red_tassel_dart: {
    kind: 'red_tassel_dart',
    displayName: '红缨镖',
    category: 'thrown',
    focusRangePx: 370,
    cooldownScale: 1.02,
    damageMult: 1.12,
    bulletSpeedMult: 1.22,
    bulletRadiusMult: 0.62,
    baseBulletCount: 1,
    spreadRad: 0.02,
    pierceExtra: 1,
    bulletColor: 0xd04040,
    magazineSize: 5,
    reloadSec: 1.5,
  },
  iron_pipe_gun: {
    kind: 'iron_pipe_gun',
    displayName: '铁匠土铳',
    category: 'special',
    focusRangePx: 380,
    cooldownScale: 1.52,
    damageMult: 1.58,
    bulletSpeedMult: 0.8,
    bulletRadiusMult: 1.22,
    baseBulletCount: 1,
    spreadRad: 0.05,
    pierceExtra: 0,
    bulletColor: 0x333322,
    magazineSize: 1,
    reloadSec: 2.8,
  },
  /** 大刀：宽弧、中等距离，弹匣为连续挥击段数 */
  dao_broadsword: {
    kind: 'dao_broadsword',
    displayName: '大刀',
    category: 'melee',
    focusRangePx: 128,
    meleeArcHalfRad: 0.88,
    meleeRangePx: 118,
    cooldownScale: 0.74,
    damageMult: 1.05,
    bulletSpeedMult: 1,
    bulletRadiusMult: 1,
    baseBulletCount: 1,
    spreadRad: 0,
    pierceExtra: 1,
    bulletColor: 0xc8b89c,
    magazineSize: 5,
    reloadSec: 1.25,
  },
  /** 红缨枪：刺击远、弧窄，略慢 */
  spear_red_tassel: {
    kind: 'spear_red_tassel',
    displayName: '红缨枪',
    category: 'melee',
    focusRangePx: 168,
    meleeArcHalfRad: 0.36,
    meleeRangePx: 158,
    cooldownScale: 0.98,
    damageMult: 1.22,
    bulletSpeedMult: 1,
    bulletRadiusMult: 1,
    baseBulletCount: 1,
    spreadRad: 0,
    pierceExtra: 2,
    bulletColor: 0x8b2323,
    magazineSize: 6,
    reloadSec: 1.45,
  },
  /** 拼刺刀：极短距离高攻速，弹匣小（连刺次数少） */
  bayonet_spike: {
    kind: 'bayonet_spike',
    displayName: '拼刺刀',
    category: 'melee',
    focusRangePx: 96,
    meleeArcHalfRad: 0.52,
    meleeRangePx: 86,
    cooldownScale: 0.44,
    damageMult: 0.72,
    bulletSpeedMult: 1,
    bulletRadiusMult: 1,
    baseBulletCount: 1,
    spreadRad: 0,
    pierceExtra: 0,
    bulletColor: 0x9aa0a8,
    magazineSize: 3,
    reloadSec: 0.95,
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
  'dao_broadsword',
  'spear_red_tassel',
  'bayonet_spike',
] as const;

/** 由索引取表项（循环切换用） */
export function playerWeaponKindAtIndex(index: number): PlayerWeaponKind {
  const n = PLAYER_WEAPON_ORDER.length;
  const i = ((index % n) + n) % n;
  return PLAYER_WEAPON_ORDER[i]!;
}
