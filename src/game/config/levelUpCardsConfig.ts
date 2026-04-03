/**
 * 升级强化卡：模板 + 按当前角色等级实例化数值；乘性卡用「百分比增量」缩放，避免早期爆炸、后期仍有成长
 * 优化更新：新增20+种效果类型，扩展至50张强化卡，丰富玩法多样性
 */

/** 单张卡片如何改局内属性（由 `SurvivorGameModel.applyLevelUpChoice` 应用） */
export type LevelUpCardEffect =
  | { kind: 'damageMult'; factor: number }
  | { kind: 'moveSpeedMult'; factor: number }
  | { kind: 'maxHp'; add: number }
  | { kind: 'rifleAttackSpeedMult'; factor: number }
  | { kind: 'rifleBulletCount'; add: number }
  /** 步枪暴击几率增量（0.1 = +10%），局内累加后封顶 100% */
  | { kind: 'critChanceAdd'; add: number }
  /** 暴击命中时再乘此系数，多张可叠乘 */
  | { kind: 'critOnHitDamageMult'; factor: number }
  /** 获得后可推动矩形土房障碍 */
  | { kind: 'pushObstacles' }
  // 新增效果类型
  | { kind: 'armorAdd'; add: number } // 护甲，减少受到的伤害
  | { kind: 'expMult'; factor: number } // 经验获取倍率
  | { kind: 'coinMult'; factor: number } // 配置称金币，局内叠乘幸运（与幸运卡一致）
  | { kind: 'luckMult'; factor: number } // 运气倍率，影响掉率/暴击等
  | { kind: 'pickupRangeMult'; factor: number } // 拾取范围倍率
  | { kind: 'lifestealAdd'; add: number } // 吸血率，攻击回复伤害的百分比
  | { kind: 'dodgeChanceAdd'; add: number } // 闪避率，概率躲避伤害
  | { kind: 'revive' } // 复活，本局可复活一次
  | { kind: 'projectilePierceAdd'; add: number } // 投射物穿透次数
  | { kind: 'knockbackMult'; factor: number } // 击退倍率
  | { kind: 'regenAdd'; add: number } // 每秒生命回复
  | { kind: 'thornsDamageMult'; factor: number } // 反伤倍率，受到伤害时反弹
  | { kind: 'rifleBulletSpeedMult'; factor: number } // 步枪子弹速度倍率
  | { kind: 'killHealAdd'; add: number } // 击杀敌人回复生命
  | { kind: 'dashCooldownMult'; factor: number } // 冲刺冷却倍率
  | { kind: 'projectileBounceAdd'; add: number } // 投射物反弹次数
  | { kind: 'rifleDamageMult'; factor: number } // 步枪专属伤害倍率
  | { kind: 'rifleCritChanceAdd'; add: number } // 步枪专属暴击率
  | { kind: 'rifleReloadSpeedMult'; factor: number } // 步枪换弹速度倍率
  | { kind: 'dashSpeedMult'; factor: number } // 冲刺移速倍率
  | { kind: 'hurtInvincibleMult'; factor: number } // 受伤无敌时间倍率
  | { kind: 'lowHpDamageMult'; factor: number } // 低血量(≤30%)伤害加成倍率
  | { kind: 'critLifestealAdd'; add: number }; // 暴击时额外吸血率

/** 卡片稀有度档位（从低到高），用于 UI 边框/角标 */
export type LevelUpCardTier = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

/** 档位枚举顺序（低→高） */
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

/** 各档位在界面上的描边与角标配色 */
export interface LevelUpCardTierPresentation {
  label: string;
  rim: number;
  rimHot: number;
  badgeBg: number;
  badgeStroke: number;
  badgeText: number;
}

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
}

/** 局内展示用完整卡片（由模板按等级生成） */
export interface LevelUpCardDef {
  id: string;
  tier: LevelUpCardTier;
  title: string;
  description: string;
  effect: LevelUpCardEffect;
}

/** 乘性子项：factor = 1 + clamp(basePct + (Lv-1)*pctPerLevel, minPct, maxPct) */
export interface LevelUpScaleMultSpec {
  basePct: number;
  pctPerLevel: number;
  minPct?: number;
  maxPct?: number;
}

/** 加性子项（生命等） */
export interface LevelUpScaleAddSpec {
  base: number;
  perLevel: number;
  min?: number;
  max?: number;
}

/** 暴击率加算子项（0~1） */
export interface LevelUpScaleCritAddSpec {
  base: number;
  perLevel: number;
  max: number;
}

/** 散射：基础 +1，每 `everyLevels` 级再多 +1，额外部分不超过 `maxBonus` */
export interface LevelUpScaleBulletSpec {
  baseAdd: number;
  everyLevels: number;
  maxBonus: number;
}

/** 配置池条目：仅模板，不含最终数值 */
export type LevelUpCardTemplate =
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'moveSpeedMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'damageMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'maxHp';
      scale: LevelUpScaleAddSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'rifleAttackSpeedMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'rifleBulletCount';
      scale: LevelUpScaleBulletSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'critChanceAdd';
      scale: LevelUpScaleCritAddSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'critOnHitDamageMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'pushObstacles';
      description: string;
    }
  // 新增变体类型
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'armorAdd';
      scale: LevelUpScaleAddSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'expMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'coinMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'luckMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'pickupRangeMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'lifestealAdd';
      scale: LevelUpScaleCritAddSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'dodgeChanceAdd';
      scale: LevelUpScaleCritAddSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'revive';
      description: string;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'projectilePierceAdd';
      scale: LevelUpScaleAddSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'knockbackMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'regenAdd';
      scale: LevelUpScaleAddSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'thornsDamageMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'rifleBulletSpeedMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'killHealAdd';
      scale: LevelUpScaleAddSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'dashCooldownMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'projectileBounceAdd';
      scale: LevelUpScaleAddSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'rifleDamageMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'rifleCritChanceAdd';
      scale: LevelUpScaleCritAddSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'rifleReloadSpeedMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'dashSpeedMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'hurtInvincibleMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'lowHpDamageMult';
      scale: LevelUpScaleMultSpec;
    }
  | {
      id: string;
      tier: LevelUpCardTier;
      title: string;
      variant: 'critLifestealAdd';
      scale: LevelUpScaleCritAddSpec;
    };

/** 每次升级可选张数 */
export const levelUpPickCount = 3;

/** 「推箱子」卡 id；获得后本局从池剔除 */
export const LEVEL_UP_PUSH_CARD_ID = 'card_push_box';
/** 「复活」卡 id；获得后本局从池剔除 */
export const LEVEL_UP_REVIVE_CARD_ID = 'card_revive';

/** 强化卡模板池（抽取后由 `materializeLevelUpCard` 按等级生成实例） */
export const levelUpCardTemplates: readonly LevelUpCardTemplate[] = [
  // ========== 原有保留卡片 ==========
  {
    id: 'card_move',
    tier: 'E',
    title: '我建议滑着走',
    variant: 'moveSpeedMult',
    scale: { basePct: 0.02, pctPerLevel: 0.0011, minPct: 0.012, maxPct: 0.092 },
  },
  {
    id: 'card_hp',
    tier: 'D',
    title: '加强体质锻炼，增强人民体质',
    variant: 'maxHp',
    scale: { base: 6, perLevel: 1.12, min: 5, max: 44 },
  },
  {
    id: 'card_damage',
    tier: 'C',
    title: '我这一枪怕是有点痛哦',
    variant: 'damageMult',
    scale: { basePct: 0.026, pctPerLevel: 0.00155, minPct: 0.018, maxPct: 0.105 },
  },
  {
    id: 'card_rifle_rof',
    tier: 'B',
    title: '射！射！射！',
    variant: 'rifleAttackSpeedMult',
    scale: { basePct: 0.024, pctPerLevel: 0.00145, minPct: 0.016, maxPct: 0.098 },
  },
  {
    id: LEVEL_UP_PUSH_CARD_ID,
    tier: 'B',
    title: '推箱子',
    variant: 'pushObstacles',
    description: '贴住土房后同方向持续用力约 1 秒，再缓慢推动障碍（获得后本局不再出现）',
  },
  {
    id: 'card_rifle_split',
    tier: 'A',
    title: '喜欢玩雷电战机吗',
    variant: 'rifleBulletCount',
    scale: { baseAdd: 1, everyLevels: 11, maxBonus: 2 },
  },
  {
    id: 'card_crit_1',
    tier: 'E',
    title: '暴击·稳固',
    variant: 'critChanceAdd',
    scale: { base: 0.04, perLevel: 0.0026, max: 0.11 },
  },
  {
    id: 'card_crit_keen',
    tier: 'C',
    title: '暴击·敏锐',
    variant: 'critChanceAdd',
    scale: { base: 0.078, perLevel: 0.004, max: 0.19 },
  },
  {
    id: 'card_crit_whip',
    tier: 'S',
    title: '皮鞭蘸碘伏，边打边消毒',
    variant: 'critOnHitDamageMult',
    scale: { basePct: 0.052, pctPerLevel: 0.0032, minPct: 0.04, maxPct: 0.2 },
  },

  // ========== E级 基础卡 ==========
  {
    id: 'card_armor_e',
    tier: 'E',
    title: '挨揍练抗揍',
    variant: 'armorAdd',
    scale: { base: 1, perLevel: 0.1, min: 1, max: 5 },
  },
  {
    id: 'card_exp_e',
    tier: 'E',
    title: '卷，都给我卷',
    variant: 'expMult',
    scale: { basePct: 0.02, pctPerLevel: 0.001, minPct: 0.012, maxPct: 0.08 },
  },
  {
    id: 'card_luck_e',
    tier: 'E',
    title: '今天运气不错',
    variant: 'luckMult',
    scale: { basePct: 0.02, pctPerLevel: 0.001, minPct: 0.012, maxPct: 0.08 },
  },
  {
    id: 'card_pickup_e',
    tier: 'E',
    title: '伸手就能拿到',
    variant: 'pickupRangeMult',
    scale: { basePct: 0.03, pctPerLevel: 0.0012, minPct: 0.02, maxPct: 0.1 },
  },
  {
    id: 'card_rifle_dmg_e',
    tier: 'E',
    title: '步枪加加威力',
    variant: 'rifleDamageMult',
    scale: { basePct: 0.03, pctPerLevel: 0.0015, minPct: 0.02, maxPct: 0.12 },
  },

  // ========== D级 普通卡 ==========
  {
    id: 'card_dodge_d',
    tier: 'D',
    title: '走位，走位',
    variant: 'dodgeChanceAdd',
    scale: { base: 0.02, perLevel: 0.0015, max: 0.08 },
  },
  {
    id: 'card_coin_d',
    tier: 'D',
    title: '见钱眼开',
    variant: 'coinMult',
    scale: { basePct: 0.04, pctPerLevel: 0.002, minPct: 0.03, maxPct: 0.15 },
  },
  {
    id: 'card_lifesteal_d',
    tier: 'D',
    title: '小吸一口',
    variant: 'lifestealAdd',
    scale: { base: 0.015, perLevel: 0.001, max: 0.06 },
  },
  {
    id: 'card_regen_d',
    tier: 'D',
    title: '慢慢回血',
    variant: 'regenAdd',
    scale: { base: 0.2, perLevel: 0.03, min: 0.15, max: 1.2 },
  },
  {
    id: 'card_rifle_crit_d',
    tier: 'D',
    title: '步枪好暴击',
    variant: 'rifleCritChanceAdd',
    scale: { base: 0.05, perLevel: 0.003, max: 0.15 },
  },
  {
    id: 'card_dash_speed_d',
    tier: 'D',
    title: '冲刺快一点',
    variant: 'dashSpeedMult',
    scale: { basePct: 0.04, pctPerLevel: 0.002, minPct: 0.03, maxPct: 0.14 },
  },

  // ========== C级 优秀卡 ==========
  {
    id: 'card_armor_c',
    tier: 'C',
    title: '铁骨铮铮',
    variant: 'armorAdd',
    scale: { base: 2, perLevel: 0.15, min: 1.5, max: 8 },
  },
  {
    id: 'card_thorns_c',
    tier: 'C',
    title: '扎死你个小的',
    variant: 'thornsDamageMult',
    scale: { basePct: 0.05, pctPerLevel: 0.0025, minPct: 0.04, maxPct: 0.18 },
  },
  {
    id: 'card_pierce_c',
    tier: 'C',
    title: '一枪穿一串',
    variant: 'projectilePierceAdd',
    scale: { base: 1, perLevel: 0.05, min: 1, max: 3 },
  },
  {
    id: 'card_knockback_c',
    tier: 'C',
    title: '别过来！',
    variant: 'knockbackMult',
    scale: { basePct: 0.06, pctPerLevel: 0.003, minPct: 0.05, maxPct: 0.22 },
  },
  {
    id: 'card_rifle_dmg_c',
    tier: 'C',
    title: '步枪要威力',
    variant: 'rifleDamageMult',
    scale: { basePct: 0.05, pctPerLevel: 0.0025, minPct: 0.04, maxPct: 0.2 },
  },
  {
    id: 'card_invincible_c',
    tier: 'C',
    title: '无敌久一点',
    variant: 'hurtInvincibleMult',
    scale: { basePct: 0.05, pctPerLevel: 0.0025, minPct: 0.04, maxPct: 0.18 },
  },

  // ========== B级 精良卡 ==========
  {
    id: 'card_kill_heal_b',
    tier: 'B',
    title: '杀一个回一口',
    variant: 'killHealAdd',
    scale: { base: 2, perLevel: 0.12, min: 1.5, max: 7 },
  },
  {
    id: 'card_bullet_speed_b',
    tier: 'B',
    title: '子弹飞快点',
    variant: 'rifleBulletSpeedMult',
    scale: { basePct: 0.05, pctPerLevel: 0.0025, minPct: 0.04, maxPct: 0.18 },
  },
  {
    id: 'card_dash_cd_b',
    tier: 'B',
    title: '闪现冷却快',
    variant: 'dashCooldownMult',
    scale: { basePct: -0.03, pctPerLevel: -0.0015, minPct: -0.1, maxPct: -0.02 },
  },
  {
    id: 'card_bounce_b',
    tier: 'B',
    title: '弹弹弹',
    variant: 'projectileBounceAdd',
    scale: { base: 1, perLevel: 0.04, min: 1, max: 3 },
  },
  {
    id: 'card_rifle_reload_b',
    tier: 'B',
    title: '换弹不磨蹭',
    variant: 'rifleReloadSpeedMult',
    scale: { basePct: 0.04, pctPerLevel: 0.002, minPct: 0.03, maxPct: 0.15 },
  },
  {
    id: 'card_exp_b',
    tier: 'B',
    title: '升级快一点',
    variant: 'expMult',
    scale: { basePct: 0.04, pctPerLevel: 0.002, minPct: 0.03, maxPct: 0.14 },
  },

  // ========== A级 稀有卡 ==========
  {
    id: 'card_exp_a',
    tier: 'A',
    title: '卷王之王',
    variant: 'expMult',
    scale: { basePct: 0.05, pctPerLevel: 0.003, minPct: 0.04, maxPct: 0.2 },
  },
  {
    id: 'card_luck_a',
    tier: 'A',
    title: '欧皇附体',
    variant: 'luckMult',
    scale: { basePct: 0.06, pctPerLevel: 0.0035, minPct: 0.05, maxPct: 0.22 },
  },
  {
    id: 'card_lifesteal_a',
    tier: 'A',
    title: '吸血鬼竟是我自己',
    variant: 'lifestealAdd',
    scale: { base: 0.04, perLevel: 0.0025, max: 0.15 },
  },
  {
    id: 'card_dodge_a',
    tier: 'A',
    title: '根本打不到我',
    variant: 'dodgeChanceAdd',
    scale: { base: 0.05, perLevel: 0.003, max: 0.18 },
  },
  {
    id: 'card_pickup_a',
    tier: 'A',
    title: '万有引力',
    variant: 'pickupRangeMult',
    scale: { basePct: 0.08, pctPerLevel: 0.004, minPct: 0.06, maxPct: 0.28 },
  },
  {
    id: 'card_rifle_crit_a',
    tier: 'A',
    title: '步枪枪枪暴击',
    variant: 'rifleCritChanceAdd',
    scale: { base: 0.08, perLevel: 0.005, max: 0.25 },
  },
  {
    id: 'card_crit_lifesteal_a',
    tier: 'A',
    title: '暴击吸一口',
    variant: 'critLifestealAdd',
    scale: { base: 0.06, perLevel: 0.0035, max: 0.2 },
  },

  // ========== S级 史诗卡 ==========
  {
    id: LEVEL_UP_REVIVE_CARD_ID,
    tier: 'S',
    title: '春哥附体',
    variant: 'revive',
    description: '本局可复活一次，复活后恢复50%最大生命（获得后本局不再出现）',
  },
  {
    id: 'card_armor_s',
    tier: 'S',
    title: '金刚不坏',
    variant: 'armorAdd',
    scale: { base: 4, perLevel: 0.25, min: 3, max: 15 },
  },
  {
    id: 'card_thorns_s',
    tier: 'S',
    title: '刺猬成精了',
    variant: 'thornsDamageMult',
    scale: { basePct: 0.12, pctPerLevel: 0.006, minPct: 0.1, maxPct: 0.4 },
  },
  {
    id: 'card_regen_s',
    tier: 'S',
    title: '血条自动修',
    variant: 'regenAdd',
    scale: { base: 1, perLevel: 0.08, min: 0.8, max: 4 },
  },
  {
    id: 'card_coin_s',
    tier: 'S',
    title: '富得流油',
    variant: 'coinMult',
    scale: { basePct: 0.1, pctPerLevel: 0.005, minPct: 0.08, maxPct: 0.35 },
  },
  {
    id: 'card_rifle_dmg_s',
    tier: 'S',
    title: '一枪一个小朋友',
    variant: 'rifleDamageMult',
    scale: { basePct: 0.08, pctPerLevel: 0.004, minPct: 0.06, maxPct: 0.35 },
  },
  {
    id: 'card_rifle_reload_s',
    tier: 'S',
    title: '秒换弹',
    variant: 'rifleReloadSpeedMult',
    scale: { basePct: 0.08, pctPerLevel: 0.004, minPct: 0.06, maxPct: 0.3 },
  },

  // ========== SS级 传说卡 ==========
  {
    id: 'card_pierce_ss',
    tier: 'SS',
    title: '万箭穿心',
    variant: 'projectilePierceAdd',
    scale: { base: 2, perLevel: 0.08, min: 1.5, max: 6 },
  },
  {
    id: 'card_bounce_ss',
    tier: 'SS',
    title: '子弹弹弹乐',
    variant: 'projectileBounceAdd',
    scale: { base: 2, perLevel: 0.07, min: 1.5, max: 5 },
  },
  {
    id: 'card_low_hp_dmg_ss',
    tier: 'SS',
    title: '绝境爆发',
    variant: 'lowHpDamageMult',
    scale: { basePct: 0.15, pctPerLevel: 0.008, minPct: 0.12, maxPct: 0.5 },
  },
  {
    id: 'card_max_hp_ss',
    tier: 'SS',
    title: '血条厚的离谱',
    variant: 'maxHp',
    scale: { base: 12, perLevel: 1.5, min: 10, max: 70 },
  },

  // ========== SSS级 神话卡 ==========
  {
    id: 'card_all_damage_sss',
    tier: 'SSS',
    title: '毁天灭地',
    variant: 'damageMult',
    scale: { basePct: 0.08, pctPerLevel: 0.005, minPct: 0.06, maxPct: 0.4 },
  },
  {
    id: 'card_max_hp_sss',
    tier: 'SSS',
    title: '血条比你命长',
    variant: 'maxHp',
    scale: { base: 18, perLevel: 2.2, min: 15, max: 100 },
  },
  {
    id: 'card_crit_all_sss',
    tier: 'SSS',
    title: '枪枪暴击不是梦',
    variant: 'critChanceAdd',
    scale: { base: 0.15, perLevel: 0.008, max: 0.4 },
  },
  {
    id: 'card_crit_dmg_sss',
    tier: 'SSS',
    title: '暴击秒天秒地',
    variant: 'critOnHitDamageMult',
    scale: { basePct: 0.1, pctPerLevel: 0.006, minPct: 0.08, maxPct: 0.45 },
  },
];

/**
 * @deprecated 使用 `levelUpCardTemplates` + `materializeLevelUpCard`；保留别名避免外部误用旧静态数值
 */
export const levelUpCardPool = levelUpCardTemplates;

/** 由乘性规格与角色等级得 factor（≥1） */
function multFactorFromSpec(spec: LevelUpScaleMultSpec, playerLevel: number): number {
  const lv = Math.max(1, Math.floor(playerLevel));
  const rawPct = spec.basePct + (lv - 1) * spec.pctPerLevel;
  const lo = spec.minPct ?? 0;
  const hi = spec.maxPct ?? 0.5;
  const pct = Math.min(hi, Math.max(lo, rawPct));
  return 1 + pct;
}

/** 由加性规格与角色等级得整数数值 */
function addValueFromSpec(spec: LevelUpScaleAddSpec, playerLevel: number): number {
  const lv = Math.max(1, Math.floor(playerLevel));
  const raw = spec.base + (lv - 1) * spec.perLevel;
  const v = raw; // 支持小数，部分属性需要
  const lo = spec.min ?? 1;
  const hi = spec.max ?? 999;
  return Math.min(hi, Math.max(lo, v));
}

/** 暴击率加算 */
function critAddFromSpec(spec: LevelUpScaleCritAddSpec, playerLevel: number): number {
  const lv = Math.max(1, Math.floor(playerLevel));
  const raw = spec.base + (lv - 1) * spec.perLevel;
  return Math.min(spec.max, Math.max(0, raw));
}

/** 额外弹数：每 everyLevels 级 +1，最多 maxBonus */
function bulletAddFromSpec(spec: LevelUpScaleBulletSpec, playerLevel: number): number {
  const lv = Math.max(1, Math.floor(playerLevel));
  const bonus = Math.min(spec.maxBonus, Math.floor((lv - 1) / Math.max(1, spec.everyLevels)));
  return spec.baseAdd + bonus;
}

function pctLabel(factor: number): string {
  return `${((factor - 1) * 100).toFixed(1)}%`;
}

/**
 * 按当前角色等级生成单张强化卡（升级弹窗用）
 * @param template - `levelUpCardTemplates` 中一项
 * @param playerLevel - 升级达成后的等级（与 `SurvivorGameModel.level` 一致）
 */
export function materializeLevelUpCard(template: LevelUpCardTemplate, playerLevel: number): LevelUpCardDef {
  const lv = Math.max(1, Math.floor(playerLevel));
  switch (template.variant) {
    // 原有效果处理
    case 'moveSpeedMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `移动速度 +${pctLabel(f)}（随等级 Lv${lv} 结算）`,
        effect: { kind: 'moveSpeedMult', factor: f },
      };
    }
    case 'damageMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `所有伤害 +${pctLabel(f)}（随等级 Lv${lv} 结算）`,
        effect: { kind: 'damageMult', factor: f },
      };
    }
    case 'maxHp': {
      const add = Math.round(addValueFromSpec(template.scale, lv));
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `生命上限 +${add}（当前与上限同时增加，Lv${lv}）`,
        effect: { kind: 'maxHp', add },
      };
    }
    case 'rifleAttackSpeedMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `步枪攻速 +${pctLabel(f)}（冷却缩短，Lv${lv}）`,
        effect: { kind: 'rifleAttackSpeedMult', factor: f },
      };
    }
    case 'rifleBulletCount': {
      const add = bulletAddFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `步枪每轮多 ${add} 发弹丸（扇形，Lv${lv}）`,
        effect: { kind: 'rifleBulletCount', add },
      };
    }
    case 'critChanceAdd': {
      const add = critAddFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `暴击几率 +${Math.round(add * 100)}%（Lv${lv}）`,
        effect: { kind: 'critChanceAdd', add },
      };
    }
    case 'critOnHitDamageMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `暴击时伤害再 ×${f.toFixed(2)}（约额外 +${pctLabel(f)}，Lv${lv}）`,
        effect: { kind: 'critOnHitDamageMult', factor: f },
      };
    }
    case 'pushObstacles':
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: template.description,
        effect: { kind: 'pushObstacles' },
      };

    // 新增效果处理
    case 'armorAdd': {
      const add = Math.round(addValueFromSpec(template.scale, lv));
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `护甲 +${add}，减少受到的伤害（Lv${lv}）`,
        effect: { kind: 'armorAdd', add },
      };
    }
    case 'expMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `经验获取 +${pctLabel(f)}，升级更快（Lv${lv}）`,
        effect: { kind: 'expMult', factor: f },
      };
    }
    case 'coinMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `金币获取 +${pctLabel(f)}，赚钱更快（Lv${lv}）`,
        effect: { kind: 'coinMult', factor: f },
      };
    }
    case 'luckMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `运气 +${pctLabel(f)}，提升掉率与暴击（Lv${lv}）`,
        effect: { kind: 'luckMult', factor: f },
      };
    }
    case 'pickupRangeMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `拾取范围 +${pctLabel(f)}，自动捡东西更远（Lv${lv}）`,
        effect: { kind: 'pickupRangeMult', factor: f },
      };
    }
    case 'lifestealAdd': {
      const add = critAddFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `攻击吸血 +${Math.round(add * 100)}%，打敌人回自己血（Lv${lv}）`,
        effect: { kind: 'lifestealAdd', add },
      };
    }
    case 'dodgeChanceAdd': {
      const add = critAddFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `闪避几率 +${Math.round(add * 100)}%，概率躲避伤害（Lv${lv}）`,
        effect: { kind: 'dodgeChanceAdd', add },
      };
    }
    case 'revive':
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: template.description,
        effect: { kind: 'revive' },
      };
    case 'projectilePierceAdd': {
      const add = Math.round(addValueFromSpec(template.scale, lv));
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `子弹可穿透 ${add} 个敌人（Lv${lv}）`,
        effect: { kind: 'projectilePierceAdd', add },
      };
    }
    case 'knockbackMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `击退效果 +${pctLabel(f)}，打退敌人更远（Lv${lv}）`,
        effect: { kind: 'knockbackMult', factor: f },
      };
    }
    case 'regenAdd': {
      const add = addValueFromSpec(template.scale, lv).toFixed(1);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `每秒生命回复 +${add}，慢慢回血（Lv${lv}）`,
        effect: { kind: 'regenAdd', add: parseFloat(add) },
      };
    }
    case 'thornsDamageMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `反伤 +${pctLabel(f)}，挨打反弹伤害（Lv${lv}）`,
        effect: { kind: 'thornsDamageMult', factor: f },
      };
    }
    case 'rifleBulletSpeedMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `步枪子弹速度 +${pctLabel(f)}，子弹飞更快（Lv${lv}）`,
        effect: { kind: 'rifleBulletSpeedMult', factor: f },
      };
    }
    case 'killHealAdd': {
      const add = Math.round(addValueFromSpec(template.scale, lv));
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `击杀敌人回复 ${add} 生命（Lv${lv}）`,
        effect: { kind: 'killHealAdd', add },
      };
    }
    case 'dashCooldownMult': {
      const f = multFactorFromSpec(template.scale, lv);
      const reducePct = ((1 - f) * 100).toFixed(1);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `冲刺冷却减少 ${reducePct}%，可以多冲几次（Lv${lv}）`,
        effect: { kind: 'dashCooldownMult', factor: f },
      };
    }
    case 'projectileBounceAdd': {
      const add = Math.round(addValueFromSpec(template.scale, lv));
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `子弹可反弹 ${add} 次，撞到墙/敌人会弹（Lv${lv}）`,
        effect: { kind: 'projectileBounceAdd', add },
      };
    }
    case 'rifleDamageMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `步枪伤害 +${pctLabel(f)}，专属武器强化（Lv${lv}）`,
        effect: { kind: 'rifleDamageMult', factor: f },
      };
    }
    case 'rifleCritChanceAdd': {
      const add = critAddFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `步枪暴击率 +${Math.round(add * 100)}%，专属暴击加成（Lv${lv}）`,
        effect: { kind: 'rifleCritChanceAdd', add },
      };
    }
    case 'rifleReloadSpeedMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `步枪换弹速度 +${pctLabel(f)}，换弹更快（Lv${lv}）`,
        effect: { kind: 'rifleReloadSpeedMult', factor: f },
      };
    }
    case 'dashSpeedMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `冲刺移速 +${pctLabel(f)}，冲的更快更远（Lv${lv}）`,
        effect: { kind: 'dashSpeedMult', factor: f },
      };
    }
    case 'hurtInvincibleMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `受伤无敌时间 +${pctLabel(f)}，挨打后无敌更久（Lv${lv}）`,
        effect: { kind: 'hurtInvincibleMult', factor: f },
      };
    }
    case 'lowHpDamageMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `血量≤30%时，伤害额外 +${pctLabel(f)}（绝境爆发，Lv${lv}）`,
        effect: { kind: 'lowHpDamageMult', factor: f },
      };
    }
    case 'critLifestealAdd': {
      const add = critAddFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `暴击时额外吸血 +${Math.round(add * 100)}%，暴击回更多血（Lv${lv}）`,
        effect: { kind: 'critLifestealAdd', add },
      };
    }
  }
}