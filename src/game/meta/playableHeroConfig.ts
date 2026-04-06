/**
 * 玩法角色（与商店「外观」解耦）：决定局内武器池、被动加成与矢量配色；`selectedCharacterId` 仍为纯外观皮肤
 */
import type { PlayerVectorPalette } from './metaUnlockShopConfig';
import { DEFAULT_PLAYER_VECTOR_PALETTE } from './metaUnlockShopConfig';
import { PLAYER_WEAPON_DEFS, type PlayerWeaponCategory, type PlayerWeaponKind } from '../config/playerWeaponsConfig';

/** 可操作玩法角色 id */
export type PlayableHeroId =
  | 'guerrilla'
  | 'yan_shuangying'
  | 'dadao_leader'
  | 'sharpshooter';

/** 默认：敌后游击队员（全主武器解锁池） */
export const DEFAULT_PLAYABLE_HERO_ID: PlayableHeroId = 'guerrilla';

/** 燕双鹰：仅手枪池、被动攻速/换弹 */
export const YAN_SHUANGYING_HERO_ID: PlayableHeroId = 'yan_shuangying';

/** 大刀队长：仅近战；被动移速与伤害 */
export const DADAO_LEADER_HERO_ID: PlayableHeroId = 'dadao_leader';

/** 神枪手：步枪/骑射/重狙池；被动暴击与步枪伤害 */
export const SHARPSHOOTER_HERO_ID: PlayableHeroId = 'sharpshooter';

/** 列表顺序即商店与下拉展示顺序 */
export const PLAYABLE_HERO_ORDER: readonly PlayableHeroId[] = [
  'guerrilla',
  'yan_shuangying',
  'dadao_leader',
  'sharpshooter',
];

const HERO_ID_SET = new Set<string>(PLAYABLE_HERO_ORDER);

/** Q/E 武器池过滤方式（与 `getUnlockedWeaponKindsOrdered` 一致） */
export type PlayableHeroWeaponFilter = 'all' | 'pistol_only' | 'melee_only' | 'precision_rifle';

/** 单条玩法角色：价格、说明与商店展示；局内数值被动见 `getPlayableHeroWeaponPassive`（按当前主武器分类生效） */
export interface PlayableHeroDef {
  id: PlayableHeroId;
  name: string;
  description: string;
  costCoins: number;
  /** 局内矢量配色（非游击队员时覆盖外观皮肤底色） */
  palette: PlayerVectorPalette;
  /** Q/E 可用武器子集 */
  weaponFilter: PlayableHeroWeaponFilter;
}

/** 玩法角色在当前主武器分类下的被动乘区（与紫装/升级卡独立乘算） */
export interface PlayableHeroWeaponPassive {
  /** 攻速乘子（>1 更快），叠入射击/近战间隔分母 */
  attackSpeedMul: number;
  /** 换弹速度乘子（>1 更快） */
  reloadSpeedMul: number;
  /** 移速乘子 */
  moveSpeedMul: number;
  /** 主武器伤害乘子（叠 `rifleDamageMult` 与基础伤害） */
  damageMul: number;
  /** 暴击率加算（0～1）；子弹在发射时写入 `Bullet.heroCritChanceAdd` 快照 */
  critChanceAdd: number;
}

/** 燕双鹰被动：攻速 +2、换弹 +2 → 各 +20% 乘区 */
export const YAN_SHUANGYING_ATTACK_SPEED_BONUS = 0.2;
export const YAN_SHUANGYING_RELOAD_SPEED_BONUS = 0.2;

/** 大刀队长：移速 / 伤害被动系数 */
export const DADAO_MOVE_BONUS = 0.12;
export const DADAO_DAMAGE_BONUS = 0.08;

/** 神枪手：暴击 / 伤害被动系数 */
export const SHARPSHOOTER_CRIT_ADD = 0.08;
export const SHARPSHOOTER_DAMAGE_BONUS = 0.06;

export const PLAYABLE_HERO_DEFS: readonly PlayableHeroDef[] = [
  {
    id: 'guerrilla',
    name: '游击队员',
    description: '全主武器解锁池，均衡型。',
    costCoins: 0,
    palette: DEFAULT_PLAYER_VECTOR_PALETTE,
    weaponFilter: 'all',
  },
  {
    id: 'yan_shuangying',
    name: '燕双鹰',
    description:
      '仅可携带手枪；双枪位 Q/E 切换。持手枪类主武器时：攻速与换弹各约 +20%（其它分类不享受）。',
    costCoins: 0,
    palette: {
      uniformBody: 0x3a3a42,
      uniformShadow: 0x2a2a32,
      skin: 0xc8a888,
      capBody: 0x1a1a22,
      capBrim: 0x101018,
      capStar: 0x888888,
      belt: 0x4a4038,
      legCloth: 0x2a2830,
      outline: 0x0a0a10,
    },
    weaponFilter: 'pistol_only',
  },
  {
    id: 'dadao_leader',
    name: '大刀队长',
    description: '仅近战（大刀、红缨枪、拼刺刀）。持近战主武器时：移速约 +12%、挥砍伤害约 +8%。',
    costCoins: 0,
    palette: {
      uniformBody: 0x5a2820,
      uniformShadow: 0x3a1810,
      skin: 0xb88868,
      capBody: 0x4a2018,
      capBrim: 0x321810,
      capStar: 0xe82820,
      belt: 0x5a4030,
      legCloth: 0x3a2820,
      outline: 0x1a1008,
    },
    weaponFilter: 'melee_only',
  },
  {
    id: 'sharpshooter',
    name: '神枪手',
    description:
      '仅步枪、骑步枪、战防枪等精准射系。持步枪/骑射/重狙类主武器时：暴击约 +8%、射击伤害约 +6%。',
    costCoins: 0,
    palette: {
      uniformBody: 0x4a5a48,
      uniformShadow: 0x344038,
      skin: 0xc0a080,
      capBody: 0x2d4034,
      capBrim: 0x243028,
      capStar: 0xf0c040,
      belt: 0x4a4838,
      legCloth: 0x323828,
      outline: 0x1c2018,
    },
    weaponFilter: 'precision_rifle',
  },
];

/** @param id - 任意字符串，合法玩法角色 id 时返回定义 */
export function getPlayableHeroDef(id: string | undefined): PlayableHeroDef | undefined {
  if (!id || !HERO_ID_SET.has(id)) {
    return undefined;
  }
  return PLAYABLE_HERO_DEFS.find((d) => d.id === id);
}

/** 与 `getUnlockedWeaponKindsOrdered` 中神枪手池一致：步枪、骑射、重型狙击分类 */
function isPrecisionRifleCategory(cat: PlayerWeaponCategory): boolean {
  return cat === 'rifle' || cat === 'marksman' || cat === 'sniper';
}

/** 依玩法角色与当前主武器分类返回局内被动乘区（攻速/换弹/移速/伤害/暴击），与紫装、升级卡独立乘算 */
export function getPlayableHeroWeaponPassive(
  heroId: string | undefined,
  weaponKind: PlayerWeaponKind,
): PlayableHeroWeaponPassive {
  const empty: PlayableHeroWeaponPassive = {
    attackSpeedMul: 1,
    reloadSpeedMul: 1,
    moveSpeedMul: 1,
    damageMul: 1,
    critChanceAdd: 0,
  };
  if (!heroId || !HERO_ID_SET.has(heroId)) {
    return empty;
  }
  const cat = PLAYER_WEAPON_DEFS[weaponKind].category;
  if (heroId === 'guerrilla') {
    return empty;
  }
  if (heroId === 'yan_shuangying') {
    if (cat === 'pistol') {
      return {
        attackSpeedMul: 1 + YAN_SHUANGYING_ATTACK_SPEED_BONUS,
        reloadSpeedMul: 1 + YAN_SHUANGYING_RELOAD_SPEED_BONUS,
        moveSpeedMul: 1,
        damageMul: 1,
        critChanceAdd: 0,
      };
    }
    return empty;
  }
  if (heroId === 'dadao_leader') {
    if (cat === 'melee') {
      return {
        attackSpeedMul: 1,
        reloadSpeedMul: 1,
        moveSpeedMul: 1 + DADAO_MOVE_BONUS,
        damageMul: 1 + DADAO_DAMAGE_BONUS,
        critChanceAdd: 0,
      };
    }
    return empty;
  }
  if (heroId === 'sharpshooter') {
    if (isPrecisionRifleCategory(cat)) {
      return {
        attackSpeedMul: 1,
        reloadSpeedMul: 1,
        moveSpeedMul: 1,
        damageMul: 1 + SHARPSHOOTER_DAMAGE_BONUS,
        critChanceAdd: SHARPSHOOTER_CRIT_ADD,
      };
    }
    return empty;
  }
  return empty;
}

/** 是否燕双鹰（局内武器池与被动分支） */
export function isYanShuangyingHero(id: string | undefined): boolean {
  return id === YAN_SHUANGYING_HERO_ID;
}

/** 游击队员用外观皮肤配色；其余玩法角色用各自 `palette` */
export function usesCharacterSkinPalette(heroId: PlayableHeroId): boolean {
  return heroId === DEFAULT_PLAYABLE_HERO_ID;
}
