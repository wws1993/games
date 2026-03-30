/**
 * 升级弹窗可选卡片池：标题/描述、稀有度档位（E～SSS）与效果；每次升级从未重复抽取 `pickCount` 张（池不足则全展示）
 */

/** 单张卡片如何改局内属性（由 `SurvivorGameModel.applyLevelUpChoice` 与宝箱随机奖励共用） */
export type LevelUpCardEffect =
  | { kind: 'damageMult'; factor: number }
  | { kind: 'moveSpeedMult'; factor: number }
  | { kind: 'maxHp'; add: number }
  | { kind: 'rifleAttackSpeedMult'; factor: number }
  | { kind: 'rifleBulletCount'; add: number }
  /** 步枪暴击几率增量（0.1 = +10%），局内累加后封顶 100% */
  | { kind: 'critChanceAdd'; add: number }
  /** 暴击命中时再乘此系数（如 1.2 = 额外 +20% 伤害），多张可叠乘 */
  | { kind: 'critOnHitDamageMult'; factor: number }
  /** 获得后可沿移动方向推动矩形土房障碍（受地图边界与其它障碍阻挡） */
  | { kind: 'pushObstacles' };

/** 卡片稀有度档位（从低到高），用于配置与 UI 边框/角标 */
export type LevelUpCardTier = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

/** 档位枚举顺序（低→高），供权重表或校验遍历 */
export const LEVEL_UP_CARD_TIERS: readonly LevelUpCardTier[] = [
  'E',
  'D',
  'C',
  'B',
  'A',
  'S',
  'SS',
  'SSS',
];

/** 各档位在界面上的描边与角标配色（与玩法数值无关，仅表现） */
export interface LevelUpCardTierPresentation {
  /** 角标文案（与 `LevelUpCardTier` 一致，多字符如 SS/SSS） */
  label: string;
  rim: number;
  rimHot: number;
  badgeBg: number;
  badgeStroke: number;
  badgeText: number;
}

/** 全档位默认表现表；调稀有度观感时改此对象即可 */
export const levelUpCardTierPresentation: Record<LevelUpCardTier, LevelUpCardTierPresentation> = {
  E: {
    label: 'E',
    rim: 0x6b6b6b,
    rimHot: 0x9a9a9a,
    badgeBg: 0x2e2e2e,
    badgeStroke: 0x5a5a5a,
    badgeText: 0xc8c8c8,
  },
  D: {
    label: 'D',
    rim: 0x5a6d52,
    rimHot: 0x7a9070,
    badgeBg: 0x283224,
    badgeStroke: 0x4a5c44,
    badgeText: 0xb8d0a8,
  },
  C: {
    label: 'C',
    rim: 0x4a6a8a,
    rimHot: 0x6a8ab0,
    badgeBg: 0x1e2a38,
    badgeStroke: 0x3a5070,
    badgeText: 0xa8c8e8,
  },
  B: {
    label: 'B',
    rim: 0x7a52a0,
    rimHot: 0xa070cc,
    badgeBg: 0x301840,
    badgeStroke: 0x604080,
    badgeText: 0xe0b8f8,
  },
  A: {
    label: 'A',
    rim: 0xc9a030,
    rimHot: 0xf0c850,
    badgeBg: 0x4a3810,
    badgeStroke: 0xa88020,
    badgeText: 0xfff0a0,
  },
  S: {
    label: 'S',
    rim: 0xe89020,
    rimHot: 0xffb840,
    badgeBg: 0x502808,
    badgeStroke: 0xd07018,
    badgeText: 0xffe8a8,
  },
  SS: {
    label: 'SS',
    rim: 0xf06828,
    rimHot: 0xff9858,
    badgeBg: 0x501810,
    badgeStroke: 0xe05828,
    badgeText: 0xffd0c0,
  },
  SSS: {
    label: 'SSS',
    rim: 0xffe040,
    rimHot: 0xfff8a0,
    badgeBg: 0x4a2808,
    badgeStroke: 0xf8c030,
    badgeText: 0xfffacd,
  },
};

/** 单条升级卡片定义（`id` 全局唯一，用于回传 `applyLevelUpChoice`） */
export interface LevelUpCardDef {
  id: string;
  /** 稀有度档位，须为 `LEVEL_UP_CARD_TIERS` 之一 */
  tier: LevelUpCardTier;
  title: string;
  description: string;
  effect: LevelUpCardEffect;
}

/** 每次升级展示的卡片张数 */
export const levelUpPickCount = 3;

/** 「推箱子」卡全局 id；玩家选择后本局升级池剔除（见 `SurvivorGameModel.applyLevelUpChoice`） */
export const LEVEL_UP_PUSH_CARD_ID = 'card_push_box';

/** 默认池：各卡绑定 E～A 档示例；S 及以上可后续加高价值卡并配权重抽取 */
export const levelUpCardPool: readonly LevelUpCardDef[] = [
  {
    id: 'card_move',
    tier: 'E',
    title: '我建议滑着走',
    description: '移动速度 +5%',
    effect: { kind: 'moveSpeedMult', factor: 1.05 },
  },
  {
    id: 'card_hp',
    tier: 'D',
    title: '加强体质锻炼，增强人民体质',
    description: '生命上限 +10',
    effect: { kind: 'maxHp', add: 10 },
  },
  {
    id: 'card_damage',
    tier: 'C',
    title: '我这一枪怕是有点痛哦',
    description: '所有伤害 +20%',
    effect: { kind: 'damageMult', factor: 1.2 },
  },
  {
    id: 'card_rifle_rof',
    tier: 'B',
    title: '射！射！射！',
    description: '步枪攻速 +20%',
    effect: { kind: 'rifleAttackSpeedMult', factor: 1.2 },
  },
  {
    id: LEVEL_UP_PUSH_CARD_ID,
    tier: 'B',
    title: '推箱子',
    description: '贴住土房后同方向持续用力约 1 秒，再缓慢推动障碍（获得后本局不再出现）',
    effect: { kind: 'pushObstacles' },
  },
  {
    id: 'card_rifle_split',
    tier: 'A',
    title: '喜欢玩雷电战机吗',
    description: '步枪每次多发射 1 发（扇形）',
    effect: { kind: 'rifleBulletCount', add: 1 },
  },
  {
    id: 'card_crit_1',
    tier: 'E',
    title: '暴击Ⅰ',
    description: '暴击几率 +10%',
    effect: { kind: 'critChanceAdd', add: 0.1 },
  },
  {
    id: 'card_crit_3',
    tier: 'D',
    title: '暴击Ⅲ',
    description: '暴击几率 +25%',
    effect: { kind: 'critChanceAdd', add: 0.25 },
  },
  {
    id: 'card_crit_whip',
    tier: 'S',
    title: '皮鞭蘸碘伏，边打边消毒',
    description: '暴击时额外造成 20% 伤害',
    effect: { kind: 'critOnHitDamageMult', factor: 1.2 },
  },
];
