/**
 * 图鉴静态文案与条目组装：核心参数前置、摘要行、详情扩展段；与局内数值同源
 */
import {
  enemyGameConfig,
  ENEMY_KIND_ORDER,
  type EnemyKind,
  type EnemyStatConfig,
} from '../config/enemyConfig';
import {
  levelUpCardPool,
  levelUpCardTierPresentation,
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
  RIFLE_BULLET_RADIUS,
  RIFLE_BULLET_SPEED,
  RIFLE_COOLDOWN_SEC,
  PLAYER_BASE_SPEED,
  PLAYER_MOVE_SCALE,
} from '../survivor/constants';
import { enemyKindFill } from '../survivor/enemyWorldVisual';

/** 图鉴四大分类 */
export type CodexCategory = 'hero' | 'weapon' | 'enemy' | 'card';

/** 分类在界面上的短标签 */
export const CODEX_CATEGORY_TABS: { id: CodexCategory; label: string }[] = [
  { id: 'hero', label: '主角' },
  { id: 'weapon', label: '武器' },
  { id: 'enemy', label: '怪物' },
  { id: 'card', label: '强化卡' },
];

/**
 * 分区标题文案：与条目数量拼成「可操作主角 | 共 N 名」
 * @deprecated 使用 `CODEX_CATEGORY_SUBJECT`
 */
export const CODEX_CATEGORY_SECTION_HINT: Record<CodexCategory, string> = {
  hero: '可操作角色与基础参数',
  weapon: '当前实装武器与数值',
  enemy: '敌军兵种与刷新相关说明',
  card: '升级三选一中的强化卡',
};

/** 分类主题 + 数量单位（名/件/种/张） */
export const CODEX_CATEGORY_SUBJECT: Record<CodexCategory, { subject: string; unit: string }> = {
  hero: { subject: '可操作主角', unit: '名' },
  weapon: { subject: '武器', unit: '件' },
  enemy: { subject: '怪物图鉴', unit: '种' },
  card: { subject: '强化卡', unit: '张' },
};

/** 详情页底部占位：背景/技能/解锁（当前资料默认全开） */
export const CODEX_DETAIL_PLACEHOLDER = [
  '【背景故事】',
  '后续版本将在此收录角色与武器的战役背景与历史设定。',
  '',
  '【技能说明】',
  '局内实际能力以战斗表现为准；升级卡与武器机制见正文。',
  '',
  '【解锁条件】',
  '当前图鉴资料默认全开，无需额外解锁；日后可与成就、关卡进度联动。',
].join('\n');

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
  if (effect.kind === 'critChanceAdd') {
    return `效果：步枪暴击几率 +${Math.round(effect.add * 100)}%（多张累加，封顶 100%）`;
  }
  if (effect.kind === 'pushObstacles') {
    return `效果：贴土房同向移动蓄力约 1 秒后低速推动；获得后本局不再出现在升级选项中`;
  }
  return `效果：暴击命中时再 ×${effect.factor.toFixed(2)}（在基础暴击倍率之上，可叠乘）`;
}

/** 某分类下图鉴条数（用于 Tab 角标） */
export function getCodexCategoryCount(category: CodexCategory): number {
  return getCodexEntries(category).length;
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
          { label: '暴击率', value: `${Math.round(PLAYER_BASE_CRIT_CHANCE * 100)}%（可由强化卡提升）` },
        ],
        body: [
          '敌后作战的八路军战士，依靠走位与三八式步枪在重围中生存、成长。',
          '',
          '操作：虚拟摇杆或 WASD；升级时从随机强化卡中选一项。',
        ].join('\n'),
        detailExtra: CODEX_DETAIL_PLACEHOLDER,
      },
    ];
  }
  if (category === 'weapon') {
    const r = survivorBalance.rifle.maxRange;
    return [
      {
        id: 'w_rifle',
        title: '三八式步枪',
        subtitle: '默认主武器 · 自动瞄准射击',
        listSummary: '进射程自动射击最近敌人；有冷却与射程，子弹可被障碍阻挡。',
        accentColor: 0xd4a848,
        coreStats: [
          { label: '单发伤害', value: String(RIFLE_BASE_DAMAGE) },
          { label: '射击间隔', value: `${RIFLE_COOLDOWN_SEC}s` },
          { label: '最大射程', value: String(r) },
          { label: '弹速', value: String(RIFLE_BULLET_SPEED) },
          { label: '弹体半径', value: String(RIFLE_BULLET_RADIUS) },
        ],
        body: [
          '有敌人进入射程时自动朝最近目标射击；无目标时不走冷却，避免进射程瞬间连发。',
          '',
          '伤害受「强化射击」等卡片影响；射速受「扣扳机」等影响；可被土房类障碍阻挡。',
        ].join('\n'),
        detailExtra: CODEX_DETAIL_PLACEHOLDER,
      },
    ];
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
        detailExtra: CODEX_DETAIL_PLACEHOLDER,
      };
    });
  }
  return levelUpCardPool.map((c) => ({
    id: `c_${c.id}`,
    title: c.title,
    subtitle: `稀有度 ${levelUpCardTierPresentation[c.tier].label}`,
    listSummary: c.description,
    cardTier: c.tier,
    accentColor: levelUpCardTierPresentation[c.tier].rim,
    coreStats: [
      { label: '稀有度', value: levelUpCardTierPresentation[c.tier].label },
      { label: '类型', value: '升级强化卡' },
    ],
    body: `${c.description}\n\n${cardEffectLine(c.effect)}`,
    detailExtra: CODEX_DETAIL_PLACEHOLDER,
  }));
}
