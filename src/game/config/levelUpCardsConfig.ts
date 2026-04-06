/**
 * 升级强化卡：模板池按「火力 / 生存 / 机动 / 成长」方向划分；`materializeLevelUpCard` 按等级实例化数值。
 * 乘性卡用百分比增量缩放；暴击率仍由运气（luckMult）等换算，无单独暴击率卡；溢出暴击转攻见 `SurvivorGameModel`。
 *
 * 强化分类与抽池（`levelUpTemplateEligibleForWeaponCategory`）：
 * - **基础能力增强** `base`：移速、全局伤害、生命、护甲、经验、幸运、拾取、闪避、吸血、复活、荆棘、击退、回复、冲刺、歼敌补给、低血、暴击锤炼等；不含仅弹体/仅近战独占条目。
 * - **主武器数值（射击与近战共用）** `sharedWeapon`：`rifleAttackSpeedMult`、`rifleBulletCount`、`rifleDamageMult`、`projectilePierceAdd`（局内近战吃射速/散射/主武器伤；穿透仅影响弹体 `hitsRemaining`，近战挥击扇区内对每名敌人各结算一次，不受穿透数值限制）。
 * - **远程武器增强** `rangedWeapon`：仅 `projectileBounceAdd`、`rifleBulletSpeedMult`、`rifleReloadSpeedMult`（近战无弹体/无换弹读条，不进近战池）。
 * - **近战武器增强** `meleeWeapon`：当前无独占 `variant`；预留 `levelUpTemplateMeleeWeaponOnly` 未来仅近战池。
 * 近战与远程池不通用：近战局剔除 `rangedWeapon`；射击局剔除 `meleeWeapon`（当前恒假）。
 */

/** 单张卡片如何改局内属性（由 `SurvivorGameModel.applyLevelUpChoice` 应用） */
export type LevelUpCardEffect =
  | { kind: 'damageMult'; factor: number }
  | { kind: 'moveSpeedMult'; factor: number }
  | { kind: 'maxHp'; add: number }
  | { kind: 'rifleAttackSpeedMult'; factor: number }
  | { kind: 'rifleBulletCount'; add: number }
  /** 暴击命中时再乘此系数，多张可叠乘 */
  | { kind: 'critOnHitDamageMult'; factor: number }
  /** 获得后可推动矩形土房障碍 */
  | { kind: 'pushObstacles' }
  // 新增效果类型
  | { kind: 'armorAdd'; add: number } // 护甲，减少受到的伤害
  | { kind: 'expMult'; factor: number } // 经验获取倍率
  | { kind: 'coinMult'; factor: number } // 配置称金币，局内叠乘幸运（与幸运卡一致）
  /** 运气倍率：叠乘后局内换算暴击率（见 `luckCritChanceBonusFromLuckMult`）并影响掉率等 */
  | { kind: 'luckMult'; factor: number }
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

/** 「推障碍」卡 id；获得后本局从池剔除（id 固定供 `SurvivorGameModel` 过滤） */
export const LEVEL_UP_PUSH_CARD_ID = 'card_push_box';
/** 「复活」卡 id；获得后本局从池剔除 */
export const LEVEL_UP_REVIVE_CARD_ID = 'card_revive';

/** 强化卡模板池：方向覆盖火力 / 生存 / 机动 / 成长；抽取后由 `materializeLevelUpCard` 按等级生成实例 */
export const levelUpCardTemplates: readonly LevelUpCardTemplate[] = [
  // —— E：基础成长 ——
  {
    id: 'lu_e_mobility',
    tier: 'E',
    title: '轻装机动',
    variant: 'moveSpeedMult',
    scale: { basePct: 0.02, pctPerLevel: 0.0011, minPct: 0.012, maxPct: 0.092 },
  },
  {
    id: 'lu_e_vitality',
    tier: 'E',
    title: '体质强化',
    variant: 'maxHp',
    scale: { base: 5, perLevel: 0.95, min: 4, max: 36 },
  },
  {
    id: 'lu_e_armor',
    tier: 'E',
    title: '土工作业',
    variant: 'armorAdd',
    scale: { base: 1, perLevel: 0.1, min: 1, max: 5 },
  },
  {
    id: 'lu_e_xp',
    tier: 'E',
    title: '战场总结',
    variant: 'expMult',
    scale: { basePct: 0.02, pctPerLevel: 0.001, minPct: 0.012, maxPct: 0.08 },
  },
  {
    id: 'lu_e_fortune',
    tier: 'E',
    title: '战场机缘',
    variant: 'luckMult',
    scale: { basePct: 0.02, pctPerLevel: 0.001, minPct: 0.012, maxPct: 0.08 },
  },
  {
    id: 'lu_e_pickup',
    tier: 'E',
    title: '近距拾取',
    variant: 'pickupRangeMult',
    scale: { basePct: 0.03, pctPerLevel: 0.0012, minPct: 0.02, maxPct: 0.1 },
  },
  {
    id: 'lu_e_primary_dmg',
    tier: 'E',
    title: '主武器整备',
    variant: 'rifleDamageMult',
    scale: { basePct: 0.03, pctPerLevel: 0.0015, minPct: 0.02, maxPct: 0.12 },
  },
  {
    id: 'lu_e_strike',
    tier: 'E',
    title: '出力稳定',
    variant: 'damageMult',
    scale: { basePct: 0.018, pctPerLevel: 0.001, minPct: 0.012, maxPct: 0.07 },
  },

  // —— D：生存与资源 ——
  {
    id: 'lu_d_hp',
    tier: 'D',
    title: '耐力训练',
    variant: 'maxHp',
    scale: { base: 6, perLevel: 1.12, min: 5, max: 44 },
  },
  {
    id: 'lu_d_dodge',
    tier: 'D',
    title: '侧步规避',
    variant: 'dodgeChanceAdd',
    scale: { base: 0.02, perLevel: 0.0015, max: 0.08 },
  },
  {
    id: 'lu_d_coin',
    tier: 'D',
    title: '缴获加成',
    variant: 'coinMult',
    scale: { basePct: 0.04, pctPerLevel: 0.002, minPct: 0.03, maxPct: 0.15 },
  },
  {
    id: 'lu_d_lifesteal',
    tier: 'D',
    title: '战地包扎',
    variant: 'lifestealAdd',
    scale: { base: 0.015, perLevel: 0.001, max: 0.06 },
  },
  {
    id: 'lu_d_regen',
    tier: 'D',
    title: '持续愈合',
    variant: 'regenAdd',
    scale: { base: 0.1, perLevel: 0.018, min: 0.08, max: 0.52 },
  },
  {
    id: 'lu_d_dash_spd',
    tier: 'D',
    title: '突击步幅',
    variant: 'dashSpeedMult',
    scale: { basePct: 0.04, pctPerLevel: 0.002, minPct: 0.03, maxPct: 0.14 },
  },

  // —— C：对抗与控场 ——
  {
    id: 'lu_c_armor',
    tier: 'C',
    title: '硬壳护体',
    variant: 'armorAdd',
    scale: { base: 2, perLevel: 0.15, min: 1.5, max: 8 },
  },
  {
    id: 'lu_c_thorns',
    tier: 'C',
    title: '荆棘回击',
    variant: 'thornsDamageMult',
    scale: { basePct: 0.05, pctPerLevel: 0.0025, minPct: 0.04, maxPct: 0.18 },
  },
  {
    id: 'lu_c_pierce',
    tier: 'C',
    title: '贯穿射击',
    variant: 'projectilePierceAdd',
    scale: { base: 1, perLevel: 0.05, min: 1, max: 3 },
  },
  {
    id: 'lu_c_knockback',
    tier: 'C',
    title: '冲击退敌',
    variant: 'knockbackMult',
    scale: { basePct: 0.06, pctPerLevel: 0.003, minPct: 0.05, maxPct: 0.22 },
  },
  {
    id: 'lu_c_primary_dmg',
    tier: 'C',
    title: '主武器增压',
    variant: 'rifleDamageMult',
    scale: { basePct: 0.05, pctPerLevel: 0.0025, minPct: 0.04, maxPct: 0.2 },
  },
  {
    id: 'lu_c_invuln',
    tier: 'C',
    title: '受击喘息',
    variant: 'hurtInvincibleMult',
    scale: { basePct: 0.05, pctPerLevel: 0.0025, minPct: 0.04, maxPct: 0.18 },
  },
  {
    id: 'lu_c_global_dmg',
    tier: 'C',
    title: '火力上调',
    variant: 'damageMult',
    scale: { basePct: 0.026, pctPerLevel: 0.00155, minPct: 0.018, maxPct: 0.105 },
  },

  // —— B：武器机制与机动 ——
  {
    id: LEVEL_UP_PUSH_CARD_ID,
    tier: 'B',
    title: '推移障碍',
    variant: 'pushObstacles',
    description: '贴住土房后同方向持续施力约 1 秒，可缓慢推动矩形障碍（获得后本局不再出现）',
  },
  {
    id: 'lu_b_kill_mend',
    tier: 'B',
    title: '歼敌补给',
    variant: 'killHealAdd',
    scale: { base: 1.1, perLevel: 0.07, min: 0.9, max: 3.5 },
  },
  {
    id: 'lu_b_proj_spd',
    tier: 'B',
    title: '弹体加速',
    variant: 'rifleBulletSpeedMult',
    scale: { basePct: 0.05, pctPerLevel: 0.0025, minPct: 0.04, maxPct: 0.18 },
  },
  {
    id: 'lu_b_dash_cd',
    tier: 'B',
    title: '冲刺整备',
    variant: 'dashCooldownMult',
    scale: { basePct: -0.03, pctPerLevel: -0.0015, minPct: -0.1, maxPct: -0.02 },
  },
  {
    id: 'lu_b_ricochet',
    tier: 'B',
    title: '跳弹折射',
    variant: 'projectileBounceAdd',
    scale: { base: 1, perLevel: 0.04, min: 1, max: 3 },
  },
  {
    id: 'lu_b_reload',
    tier: 'B',
    title: '快速装填',
    variant: 'rifleReloadSpeedMult',
    scale: { basePct: 0.04, pctPerLevel: 0.002, minPct: 0.03, maxPct: 0.15 },
  },
  {
    id: 'lu_b_rof',
    tier: 'B',
    title: '压制射速',
    variant: 'rifleAttackSpeedMult',
    scale: { basePct: 0.024, pctPerLevel: 0.00145, minPct: 0.016, maxPct: 0.098 },
  },
  {
    id: 'lu_b_xp',
    tier: 'B',
    title: '经验压缩',
    variant: 'expMult',
    scale: { basePct: 0.04, pctPerLevel: 0.002, minPct: 0.03, maxPct: 0.14 },
  },

  // —— A：稀有专精 ——
  {
    id: 'lu_a_salvo',
    tier: 'A',
    title: '密集弹幕',
    variant: 'rifleBulletCount',
    scale: { baseAdd: 1, everyLevels: 11, maxBonus: 2 },
  },
  {
    id: 'lu_a_xp',
    tier: 'A',
    title: '战例复盘',
    variant: 'expMult',
    scale: { basePct: 0.05, pctPerLevel: 0.003, minPct: 0.04, maxPct: 0.2 },
  },
  {
    id: 'lu_a_fortune',
    tier: 'A',
    title: '天时地利',
    variant: 'luckMult',
    scale: { basePct: 0.06, pctPerLevel: 0.0035, minPct: 0.05, maxPct: 0.22 },
  },
  {
    id: 'lu_a_siphon',
    tier: 'A',
    title: '深层吸血',
    variant: 'lifestealAdd',
    scale: { base: 0.04, perLevel: 0.0025, max: 0.15 },
  },
  {
    id: 'lu_a_evasion',
    tier: 'A',
    title: '鬼魅走位',
    variant: 'dodgeChanceAdd',
    scale: { base: 0.05, perLevel: 0.003, max: 0.18 },
  },
  {
    id: 'lu_a_magnet',
    tier: 'A',
    title: '广域拾取',
    variant: 'pickupRangeMult',
    scale: { basePct: 0.08, pctPerLevel: 0.004, minPct: 0.06, maxPct: 0.28 },
  },
  {
    id: 'lu_a_crit_mend',
    tier: 'A',
    title: '暴击回气',
    variant: 'critLifestealAdd',
    scale: { base: 0.06, perLevel: 0.0035, max: 0.2 },
  },

  // —— S：史诗 ——
  {
    id: LEVEL_UP_REVIVE_CARD_ID,
    tier: 'S',
    title: '绝处逢生',
    variant: 'revive',
    description: '本局可复活一次，复活后恢复约 50% 最大生命（获得后本局不再出现）',
  },
  {
    id: 'lu_s_crit_train',
    tier: 'S',
    title: '致命锤炼',
    variant: 'critOnHitDamageMult',
    scale: { basePct: 0.052, pctPerLevel: 0.0032, minPct: 0.04, maxPct: 0.2 },
  },
  {
    id: 'lu_s_armor',
    tier: 'S',
    title: '铜墙铁壁',
    variant: 'armorAdd',
    scale: { base: 4, perLevel: 0.25, min: 3, max: 15 },
  },
  {
    id: 'lu_s_thorns',
    tier: 'S',
    title: '反伤尖刺',
    variant: 'thornsDamageMult',
    scale: { basePct: 0.12, pctPerLevel: 0.006, minPct: 0.1, maxPct: 0.4 },
  },
  {
    id: 'lu_s_regen',
    tier: 'S',
    title: '战场疗养',
    variant: 'regenAdd',
    scale: { base: 0.42, perLevel: 0.042, min: 0.38, max: 1.55 },
  },
  {
    id: 'lu_s_loot',
    tier: 'S',
    title: '战利丰饶',
    variant: 'coinMult',
    scale: { basePct: 0.1, pctPerLevel: 0.005, minPct: 0.08, maxPct: 0.35 },
  },
  {
    id: 'lu_s_primary_dmg',
    tier: 'S',
    title: '主武器主宰',
    variant: 'rifleDamageMult',
    scale: { basePct: 0.08, pctPerLevel: 0.004, minPct: 0.06, maxPct: 0.35 },
  },
  {
    id: 'lu_s_reload',
    tier: 'S',
    title: '瞬时装填',
    variant: 'rifleReloadSpeedMult',
    scale: { basePct: 0.08, pctPerLevel: 0.004, minPct: 0.06, maxPct: 0.3 },
  },

  // —— SS：传说 ——
  {
    id: 'lu_ss_pierce',
    tier: 'SS',
    title: '纵深贯穿',
    variant: 'projectilePierceAdd',
    scale: { base: 2, perLevel: 0.08, min: 1.5, max: 6 },
  },
  {
    id: 'lu_ss_bounce',
    tier: 'SS',
    title: '连环跳弹',
    variant: 'projectileBounceAdd',
    scale: { base: 2, perLevel: 0.07, min: 1.5, max: 5 },
  },
  {
    id: 'lu_ss_desperate',
    tier: 'SS',
    title: '绝境反击',
    variant: 'lowHpDamageMult',
    scale: { basePct: 0.15, pctPerLevel: 0.008, minPct: 0.12, maxPct: 0.5 },
  },
  {
    id: 'lu_ss_hp',
    tier: 'SS',
    title: '生命扩容',
    variant: 'maxHp',
    scale: { base: 12, perLevel: 1.5, min: 10, max: 70 },
  },

  // —— SSS：神话 ——
  {
    id: 'lu_sss_overkill',
    tier: 'SSS',
    title: '毁伤极限',
    variant: 'damageMult',
    scale: { basePct: 0.08, pctPerLevel: 0.005, minPct: 0.06, maxPct: 0.4 },
  },
  {
    id: 'lu_sss_hp',
    tier: 'SSS',
    title: '生命洪流',
    variant: 'maxHp',
    scale: { base: 18, perLevel: 2.2, min: 15, max: 100 },
  },
  {
    id: 'lu_sss_crit',
    tier: 'SSS',
    title: '暴击终幕',
    variant: 'critOnHitDamageMult',
    scale: { basePct: 0.1, pctPerLevel: 0.006, minPct: 0.08, maxPct: 0.45 },
  },
];

/** 设计侧分类：图鉴/策划标注；`sharedWeapon` 在射击与近战局中均会出现 */
export type LevelUpCardDesignCategory = 'base' | 'sharedWeapon' | 'rangedWeapon' | 'meleeWeapon';

/** 返回模板的设计分类（与抽池规则一致，便于 UI/图鉴展示） */
export function levelUpTemplateDesignCategory(template: LevelUpCardTemplate): LevelUpCardDesignCategory {
  if (levelUpTemplateRangedWeaponOnly(template)) {
    return 'rangedWeapon';
  }
  if (levelUpTemplateMeleeWeaponOnly(template)) {
    return 'meleeWeapon';
  }
  switch (template.variant) {
    case 'rifleAttackSpeedMult':
    case 'rifleBulletCount':
    case 'rifleDamageMult':
    case 'projectilePierceAdd':
      return 'sharedWeapon';
    default:
      return 'base';
  }
}

/** 仅远程武器池：弹体跳弹、弹速、换弹（近战局内无对应效果） */
export function levelUpTemplateRangedWeaponOnly(template: LevelUpCardTemplate): boolean {
  return (
    template.variant === 'projectileBounceAdd' ||
    template.variant === 'rifleBulletSpeedMult' ||
    template.variant === 'rifleReloadSpeedMult'
  );
}

/** 仅近战武器池：独占 variant 出现时返回 true；当前无条目，与远程池互斥扩展用 */
export function levelUpTemplateMeleeWeaponOnly(_template: LevelUpCardTemplate): boolean {
  return false;
}

/**
 * 强化卡是否进入当前主武器对应的池：近战局剔除仅远程卡，射击局剔除仅近战卡（未来）；`base` 与 `sharedWeapon` 两类均进两池。
 * @param category - `PLAYER_WEAPON_DEFS[kind].category === 'melee'` 时为 `'melee'`，否则为 `'ranged'`
 */
export function levelUpTemplateMatchesWeaponCategory(
  template: LevelUpCardTemplate,
  category: 'melee' | 'ranged',
): boolean {
  if (category === 'melee') {
    return !levelUpTemplateRangedWeaponOnly(template);
  }
  return !levelUpTemplateMeleeWeaponOnly(template);
}

/**
 * @deprecated 使用 `levelUpTemplateRangedWeaponOnly` 或 `levelUpTemplateMatchesWeaponCategory`
 */
export function levelUpTemplateRequiresProjectileWeapon(template: LevelUpCardTemplate): boolean {
  return levelUpTemplateRangedWeaponOnly(template);
}

/** 图鉴与说明用短标签（与 `LevelUpCardDesignCategory` 一一对应） */
export const LEVEL_UP_CARD_DESIGN_CATEGORY_LABELS: Record<LevelUpCardDesignCategory, string> = {
  base: '基础能力',
  sharedWeapon: '主武器（射击/近战共用）',
  rangedWeapon: '远程专属',
  meleeWeapon: '近战专属',
};

/** 由 `levelUpTemplateDesignCategory` 划分的子池（与 `levelUpCardTemplates` 合取无重复、并集为全表） */
export const LEVEL_UP_CARD_POOL_BASE: readonly LevelUpCardTemplate[] = levelUpCardTemplates.filter(
  (t) => levelUpTemplateDesignCategory(t) === 'base',
);

export const LEVEL_UP_CARD_POOL_SHARED_WEAPON: readonly LevelUpCardTemplate[] = levelUpCardTemplates.filter(
  (t) => levelUpTemplateDesignCategory(t) === 'sharedWeapon',
);

export const LEVEL_UP_CARD_POOL_RANGED_WEAPON: readonly LevelUpCardTemplate[] = levelUpCardTemplates.filter(
  (t) => levelUpTemplateDesignCategory(t) === 'rangedWeapon',
);

export const LEVEL_UP_CARD_POOL_MELEE_WEAPON: readonly LevelUpCardTemplate[] = levelUpCardTemplates.filter(
  (t) => levelUpTemplateDesignCategory(t) === 'meleeWeapon',
);

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
        description: `主武器攻速 +${pctLabel(f)}（射击冷却与近战挥击间隔缩短，Lv${lv}）`,
        effect: { kind: 'rifleAttackSpeedMult', factor: f },
      };
    }
    case 'rifleBulletCount': {
      const add = bulletAddFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `射击时每轮多 ${add} 发弹丸（扇形散射，Lv${lv}）`,
        effect: { kind: 'rifleBulletCount', add },
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
        description: `运气 +${pctLabel(f)}，提升掉率；暴击率随运气增加（总和超过 100% 时溢出转为攻击力，Lv${lv}）`,
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
        description: `子弹飞行速度 +${pctLabel(f)}（Lv${lv}）`,
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
        description: `主武器伤害乘区 +${pctLabel(f)}（与全局伤害乘区叠乘，Lv${lv}）`,
        effect: { kind: 'rifleDamageMult', factor: f },
      };
    }
    case 'rifleReloadSpeedMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `换弹速度 +${pctLabel(f)}（Lv${lv}）`,
        effect: { kind: 'rifleReloadSpeedMult', factor: f },
      };
    }
    case 'dashSpeedMult': {
      const f = multFactorFromSpec(template.scale, lv);
      return {
        id: template.id,
        tier: template.tier,
        title: template.title,
        description: `冲刺移速 +${pctLabel(f)}，冲得更快更远（Lv${lv}）`,
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