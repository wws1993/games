/**
 * 图鉴静态文案与条目组装：核心参数前置、摘要行、详情扩展段；敌军/装备/主武器等与局内数值同源
 */
import {
  enemyGameConfig,
  ENEMY_KIND_ORDER,
  type EnemyKind,
  type EnemyStatConfig,
} from '../config/enemyConfig';
import {
  LEVEL_UP_CARD_DESIGN_CATEGORY_LABELS,
  LEVEL_UP_CARD_TIERS,
  levelUpCardTemplates,
  levelUpCardTierPresentation,
  levelUpTemplateDesignCategory,
  materializeLevelUpCard,
  type LevelUpCardDesignCategory,
  type LevelUpCardEffect,
  type LevelUpCardTier,
} from '../config/levelUpCardsConfig';
import { survivorBalance } from '../config/survivorBalance';
import {
  PLAYER_BASE_CRIT_CHANCE,
  PLAYER_BASE_MAX_HP,
  PLAYER_BASE_PICKUP_RADIUS,
  PLAYER_RADIUS,
  RIFLE_BASE_DAMAGE,
  RIFLE_COOLDOWN_SEC,
  PLAYER_BASE_SPEED,
  PLAYER_MOVE_SCALE,
} from '../survivor/constants';
import {
  GEAR_NORMAL_AFFIX_DEFS,
  GEAR_RARE_AFFIX_DEFS,
  type GearNormalAffixDef,
} from '../config/gearAffixConfig';
import { GEAR_EQUIPMENT_CATALOG } from '../config/gearEquipmentCatalog';
import { GEAR_GRADE_ORDER, totalAffixLinesForGrade } from '../config/gearGradeConfig';
import { GEAR_SET_DEFS } from '../config/gearSetConfig';
import type { GearDropSlotId } from '../config/gearSlotTypes';
import { enemyKindFill } from '../survivor/enemyWorldVisual';
import {
  PLAYER_WEAPON_CATEGORY_LABELS,
  PLAYER_WEAPON_DEFS,
  PLAYER_WEAPON_ORDER,
  type PlayerWeaponKind,
} from '../config/playerWeaponsConfig';
import {
  DADAO_DAMAGE_BONUS,
  DADAO_MOVE_BONUS,
  SHARPSHOOTER_CRIT_ADD,
  SHARPSHOOTER_DAMAGE_BONUS,
  YAN_SHUANGYING_ATTACK_SPEED_BONUS,
  YAN_SHUANGYING_RELOAD_SPEED_BONUS,
} from '../meta/playableHeroConfig';

/** 可操作主角图鉴立绘（与 `CodexUnitSprite` 中各 `SpriteHero*` 一一对应） */
export type CodexHeroPortraitKind =
  | 'hero_guerrilla'
  | 'hero_yan_shuangying'
  | 'hero_dadao_leader'
  | 'hero_sharpshooter';

/** 图鉴中立绘标识：可操作主角变体或具体敌兵种类（与局内 `enemyWorldVisual` 造型对应） */
export type CodexPortraitKind = CodexHeroPortraitKind | EnemyKind;

/** @returns 是否为可操作主角立绘（需传入存档配色与枪皮） */
export function isCodexHeroPortraitKind(k: CodexPortraitKind): k is CodexHeroPortraitKind {
  return (
    k === 'hero_guerrilla' ||
    k === 'hero_yan_shuangying' ||
    k === 'hero_dadao_leader' ||
    k === 'hero_sharpshooter'
  );
}

/** 图鉴分类：主角 / 主武器 / 敌军 / 升级卡 / 紫箱装备 / 词条池 */
export type CodexCategory = 'hero' | 'weapon' | 'enemy' | 'card' | 'gear' | 'affix';

/** 图鉴顶栏图标 Tab 与 `CodexCategoryTabIcon` 一一对应 */
export type CodexTabIconId = 'hero' | 'weapon' | 'enemy' | 'card' | 'gear' | 'affix';

/** 分类在界面上的短标签 + 图标键 */
export const CODEX_CATEGORY_TABS: { id: CodexCategory; label: string; iconId: CodexTabIconId }[] = [
  { id: 'hero', label: '主角', iconId: 'hero' },
  { id: 'weapon', label: '主武器', iconId: 'weapon' },
  { id: 'enemy', label: '怪物', iconId: 'enemy' },
  { id: 'card', label: '强化', iconId: 'card' },
  { id: 'gear', label: '装备', iconId: 'gear' },
  { id: 'affix', label: '词条', iconId: 'affix' },
];

/**
 * 分区标题文案：与条目数量拼成「可操作主角 | 共 N 名」
 * @deprecated 使用 `CODEX_CATEGORY_SUBJECT`
 */
export const CODEX_CATEGORY_SECTION_HINT: Record<CodexCategory, string> = {
  hero: '可操作角色与基础参数',
  weapon: '局内主武器分类与相对数值',
  enemy: '敌军兵种与刷新相关说明',
  card: '升级三选一中的强化卡',
  gear: '紫箱装备、等阶与套装',
  affix: '普通与稀有词条池',
};

/** 分类主题 + 数量单位（名/件/种/张） */
export const CODEX_CATEGORY_SUBJECT: Record<CodexCategory, { subject: string; unit: string }> = {
  hero: { subject: '可操作主角', unit: '名' },
  weapon: { subject: '主武器', unit: '种' },
  enemy: { subject: '怪物图鉴', unit: '种' },
  card: { subject: '升级强化卡', unit: '张' },
  gear: { subject: '紫箱装备资料', unit: '篇' },
  affix: { subject: '词条说明', unit: '篇' },
};

/** 图鉴详情底栏：解锁说明（当前无进度锁，与成就等可日后联动） */
const CODEX_UNLOCK_SECTION = [
  '【解锁条件】',
  '本图鉴资料默认全开，无需额外解锁；日后可与成就、战役进度等联动解锁隐藏条目。',
].join('\n');

/**
 * 拼「背景故事 / 技能与机制 / 解锁」三段，供图鉴 `detailExtra` 使用；首段为战役设定，次段指向正文机制。
 * @param background - 敌后战场与条目相关的背景叙事
 * @param mechanicsLine - 与局内数值、叠乘、操作相关的说明（避免与正文完全重复时可写摘要）
 */
/** 强化卡图鉴排序：设计分类 → 稀有度档位 → 标题（与列表分组顺序一致） */
function compareLevelUpCodexOrder(
  a: LevelUpCardDesignCategory,
  b: LevelUpCardDesignCategory,
  tierA: LevelUpCardTier,
  tierB: LevelUpCardTier,
  titleA: string,
  titleB: string,
): number {
  const ORDER: LevelUpCardDesignCategory[] = ['base', 'sharedWeapon', 'rangedWeapon', 'meleeWeapon'];
  const ia = ORDER.indexOf(a);
  const ib = ORDER.indexOf(b);
  if (ia !== ib) return ia - ib;
  const ta = LEVEL_UP_CARD_TIERS.indexOf(tierA);
  const tb = LEVEL_UP_CARD_TIERS.indexOf(tierB);
  if (ta !== tb) return ta - tb;
  return titleA.localeCompare(titleB, 'zh-CN');
}

function formatCodexDetailExtra(background: string, mechanicsLine: string): string {
  return [
    '【背景故事】',
    background,
    '',
    '【技能与机制说明】',
    mechanicsLine,
    '',
    CODEX_UNLOCK_SECTION,
  ].join('\n');
}

/** 单条核心参数（卡片内双列展示） */
export interface CodexCoreStatRow {
  label: string;
  value: string;
}

/** 单条图鉴 */
export interface CodexEntry {
  id: string;
  title: string;
  subtitle?: string;
  /** 多条目列表时的单行摘要 */
  listSummary?: string;
  body: string;
  accentColor: number;
  /** 优先展示的数值向参数 */
  coreStats?: CodexCoreStatRow[];
  /** 详情页在正文之下追加的说明块 */
  detailExtra?: string;
  /** 强化卡稀有度（仅 card 分类）；用于图鉴列表分档配色 */
  cardTier?: LevelUpCardTier;
  /** 强化卡池设计分类（仅 card 分类）；用于图鉴分组与「池分类」说明 */
  levelUpCardDesignCategory?: LevelUpCardDesignCategory;
  /** 与局内矢量小人一致的 SVG 立绘；未设置则不显示 */
  codexPortrait?: CodexPortraitKind;
  /** 主武器图鉴：与 `WeaponIcon` 键一致，用于列表/详情头图 */
  codexWeaponKind?: PlayerWeaponKind;
}

/** 敌人中文名与短设定（与 `EnemyKind` 一一对应） */
const ENEMY_CODEX_LORE: Record<EnemyKind, { name: string; lore: string }> = {
  infantry: {
    name: '日军步兵',
    lore: '制式三八式步枪与刺刀，集群压上；是战场上最常见的敌人。',
  },
  puppet: {
    name: '伪军',
    lore: '装备与训练参差不齐，单兵较弱但数量不少。',
  },
  dog: {
    name: '军犬',
    lore: '撕咬迅猛，移动极快，需优先拉开距离。',
  },
  cavalry: {
    name: '骑兵',
    lore: '机动性强，接触伤害高，迂回包抄时威胁大。',
  },
  mg: {
    name: '机枪兵',
    lore: '架设歪把子类轻机枪，在中距离以直线弹雨压制。',
  },
  artillery: {
    name: '炮兵',
    lore: '曲射炮弹落点爆炸，范围伤害；需留意落点与走位。',
  },
  officer: {
    name: '军官',
    lore: '高血量与高接触伤，击败后掉落大量经验宝石。',
  },
  sniper: {
    name: '日军狙击手',
    lore: '远距离点射，伤害高；接近前优先清除或走位打断其射界。',
  },
  grenadier: {
    name: '掷弹兵',
    lore: '投掷榴弹，小范围爆炸；注意落点与自身站位。',
  },
  engineer: {
    name: '工兵',
    lore: '机动快，常成小队突进；单发接触伤中等。',
  },
  heavy_infantry: {
    name: '重装步兵',
    lore: '厚血慢移，正面压力大；适合风筝或强化后再硬拼。',
  },
  scout_car: {
    name: '装甲侦察车',
    lore: '车体冲撞伤害高、速度快；拉开距离或利用障碍卡位。',
  },
  recon_plane: {
    name: '侦察机',
    lore: '低空盘旋，越障追击；血薄但极快，需及时点杀。',
  },
  fighter_plane: {
    name: '战斗机',
    lore: '航炮扫射，机动强；飞行单位不受土房阻挡。',
  },
  bomber_plane: {
    name: '轰炸机',
    lore: '投弹范围大、血量厚；见预警圈立刻撤离。',
  },
  gunship: {
    name: '攻击机',
    lore: '侧舷火力密集，射速快；优先集火或强生存硬顶。',
  },
  paratrooper: {
    name: '空降兵',
    lore: '伞降切入，高速越障；与步兵混编时威胁骤增。',
  },
  motor_scout: {
    name: '摩托侦察兵',
    lore: '两轮高速沿公路与田埂穿插，接触伤害不低，需提前占点或逼离公路。',
  },
  military_police: {
    name: '宪兵',
    lore: '纠察与押运，装备手枪与短枪；血厚于一般步兵，常护军官与补给。',
  },
  mortar_team: {
    name: '迫击炮组',
    lore: '曲射小口径迫击炮，射速快于山炮；落点范围小于炮兵但仍需走位规避。',
  },
  light_tank: {
    name: '轻型坦克',
    lore: '小履带与短管炮，正面冲撞与碾压伤害极高；优先风筝或集火侧后。',
  },
};

/** 各敌兵在敌后战场上的战役语境（与 `EnemyKind` 一一对应，供图鉴底栏） */
const ENEMY_CAMPAIGN_LORE: Record<EnemyKind, string> = {
  infantry:
    '日军步兵在扫荡、护路与据点巡逻中最常见，沿公路与田埂推进；是麻雀战与伏击中最常交火的对手。',
  puppet:
    '伪军与治安军常配合日军清乡抢粮，装备与士气参差，多为被迫裹挟，但枪弹与告密同样致命。',
  dog: '军犬用于追踪足迹与警戒村口，扫荡队进山时常为先导；被咬中往往意味着位置暴露与合围将至。',
  cavalry: '骑兵在平原与谷地快速迂回，马蹄声与马刀在追击与合围中威胁极大，需提前占住隘口或竹林。',
  mg: '机枪兵占据土坡、屋脊与工事，以直线弹雨封锁开阔地，迫使小队绕行、强突或烟幕掩护。',
  artillery: '曲射炮击村镇外围与集结点，爆炸与落点压迫走位，象征日军重火力下乡与「强化治安」。',
  officer:
    '军官与指挥员携带较高经验与补给，是我军与民兵在伏击、破袭交通线时的优先目标之一。',
  sniper: '狙击手占据制高点与树线，以冷枪迟滞行动；与「敌后冷枪」的斗法贯穿整个敌占区山脊与屋顶。',
  grenadier: '掷弹兵投掷榴弹清角与掩体后，多见于巷战与阵地争夺，小范围爆炸逼迫离开矮墙。',
  engineer: '工兵与轻装突击小队，破门与架桥快，与步兵混编时常冲在最前，机动与纠缠兼备。',
  heavy_infantry: '重装步兵防护厚、移动慢，正面推进时压迫感强，多见于封锁沟墙与拔点作战。',
  scout_car:
    '装甲侦察车在公路上高速机动，车体冲撞与车载火力威胁平坦地带；需利用土房与弯道卡位。',
  recon_plane:
    '侦察机低空盘旋、越障追击，代表日军对山区的空中监视与校射，击落或驱赶可减轻后续压力。',
  fighter_plane:
    '战斗机航炮扫射与俯冲，机动强；对抗需依赖地形遮蔽、及时点杀或分散队形。',
  bomber_plane:
    '轰炸机投弹覆盖大范围，多见于「扫荡」高潮的火力展示；见预警圈须立刻撤离落点。',
  gunship:
    '攻击机侧舷火力密集，对集结与移动纵队威胁最大；需优先集火或依赖生存与强控词条硬顶。',
  paratrooper:
    '空降兵突袭后方交通与指挥部，高速越障并与步兵混编，象征特种作战与封锁升级。',
  motor_scout:
    '摩托侦察沿封锁沟与公路快速通报我军位置，扫荡队进山前常为先导；被咬住往往意味着合围将至。',
  military_police:
    '宪兵押运、纠察与护点，手枪与短枪近战凶悍；伴随军官与车队出现，象征占领区治安强化。',
  mortar_team:
    '迫击炮曲射田埂与屋角后，射界灵活、装填快于山炮；麻雀战与拔点中需优先敲掉炮组。',
  light_tank:
    '轻型坦克沿公路与平地推进，车体冲撞与短管火力威胁集结点；缺乏重武器时需地形与集火侧后。',
};

/** 格式化敌人出现时间说明 */
function enemySpawnNote(kind: EnemyKind): string {
  const sec = enemyGameConfig.spawnByKind[kind].unlockAfterSec;
  if (sec <= 0) {
    return '开局即可进入刷新池。';
  }
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  if (s === 0) {
    return `约 ${min} 分钟起进入刷新池。`;
  }
  return `约 ${min} 分 ${s} 秒起进入刷新池。`;
}

/** 局内与图鉴共用的怪物移速（配置表 × `survivorBalance.enemy.moveSpeedScale`） */
function enemyMoveSpeedDisplay(st: EnemyStatConfig): string {
  const esp = survivorBalance.enemy.moveSpeedScale;
  const mul = Number.isFinite(esp) && esp > 0 ? esp : 1;
  return String(Math.round(st.speed * mul));
}

/** 由配置表拼敌人数值说明 */
function enemyStatBlock(kind: EnemyKind): string {
  const st = enemyGameConfig.stats[kind];
  const lines = [
    `基础生命：${st.baseHp}（局内随存活分钟递增）`,
    `移动速度：${enemyMoveSpeedDisplay(st)}`,
    `接触伤害：${st.contactDamage}`,
    `经验倍率：×${st.gemMultiplier}`,
    `碰撞半径：${st.radius}`,
  ];
  if (st.ranged) {
    const rt = st.ranged.type === 'mg' ? '机枪直射' : '炮弹落点爆炸';
    lines.push(
      `远程：${rt}，伤害 ${st.ranged.damage}，间隔 ${st.ranged.cooldownSec}s，射程 ${st.ranged.attackRange}，弹速 ${st.ranged.projSpeed}`,
    );
    if (st.ranged.shellBlastRadius != null) {
      lines.push(`爆炸半径：${st.ranged.shellBlastRadius}`);
    }
  }
  if (st.ignoresObstacles) {
    lines.push('移动：飞行/空降单位，直线追击且不被土房障碍阻挡。');
  }
  lines.push(enemySpawnNote(kind));
  return lines.join('\n');
}

function enemyCoreStats(kind: EnemyKind): CodexCoreStatRow[] {
  const st = enemyGameConfig.stats[kind];
  const rows: CodexCoreStatRow[] = [
    { label: '基础生命', value: String(st.baseHp) },
    { label: '移动速度', value: enemyMoveSpeedDisplay(st) },
    { label: '接触伤害', value: String(st.contactDamage) },
    { label: '经验倍率', value: `×${st.gemMultiplier}` },
    { label: '碰撞半径', value: String(st.radius) },
  ];
  if (st.ranged) {
    rows.push({
      label: st.ranged.type === 'mg' ? '远程伤害' : '炮击伤害',
      value: String(st.ranged.damage),
    });
    rows.push({ label: '远程间隔', value: `${st.ranged.cooldownSec}s` });
    rows.push({ label: '攻击距离', value: String(st.ranged.attackRange) });
  }
  if (st.ignoresObstacles) {
    rows.push({ label: '移动特性', value: '越障（飞行）' });
  }
  return rows;
}

/** 升级卡效果补充一行说明 */
function cardEffectLine(effect: LevelUpCardEffect): string {
  if (effect.kind === 'damageMult') {
    return `效果：伤害 ×${effect.factor.toFixed(2)}（可多次叠加）`;
  }
  if (effect.kind === 'moveSpeedMult') {
    return `效果：移速 ×${effect.factor.toFixed(2)}（可多次叠加）`;
  }
  if (effect.kind === 'maxHp') {
    return `效果：生命上限 +${effect.add}（当前与上限同时增加）`;
  }
  if (effect.kind === 'rifleAttackSpeedMult') {
    return `效果：步枪射速 ×${effect.factor.toFixed(2)}（冷却缩短，可叠加）`;
  }
  if (effect.kind === 'rifleBulletCount') {
    return `效果：步枪每轮发射数 +${effect.add}（扇形多发，有上限）`;
  }
  if (effect.kind === 'pushObstacles') {
    return `效果：贴土房同向移动蓄力约 1 秒后低速推动；获得后本局不再出现在升级选项中`;
  }
  if (effect.kind === 'critOnHitDamageMult') {
    return `效果：暴击命中时再 ×${effect.factor.toFixed(2)}（在基础暴击倍率之上，可叠乘；数值随升级等级变化）`;
  }
  if (effect.kind === 'armorAdd') {
    return `效果：护甲 +${effect.add.toFixed(1)}（承伤按 100/(100+护甲) 衰减）`;
  }
  if (effect.kind === 'expMult') {
    return `效果：经验获取 ×${effect.factor.toFixed(2)}`;
  }
  if (effect.kind === 'coinMult') {
    return `效果：幸运 ×${effect.factor.toFixed(2)}（配置称金币，与幸运卡叠乘）`;
  }
  if (effect.kind === 'luckMult') {
    return `效果：幸运 ×${effect.factor.toFixed(2)}（影响掉率；暴击率随运气换算，超过 100% 部分转为攻击力）`;
  }
  if (effect.kind === 'pickupRangeMult') {
    return `效果：拾取范围 ×${effect.factor.toFixed(2)}`;
  }
  if (effect.kind === 'lifestealAdd') {
    return `效果：吸血 +${Math.round(effect.add * 100)}%（命中伤害转治疗）`;
  }
  if (effect.kind === 'dodgeChanceAdd') {
    return `效果：闪避 +${Math.round(effect.add * 100)}%`;
  }
  if (effect.kind === 'revive') {
    return `效果：本局可复活一次；获得后本局不再出现在升级选项中`;
  }
  if (effect.kind === 'projectilePierceAdd') {
    return `效果：穿透 +${effect.add}`;
  }
  if (effect.kind === 'knockbackMult') {
    return `效果：击退 ×${effect.factor.toFixed(2)}`;
  }
  if (effect.kind === 'regenAdd') {
    return `效果：每秒回复 +${effect.add.toFixed(1)}`;
  }
  if (effect.kind === 'thornsDamageMult') {
    return `效果：反伤倍率 ×${effect.factor.toFixed(2)}（按实际掉血 ×(倍率-1) 反弹）`;
  }
  if (effect.kind === 'rifleBulletSpeedMult') {
    return `效果：步枪弹速 ×${effect.factor.toFixed(2)}`;
  }
  if (effect.kind === 'killHealAdd') {
    return `效果：击杀 +${effect.add.toFixed(1)} 生命`;
  }
  if (effect.kind === 'dashCooldownMult') {
    return `效果：冲刺冷却 ×${effect.factor.toFixed(2)}（小于 1 为缩短）`;
  }
  if (effect.kind === 'projectileBounceAdd') {
    return `效果：子弹反弹 +${effect.add}（撞土房或穿透用尽时撞敌人镜面反弹，每次消耗 1 次）`;
  }
  if (effect.kind === 'rifleDamageMult') {
    return `效果：步枪伤害 ×${effect.factor.toFixed(2)}`;
  }
  if (effect.kind === 'rifleReloadSpeedMult') {
    return `效果：换弹速度 ×${effect.factor.toFixed(2)}（步枪冷却缩短）`;
  }
  if (effect.kind === 'dashSpeedMult') {
    return `效果：冲刺速度 ×${effect.factor.toFixed(2)}`;
  }
  if (effect.kind === 'hurtInvincibleMult') {
    return `效果：受伤无敌时长 ×${effect.factor.toFixed(2)}`;
  }
  if (effect.kind === 'lowHpDamageMult') {
    return `效果：低血量（≤30%）步枪伤害 ×${effect.factor.toFixed(2)}`;
  }
  if (effect.kind === 'critLifestealAdd') {
    return `效果：暴击时额外吸血 +${Math.round(effect.add * 100)}%`;
  }
  const _exhaustive: never = effect;
  return _exhaustive;
}

/** 普通词条一行展示（区间取配置 min/max） */
function formatNormalAffixCodexLine(d: GearNormalAffixDef): string {
  let v: string;
  if (d.unitPercent) {
    v = `${(d.min * 100).toFixed(1)}%～${(d.max * 100).toFixed(1)}%`;
  } else if (d.fractionDigits !== undefined) {
    v = `${d.min.toFixed(d.fractionDigits)}～${d.max.toFixed(d.fractionDigits)}`;
  } else {
    v = `${Math.round(d.min)}～${Math.round(d.max)}`;
  }
  return `· ${d.labelTpl.replace('{0}', v)}（${d.id}）`;
}

/** 套装图鉴风味说明，与 `GEAR_SET_DEFS` 中 `id` 对应 */
function gearSetCodexLore(setId: string): string {
  switch (setId) {
    case 'set_tiexue':
      return '「铁血先锋」对应敢死与正面强突的着装传统：加厚肩垫、绑腿与简易护甲，象征以火力与体魄撕开突破口。';
    case 'set_yexi':
      return '「暗影猎手」对应侦察与冷枪小队：深色披风、软底鞋与改制照门，强调先敌发现、先敌开火。';
    case 'set_judi':
      return '「根据地之光」对应后方机关与民兵骨干：补丁被面、公文包改制的弹药袋与节约弹药的准星，象征经验与群众路线的加成。';
    case 'set_fanshang':
      return '「荆棘卫垒」：嵌片胸甲与外翻刺钉，把敌人倾泻的火力一部分楔回给对方。';
    case 'set_xixue':
      return '「血契追猎」：血槽与补偿簧、改大觇孔的照门，让每次命中与补刀都带回一点生机。';
    case 'set_danmu':
      return '「弹幕交响」：多管排架、分流托弹与加宽扇形准星，把一次齐射铺成火网。';
    default:
      return '套装主题。';
  }
}

/** 紫箱装备分类：掉落规则、等阶表、套装、配置表说明 */
function buildCodexGearEntries(): CodexEntry[] {
  const catCount = GEAR_EQUIPMENT_CATALOG.length;
  const setPieceTotal = GEAR_SET_DEFS.length * 9;
  const setParts = GEAR_SET_DEFS.map((s) =>
    [
      `【${s.name}】`,
      `· 三件套：${s.bonus3}`,
      `· 六件套：${s.bonus6}`,
      `· 九件套：${s.bonus9}`,
      '',
    ].join('\n'),
  ).join('\n');

  const tierLines = GEAR_GRADE_ORDER.map((g) => {
    const n = totalAffixLinesForGrade(g);
    const mk = g === 'S' || g === 'SS' || g === 'SSS';
    return `· ${g} 档：单件 ${n} 条词条${n > 0 ? '（每条含属性与 T1～T4 等级）' : ''}${mk ? '（可出现套装件）' : ''}`;
  }).join('\n');

  return [
    {
      id: 'gear_chest',
      title: '紫箱与掉落',
      listSummary: '击杀概率掉紫箱；开箱件数与等阶随敌等级变化…',
      accentColor: 0x9a70d8,
      coreStats: [
        { label: '配置表条目', value: `${catCount} 件` },
        { label: '单箱件数', value: '1～5（随敌等级）' },
        { label: '等阶', value: 'E～SSS' },
      ],
      body: [
        '击杀敌人有概率在其附近掉落紫色装备箱；拾取后装备入库，并展示本次掉落的若干件装备词条；在「装备」页穿戴后，词条聚合作用于局内。',
        '',
        '· 开箱件数：随被击杀敌人等级提高，最少 1 件、最多 5 件；等级越高，高阶（A～SSS）出现权重略升。',
        '· 部位：从九部位（头盔、躯干、护肩、主战、副武、护手、腰带、战靴、饰物）中随机。',
        '· 词条条数：E～B 档无词条；A=1、S=2、SS=3、SSS=4 条；属性从普通与稀有合并池随机，每条再随机词条等级 T1～T4（数值在该属性 min～max 内按档取子区间）。',
        '· 同一件内词条属性不重复优先；各数值合计入档案供局外加成聚合。',
        '',
        `「配置表」共收录 ${catCount} 条独立装备命名，含散件与套装件；套装仅出现在 S / SS / SSS 档。`,
      ].join('\n'),
      detailExtra: formatCodexDetailExtra(
        '紫箱象征从伏击、破袭与秘密交通线运回的战利品：被服、护具、瞄准具与修械所改装件混装其中。开箱所见并非「魔法掉落」，而是根据地兵工厂与缴获物资管理的抽象呈现。',
        '掉落概率、件数与等阶规则见上文；入库后在「装备」页穿戴，词条与套装加成在局内即时结算。',
      ),
    },
    {
      id: 'gear_grade',
      title: '等阶与词条条数',
      listSummary: 'E～B 无词条；A～SSS 为 1～4 条并带 T1～T4…',
      accentColor: 0xc9a020,
      coreStats: GEAR_GRADE_ORDER.map((g) => ({
        label: `${g} 档`,
        value: `${totalAffixLinesForGrade(g)} 条`,
      })),
      body: [
        '装备等阶从 E 到 SSS 共 8 档；E～B 仅有基础命名与套装归属，无随机词条；A 起每条词条随机属性与 T1～T4 等级。',
        '展示上仍分普通行与稀有两类，便于阅读；掉落时从合并池抽取。',
        '',
        tierLines,
      ].join('\n'),
      detailExtra: formatCodexDetailExtra(
        '等阶 E～SSS 表示缴获完整度与修械所改装程度：从勉强堪用的单件，到接近主力部队与定制件的高阶护具与火器附件。',
        '词条条数与等级随机规则见正文；局外加成由词条数值合计聚合。',
      ),
    },
    ...GEAR_SET_DEFS.map((s) => ({
      id: `gear_set_${s.id}`,
      title: s.name,
      subtitle: '套装加成',
      listSummary: `${s.bonus3.slice(0, 18)}…`,
      accentColor: 0xe05838,
      coreStats: [
        { label: '三件套', value: s.bonus3 },
        { label: '六件套', value: s.bonus6 },
        { label: '九件套', value: s.bonus9 },
      ],
      body: [
        `套装 id：${s.id}。`,
        '同一套内装备需为 S 级及以上档位才会出现套装标识；集齐同套多件可激活对应件数加成（文案与数值以局内为准）。',
        '',
        `「三件套」${s.bonus3}`,
        `「六件套」${s.bonus6}`,
        `「九件套」${s.bonus9}`,
      ].join('\n'),
      detailExtra: formatCodexDetailExtra(
        gearSetCodexLore(s.id),
        '套装件仅出现在 S 级及以上档位；件数加成与数值以局内装备页与战斗结算为准。',
      ),
    })),
    {
      id: 'gear_library',
      title: '装备配置表概览',
      listSummary: `${catCount} 条命名，含六套九部位套装…`,
      accentColor: 0x6a9a5a,
      coreStats: [
        { label: '总条目', value: String(catCount) },
        { label: '套装件', value: `${setPieceTotal}（六套×九部位）` },
        { label: '散件', value: String(catCount - setPieceTotal) },
      ],
      body: [
        '游戏内装备库为静态配置表：每条含 id、展示名、部位、等阶与是否归属某套装。',
        '掉落时从「部位 + 等阶」匹配池中随机一条模板，再按该档位 roll 词条。',
        '',
        '六套套装对应 S / SS / SSS 档的九部位命名前缀（铁血、夜袭、根据地、荆棘、血契、弹幕）；同档另有试制 / 特供 / 功勋散件（无套装），与套装件共用「部位 + 等阶」池随机；其余为 E～A 各档散件，按部位轮转命名。',
        '',
        setParts,
      ].join('\n'),
      detailExtra: formatCodexDetailExtra(
        '配置表中的命名对应根据地兵工厂档案：每件装备有固定部位与可选套装归属，掉落时从「部位 + 等阶」池中匹配模板，再 roll 词条。',
        '上述六套为九部位成套命名；其余为各档散件，按部位轮转。具体 id 与展示名以配置表为准。',
      ),
    },
  ];
}

/** 各主武器一句话风味说明（与 `PlayerWeaponKind` 一一对应） */
const WEAPON_CODEX_LORE: Record<PlayerWeaponKind, string> = {
  type38: '三八式步枪：均衡栓动手感，中距离自动瞄准。',
  mauser_c96: '驳壳枪：射速快、弹匣适中，近距离压制。',
  hanyang_88: '汉阳造：略重单发，伤害与射程兼顾。',
  zhongzheng: '中正式：精度略优的制式步枪。',
  thompson: '手提机枪：高射速大弹容，扫射散布大。',
  double_barrel: '双管猎枪：两发霰弹，贴脸爆发。',
  mosin_style: '骑步枪：慢射高伤，带穿透。',
  burp_gun: '冲锋枪：极高射速与弹容，中近距泼水。',
  colt_revolver: '左轮：一次多弹丸扇形，换弹节奏明显。',
  lever_action: '拉杆猎枪：射速与单发伤害折中。',
  hunting_musket: '土抬杆：单发大威力，装填长。',
  heavy_crossbow: '重弩：极慢但高伤高穿透。',
  pepperbox: '多管独撅：一次喷出多弹，近距糊脸。',
  anti_tank_rifle: '战防枪：超重弹，单发毁灭级伤害。',
  bren_style: '轻机枪：大弹容三连点射，持续输出。',
  pistol_fast: '快机手枪：小弹匣高射速点射。',
  sawn_off: '截短喷：两发霰弹，极近距离清场。',
  throwing_blade: '飞刀：投掷弧线小，带穿透。',
  red_tassel_dart: '红缨镖：直线高速，带穿透。',
  iron_pipe_gun: '铁匠土铳：单发土制火器，伤害高换弹慢。',
  dao_broadsword: '大刀：宽弧挥砍，一刀可扫多名敌人。',
  spear_red_tassel: '红缨枪：长刺窄弧，穿透段数多。',
  bayonet_spike: '拼刺刀：短距高频突刺，体力槽小。',
};

/** 各主武器在敌后缴获、修械与民间武装中的战役语境（与 `PlayerWeaponKind` 一一对应） */
const WEAPON_CAMPAIGN_LORE: Record<PlayerWeaponKind, string> = {
  type38:
    '三八式步枪为日军制式，敌后最常见的缴获来源之一。游击队员熟悉表尺与后坐，弹药金贵时仍能在中距离「瞄稳再扣」。',
  mauser_c96:
    '驳壳枪与各地仿品在侦察员与短兵相接场景广泛使用，弹匣虽小，贴身速射能在突围时撕开缺口。',
  hanyang_88:
    '汉阳造结构简单，根据地修械所常用来补缺。单发沉稳，适合弹药紧张、以冷枪迟滞敌人的打法。',
  zhongzheng:
    '中正式融合毛瑟与国军制式经验，精度与杀伤略优；多从伪军反正、战役缴获或秘密渠道流入敌后。',
  thompson:
    '手提机枪来自援助或战利品，泼水压制能短暂封住通道与街口，但弹药消耗极快，须省着用。',
  double_barrel:
    '猎枪与土制霰弹在村口与谷地常见，两发贴脸足以放倒小队先锋；打空即换位置，避免被骑兵与军犬咬住。',
  mosin_style:
    '骑步枪枪身长、弹药动能大，适合开阔地伏击与穿透薄掩体后的敌人，亦多见于北方战场流入。',
  burp_gun:
    '冲锋枪在巷战与冲锋时如虎添翼，高射速意味着散热与补给压力，需把握突进距离与撤离路线。',
  colt_revolver:
    '左轮一次多弹、扇形出膛，混战中不求首发必中，只求先敌开火、打乱队形。',
  lever_action:
    '拉杆枪结构紧凑，射速与单发伤害折中，适合游走射击、追逃与青纱帐里的短促交火。',
  hunting_musket:
    '土抬杆装填漫长，单发铅弹却足以震慑集群；多用于据守隘口、冷枪点名与节约火药。',
  heavy_crossbow:
    '重弩无声，适合夜间摸哨与节约弹药；上弦费力，近距压制与穿透力却足以弥补射速。',
  pepperbox:
    '多管独撅一次性喷出多弹，巷战拐角与极近距离清场时「一喷了事」，随后须迅速脱离。',
  anti_tank_rifle:
    '战防枪弹体巨大，可威胁车辆与重甲目标；单发后坐与携行负担极高，须算好射界与撤离。',
  bren_style:
    '轻机枪三连点射、弹链或弹匣供弹，在运动战与村落防御中提供持续火力掩护。',
  pistol_fast:
    '快机手枪可连发，短点射与单发切换，常作副武器或侦察员贴身火力。',
  sawn_off:
    '截短枪管与枪托便于隐蔽携行，极近距爆发不讲道理，适合摸哨与屋内突入。',
  throwing_blade:
    '飞刀源于武人与民兵操练，弧线小、可穿透，适合静默拔除哨兵与节省枪声。',
  red_tassel_dart:
    '红缨镖直线高速，可穿透多名敌人，与投掷术、准绳训练结合，是弹药匮乏时的补充手段。',
  iron_pipe_gun:
    '铁匠以铁管与火药凑合而成的土铳，单发伤害高但风险大；敌后极度缺枪时的应急与象征。',
  dao_broadsword:
    '大刀与抗战记忆相连，宽弧挥砍可扫多名敌人；白刃相接时不依赖弹药，却考验距离与胆气。',
  spear_red_tassel:
    '红缨枪长刺窄弧、穿透段数多，在青纱帐与土坡间与步兵周旋，亦利于拒马与戳刺载具薄弱处。',
  bayonet_spike:
    '拼刺刀短刺高频，贴近白刃节奏；体力槽短，象征刺刀见红、以命换命的瞬间决断。',
};

/** 主武器图鉴正文：与 `playerWeaponsConfig`、`constants` 同源 */
function buildWeaponCodexBody(kind: PlayerWeaponKind): string {
  const w = PLAYER_WEAPON_DEFS[kind];
  const cat = PLAYER_WEAPON_CATEGORY_LABELS[w.category];
  const intervalSec = (RIFLE_COOLDOWN_SEC * w.cooldownScale).toFixed(2);
  const refDmg = (RIFLE_BASE_DAMAGE * w.damageMult).toFixed(1);
  const lines: string[] = [];
  lines.push(`玩法分类：${cat}。`);
  lines.push(`索敌/关注距离：约 ${w.focusRangePx} 像素（可与升级、装备中的射程加成叠加）。`);
  if (w.category === 'melee') {
    const halfDeg = ((w.meleeArcHalfRad ?? 0) * 180) / Math.PI;
    lines.push(
      `近战挥击：扇形半角约 ${halfDeg.toFixed(0)}°，刃口最远约 ${w.meleeRangePx ?? 0} 像素；无弹体，暴击与吸血与射击流共用规则。`,
    );
    lines.push(
      `体力槽：${w.magazineSize}（打空后换弹时间压满）；换弹基准 ${w.reloadSec}s；每轮冷却相对基准 ×${w.cooldownScale.toFixed(2)}（基准间隔 ${RIFLE_COOLDOWN_SEC}s，再受射速、宝箱等乘子影响）。`,
    );
    lines.push(`伤害倍率：×${w.damageMult.toFixed(2)}（相对 RIFLE_BASE_DAMAGE，参考约 ${refDmg} 点/击）。`);
    lines.push(`挥击穿透：额外可连斩 ${w.pierceExtra} 名敌人（与升级穿透等叠加后按局内结算）。`);
  } else {
    lines.push(
      `射击间隔：相对基准 ×${w.cooldownScale.toFixed(2)}（约 ${intervalSec}s 一轮起步，再受射速、换弹速度、宝箱等乘子影响）。`,
    );
    lines.push(`伤害倍率：×${w.damageMult.toFixed(2)}（参考单发约 ${refDmg} 点相对 RIFLE_BASE_DAMAGE）。`);
    lines.push(`每轮齐射弹丸数：${w.baseBulletCount}（升级「散射」等在 1 基础上增加，总上限 12）。`);
    lines.push(
      `散布半宽：${w.spreadRad.toFixed(2)} 弧度；弹速 ×${w.bulletSpeedMult.toFixed(2)}；弹体半径 ×${w.bulletRadiusMult.toFixed(2)}。`,
    );
    lines.push(`穿透：额外 ${w.pierceExtra} 名敌人；弹匣 ${w.magazineSize}；换弹基准 ${w.reloadSec}s。`);
  }
  lines.push('', WEAPON_CODEX_LORE[kind]);
  return lines.join('\n');
}

/** 主武器图鉴列表用核心参数 */
function weaponCodexCoreStats(kind: PlayerWeaponKind): CodexCoreStatRow[] {
  const w = PLAYER_WEAPON_DEFS[kind];
  const rows: CodexCoreStatRow[] = [
    { label: '分类', value: PLAYER_WEAPON_CATEGORY_LABELS[w.category] },
    { label: '索敌', value: `${w.focusRangePx}px` },
    { label: '冷却×', value: w.cooldownScale.toFixed(2) },
    { label: '伤害×', value: w.damageMult.toFixed(2) },
    { label: w.category === 'melee' ? '体力' : '弹匣', value: String(w.magazineSize) },
  ];
  if (w.category === 'melee') {
    rows.push({ label: '挥击距', value: `${w.meleeRangePx ?? 0}px` });
  } else {
    rows.push({ label: '单轮弹丸', value: String(w.baseBulletCount) });
  }
  return rows;
}

/** 由配置表生成主武器图鉴条目（顺序与 `PLAYER_WEAPON_ORDER` 一致） */
function buildCodexWeaponEntries(): CodexEntry[] {
  return PLAYER_WEAPON_ORDER.map((kind) => {
    const w = PLAYER_WEAPON_DEFS[kind];
    return {
      id: `w_${kind}`,
      title: w.displayName,
      subtitle: PLAYER_WEAPON_CATEGORY_LABELS[w.category],
      listSummary: WEAPON_CODEX_LORE[kind],
      accentColor: w.bulletColor,
      coreStats: weaponCodexCoreStats(kind),
      body: buildWeaponCodexBody(kind),
      detailExtra: formatCodexDetailExtra(
        WEAPON_CAMPAIGN_LORE[kind],
        '局内数值、弹道与近战扇形见上文；可与装备词条、升级卡、套装效果叠乘；Q/E 切换已解锁武器。',
      ),
      codexWeaponKind: kind,
    };
  });
}

/** 词条分类：普通池与稀有池全文 */
function buildCodexAffixEntries(): CodexEntry[] {
  const normalBody = [
    '以下为紫箱装备可 roll 到的普通词条池（数值为区间内随机，以局内掉落为准）：',
    '',
    ...GEAR_NORMAL_AFFIX_DEFS.map((d) => formatNormalAffixCodexLine(d)),
  ].join('\n');

  const rareBody = [
    '以下为稀有词条池（高等级装备更易出现；部分为静态效果描述）：',
    '',
    ...GEAR_RARE_AFFIX_DEFS.map((d) => {
      if (d.min !== undefined && d.max !== undefined) {
        let v: string;
        if (d.unitPercent) {
          v = `${(d.min * 100).toFixed(0)}%～${(d.max * 100).toFixed(0)}%`;
        } else if (d.fractionDigits !== undefined) {
          v = `${d.min.toFixed(d.fractionDigits)}～${d.max.toFixed(d.fractionDigits)}`;
        } else {
          v = `${Math.round(d.min)}～${Math.round(d.max)}`;
        }
        return `· ${d.labelTpl.replace('{0}', v)}（${d.id}）`;
      }
      return `· ${d.labelTpl}（${d.id}）`;
    }),
  ].join('\n');

  return [
    {
      id: 'affix_normal',
      title: '普通词条池',
      listSummary: `${GEAR_NORMAL_AFFIX_DEFS.length} 种随机数值词条…`,
      accentColor: 0x5a8a9a,
      coreStats: [{ label: '词条种类', value: `${GEAR_NORMAL_AFFIX_DEFS.length} 种` }],
      body: normalBody,
      detailExtra: formatCodexDetailExtra(
        '普通词条对应护具上的补丁、背带松紧、垫肩厚度、简易照门与土法校准等「战地改装」，数值在配置区间内随机 roll。',
        '同一件装备可多条同类词条相加；与稀有词条、套装加成按局内公式叠算。',
      ),
    },
    {
      id: 'affix_rare',
      title: '稀有词条池',
      listSummary: `${GEAR_RARE_AFFIX_DEFS.length} 种特殊效果…`,
      accentColor: 0xb84878,
      coreStats: [{ label: '词条种类', value: `${GEAR_RARE_AFFIX_DEFS.length} 种` }],
      body: rareBody,
      detailExtra: formatCodexDetailExtra(
        '稀有词条象征老兵经验、特殊弹药配发、情报加成与非常规护具（如加厚护心、改制枪架），高阶装备更易出现。',
        '部分为固定描述效果，部分为数值区间；具体以局内掉落与装备页说明为准。',
      ),
    },
  ];
}

/** 某分类下图鉴条数（用于 Tab 角标） */
export function getCodexCategoryCount(category: CodexCategory): number {
  return getCodexEntries(category).length;
}

/** 装备图鉴条目 id → 部位剪影（列表缩略与详情头图） */
export function slotIdForGearCodexEntryId(entryId: string): GearDropSlotId {
  if (entryId.startsWith('gear_set_')) {
    return 'torso';
  }
  switch (entryId) {
    case 'gear_chest':
      return 'trinket';
    case 'gear_grade':
      return 'belt';
    case 'gear_library':
      return 'helmet';
    default:
      return 'torso';
  }
}

/** 按分类返回图鉴条目列表 */
export function getCodexEntries(category: CodexCategory): CodexEntry[] {
  const moveWorld = Math.round(PLAYER_BASE_SPEED * PLAYER_MOVE_SCALE);
  const rof = (1 / RIFLE_COOLDOWN_SEC).toFixed(1);

  if (category === 'hero') {
    return [
      {
        id: 'hero_default',
        title: '游击队员',
        subtitle: '可操作主角',
        listSummary: '敌后作战，自动步枪索敌射击，靠走位与强化卡成长。',
        accentColor: 0x5a9a5a,
        coreStats: [
          { label: '生命上限', value: String(PLAYER_BASE_MAX_HP) },
          { label: '移动速度', value: `${moveWorld}（世界单位/秒）` },
          { label: '基础攻击', value: `${RIFLE_BASE_DAMAGE}（单发，可强化）` },
          { label: '射击间隔', value: `${RIFLE_COOLDOWN_SEC}s（约 ${rof} 发/秒）` },
          { label: '碰撞半径', value: String(PLAYER_RADIUS) },
          { label: '拾取范围', value: String(PLAYER_BASE_PICKUP_RADIUS) },
          { label: '防御', value: '—（未实装）' },
          {
            label: '暴击率',
            value: `${Math.round(PLAYER_BASE_CRIT_CHANCE * 100)}% 起（装备/运气/被动等；总和可超 100%，溢出转攻）`,
          },
        ],
        body: [
          '敌后作战的八路军战士，依靠走位与主武器在重围中生存、成长。',
          '',
          '操作：虚拟摇杆或 WASD；Q / E 在已解锁主武器间循环切换；升级时从随机强化卡中选一项。',
          '主武器：默认三八式步枪；手枪弹匣偏小、冲锋枪射速高、近战为扇形挥击无弹体等，详见「主武器」图鉴。',
          '装备：击杀掉落紫箱装备入库；首页「装备」以九宫格穿戴九部位，词条聚合为承伤、生命、移速、步枪与暴击等加成。',
          '套装与稀有词条见紫箱装备图鉴；阵亡时结算本局统计。',
        ].join('\n'),
        detailExtra: formatCodexDetailExtra(
          [
            '故事发生在华北—华中一带的敌后：日军占据交通线与据点，频繁扫荡抢粮；八路军、地方武装与民兵依托村落、青纱帐、山地与秘密交通线坚持游击战。',
            '你是一名与主力暂时失散的游击队员，在反扫荡与破袭任务中独自深入敌占区边缘。公路、土房与开阔地之间，日军步兵、伪军、骑兵乃至空中力量轮番施压；唯有依靠走位、缴获与情报，把每一发子弹与每一次升级都用在刀刃上。',
            '图鉴中的「战术升级」并非天降神迹，而是战斗间隙的整训：老兵带新兵、缴获心得与弹药再分配，被抽象为一张张强化卡。',
          ].join('\n'),
          '操作与成长机制见上文；主武器与装备见对应图鉴；「防御」栏位为预留，当前局内未单独实装独立防御数值。',
        ),
        codexPortrait: 'hero_guerrilla',
      },
      {
        id: 'hero_yan_shuangying',
        title: '燕双鹰',
        subtitle: '玩法角色 · 双枪',
        listSummary: '仅手枪武器池；持手枪时攻速与换弹强化。',
        accentColor: 0x6a5a8a,
        coreStats: [
          { label: '持手枪攻速', value: `+${Math.round(YAN_SHUANGYING_ATTACK_SPEED_BONUS * 100)}%` },
          { label: '持手枪换弹', value: `+${Math.round(YAN_SHUANGYING_RELOAD_SPEED_BONUS * 100)}%` },
          { label: '武器池', value: '手枪类（Q/E 双槽）' },
          { label: '生命等基础', value: '与游击队员相同表' },
        ],
        body: [
          '选用后在局内仅可使用手枪类主武器：Q / E 在已解锁手枪间切换；若尚未从紫箱缴获足够手枪，系统仍会提供驳壳枪与快机手枪供双槽使用。',
          '',
          `持手枪类主武器时「攻速 +2」「换弹 +2」：在乘区上各约 +${Math.round(YAN_SHUANGYING_ATTACK_SPEED_BONUS * 100)}%（与紫装步枪射速、换弹速度词条叠乘）；非手枪不享受。`,
          '在商店「玩法角色」中切换；造型配色皮肤对游击队员外观仍生效，燕双鹰有独立局内矢量配色。',
        ].join('\n'),
        detailExtra: formatCodexDetailExtra(
          '经典双枪形象，敌后战场上的传奇射手；本作为玩法向演绎，与具体影视作品无关。',
          '具体解锁与选用见商店；图鉴数值为被动近似说明，以局内为准。',
        ),
        codexPortrait: 'hero_yan_shuangying',
      },
      {
        id: 'hero_dadao_leader',
        title: '大刀队长',
        subtitle: '玩法角色 · 近战',
        listSummary: '仅近战武器池；持近战时移速与挥砍伤害。',
        accentColor: 0xc04038,
        coreStats: [
          { label: '持近战移速', value: `+${Math.round(DADAO_MOVE_BONUS * 100)}%` },
          { label: '持近战伤害', value: `+${Math.round(DADAO_DAMAGE_BONUS * 100)}%` },
          { label: '武器池', value: '近战（大刀/枪/刺刀）' },
          { label: '生命等基础', value: '与游击队员相同表' },
        ],
        body: [
          '选用后局内仅可使用近战类主武器：扇形挥砍、体力槽与拼刺节奏见「主武器」图鉴。',
          '若尚未缴获足够近战，系统仍会提供大刀、红缨枪、拼刺刀供 Q/E 轮换。',
          '',
          `持近战主武器时：移速约 +${Math.round(DADAO_MOVE_BONUS * 100)}%、挥砍伤害乘区约 +${Math.round(DADAO_DAMAGE_BONUS * 100)}%（与升级卡、紫装叠乘）。`,
        ].join('\n'),
        detailExtra: formatCodexDetailExtra(
          '敌后武工队与民兵中的刀术骨干：白刃接敌、掩护突围；本作为玩法演绎。',
          '选用见商店「玩法角色」；数值以局内为准。',
        ),
        codexPortrait: 'hero_dadao_leader',
      },
      {
        id: 'hero_sharpshooter',
        title: '神枪手',
        subtitle: '玩法角色 · 精准射系',
        listSummary: '步枪/骑射/重狙池；持该类武器时暴击与伤害。',
        accentColor: 0x4a8a5a,
        coreStats: [
          { label: '持精准射暴击', value: `+${Math.round(SHARPSHOOTER_CRIT_ADD * 100)}%` },
          { label: '持精准射伤害', value: `+${Math.round(SHARPSHOOTER_DAMAGE_BONUS * 100)}%` },
          { label: '武器池', value: '步枪·骑射·战防枪' },
          { label: '生命等基础', value: '与游击队员相同表' },
        ],
        body: [
          '选用后局内仅可使用「步枪、骑步枪、战防枪」分类：不含手枪、冲锋枪与近战；三八式、汉阳造、骑步枪等按解锁顺序出现在 Q/E。',
          '若缴获不足，系统仍会提供三八式、汉阳造、骑步枪作为兜底。',
          '',
          `持步枪/骑射/重狙类主武器时：暴击率 +${Math.round(SHARPSHOOTER_CRIT_ADD * 100)} 个百分点（与强化卡、紫装暴击叠算后封顶 100%）；射击伤害乘区约 +${Math.round(SHARPSHOOTER_DAMAGE_BONUS * 100)}%；其它分类不享受。`,
        ].join('\n'),
        detailExtra: formatCodexDetailExtra(
          '冷枪与伏击中的精确射手：表尺、风偏与心跳压进一次击发；玩法上偏站桩输出与爆头节奏。',
          '选用见商店；战防枪弹速慢、需把握射界。',
        ),
        codexPortrait: 'hero_sharpshooter',
      },
    ];
  }
  if (category === 'weapon') {
    return buildCodexWeaponEntries();
  }
  if (category === 'enemy') {
    return ENEMY_KIND_ORDER.map((kind) => {
      const { name, lore } = ENEMY_CODEX_LORE[kind];
      return {
        id: `e_${kind}`,
        title: name,
        listSummary: lore,
        accentColor: enemyKindFill(kind),
        coreStats: enemyCoreStats(kind),
        body: `${lore}\n\n${enemyStatBlock(kind)}`,
        detailExtra: formatCodexDetailExtra(
          ENEMY_CAMPAIGN_LORE[kind],
          '刷新时间、血量成长与远程参数见上文；随本局存活时间解锁更高威胁兵种，不同作战模式影响兵种权重。',
        ),
        codexPortrait: kind,
      };
    });
  }
  if (category === 'gear') {
    return buildCodexGearEntries();
  }
  if (category === 'affix') {
    return buildCodexAffixEntries();
  }
  if (category === 'card') {
    const sorted = [...levelUpCardTemplates].sort((a, b) =>
      compareLevelUpCodexOrder(
        levelUpTemplateDesignCategory(a),
        levelUpTemplateDesignCategory(b),
        a.tier,
        b.tier,
        a.title,
        b.title,
      ),
    );
    return sorted.map((t) => {
      const mid = materializeLevelUpCard(t, 10);
      const early = materializeLevelUpCard(t, 4);
      const late = materializeLevelUpCard(t, 24);
      const cat = levelUpTemplateDesignCategory(t);
      return {
        id: `c_${t.id}`,
        title: t.title,
        subtitle: `稀有度 ${levelUpCardTierPresentation[t.tier].label}`,
        listSummary: mid.description,
        cardTier: t.tier,
        levelUpCardDesignCategory: cat,
        accentColor: levelUpCardTierPresentation[t.tier].rim,
        coreStats: [
          { label: '稀有度', value: levelUpCardTierPresentation[t.tier].label },
          { label: '池分类', value: LEVEL_UP_CARD_DESIGN_CATEGORY_LABELS[cat] },
          { label: '类型', value: '升级强化卡（随 Lv 成长）' },
        ],
        body: [
          mid.description,
          '',
          '升级三选一时按「达成该级后的角色 Lv」结算数值，等级越高单卡越强。',
          `示例：Lv4 时 ${early.description}`,
          `示例：Lv24 时 ${late.description}`,
          '',
          cardEffectLine(mid.effect),
        ].join('\n'),
        detailExtra: formatCodexDetailExtra(
          '每一张强化卡代表一次临阵抉择：缴获的弹药怎么分、先修枪还是先补被服、跟老班长学哪一招。抽象为数值后，即是本局「战术升级」三选一。',
          '具体效果与随等级成长的数值见正文与卡面；可叠加性以「效果」行为准；部分一次性能力（如推土房、复活）获得后本局不再出现。局内池：近战局不会出现「远程专属」项；射击局不会出现「近战专属」项（当前无近战独占卡）。',
        ),
      };
    });
  }
  throw new Error(`Unexpected codex category: ${String(category)}`);
}
