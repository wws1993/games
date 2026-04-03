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
  levelUpCardTemplates,
  levelUpCardTierPresentation,
  materializeLevelUpCard,
  type LevelUpCardEffect,
  type LevelUpCardTier,
} from '../config/levelUpCardsConfig';
import {
  PLAYER_WEAPON_DEFS,
  PLAYER_WEAPON_ORDER,
} from '../config/playerWeaponsConfig';
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
import { enemyKindFill } from '../survivor/enemyWorldVisual';

/** 图鉴中立绘标识：游击队员或具体敌兵种类（与局内 `enemyWorldVisual` 造型对应） */
export type CodexPortraitKind = 'hero' | EnemyKind;

/** 图鉴分类：主角 / 主武器 / 敌军 / 升级卡 / 紫箱装备 / 词条池 */
export type CodexCategory = 'hero' | 'weapon' | 'enemy' | 'card' | 'gear' | 'affix';

/** 分类在界面上的短标签 */
export const CODEX_CATEGORY_TABS: { id: CodexCategory; label: string }[] = [
  { id: 'hero', label: '主角' },
  { id: 'weapon', label: '武器' },
  { id: 'enemy', label: '怪物' },
  { id: 'card', label: '强化' },
  { id: 'gear', label: '装备' },
  { id: 'affix', label: '词条' },
];

/**
 * 分区标题文案：与条目数量拼成「可操作主角 | 共 N 名」
 * @deprecated 使用 `CODEX_CATEGORY_SUBJECT`
 */
export const CODEX_CATEGORY_SECTION_HINT: Record<CodexCategory, string> = {
  hero: '可操作角色与基础参数',
  weapon: '20 种主武器与基准数值',
  enemy: '敌军兵种与刷新相关说明',
  card: '升级三选一中的强化卡',
  gear: '紫箱装备、等阶与套装',
  affix: '普通与稀有词条池',
};

/** 分类主题 + 数量单位（名/件/种/张） */
export const CODEX_CATEGORY_SUBJECT: Record<CodexCategory, { subject: string; unit: string }> = {
  hero: { subject: '可操作主角', unit: '名' },
  weapon: { subject: '主武器', unit: '件' },
  enemy: { subject: '怪物图鉴', unit: '种' },
  card: { subject: '升级强化卡', unit: '张' },
  gear: { subject: '紫箱装备资料', unit: '篇' },
  affix: { subject: '词条说明', unit: '篇' },
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
  /** 与局内矢量小人一致的 SVG 立绘；未设置则不显示 */
  codexPortrait?: CodexPortraitKind;
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
  if (effect.kind === 'critChanceAdd') {
    return `效果：步枪暴击几率 +${Math.round(effect.add * 100)}%（多张累加，封顶 100%）`;
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
    return `效果：幸运 ×${effect.factor.toFixed(2)}（影响装备箱掉落概率等）`;
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
    return `效果：子弹障碍反弹 +${effect.add}（撞土房时镜面反弹，每次消耗 1 次）`;
  }
  if (effect.kind === 'rifleDamageMult') {
    return `效果：步枪伤害 ×${effect.factor.toFixed(2)}`;
  }
  if (effect.kind === 'rifleCritChanceAdd') {
    return `效果：步枪暴击 +${Math.round(effect.add * 100)}%`;
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

/** 紫箱装备分类：掉落规则、等阶表、套装、配置表说明 */
function buildCodexGearEntries(): CodexEntry[] {
  const catCount = GEAR_EQUIPMENT_CATALOG.length;
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
    return `· ${g} 档：单件共 ${n} 条词条${mk ? '（可出现套装件）' : ''}`;
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
        '· 词条条数：等阶 E 为 1 条，每升一档 +1；高阶会掺入稀有词条池。',
        '· 词条数值：按等阶与随机区间 roll，同一件内可多条同类词条相加。',
        '',
        `「配置表」共收录 ${catCount} 条独立装备命名，含散件与套装件；套装仅出现在 S / SS / SSS 档。`,
      ].join('\n'),
      detailExtra: CODEX_DETAIL_PLACEHOLDER,
    },
    {
      id: 'gear_grade',
      title: '等阶与词条条数',
      listSummary: 'E～SSS，每升一档多一条词条…',
      accentColor: 0xc9a020,
      coreStats: GEAR_GRADE_ORDER.map((g) => ({
        label: `${g} 档`,
        value: `${totalAffixLinesForGrade(g)} 条`,
      })),
      body: [
        '装备等阶从 E 到 SSS 共 8 档；单件总词条数 = 档位列顺序（E=1 … SSS=8）。',
        '高阶会拆分普通词条与稀有词条，稀有条语义更强（如吸血、护盾等）。',
        '',
        tierLines,
      ].join('\n'),
      detailExtra: CODEX_DETAIL_PLACEHOLDER,
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
      detailExtra: CODEX_DETAIL_PLACEHOLDER,
    })),
    {
      id: 'gear_library',
      title: '装备配置表概览',
      listSummary: `${catCount} 条命名，含三套九部位套装…`,
      accentColor: 0x6a9a5a,
      coreStats: [
        { label: '总条目', value: String(catCount) },
        { label: '套装件', value: '27（三套×九部位）' },
        { label: '散件', value: String(catCount - 27) },
      ],
      body: [
        '游戏内装备库为静态配置表：每条含 id、展示名、部位、等阶与是否归属某套装。',
        '掉落时从「部位 + 等阶」匹配池中随机一条模板，再按该档位 roll 词条。',
        '',
        '三套套装分别对应 S / SS / SSS 档的九部位命名前缀（铁血、夜袭、根据地）；其余为各档散件，按部位轮转命名。',
        '',
        setParts,
      ].join('\n'),
      detailExtra: CODEX_DETAIL_PLACEHOLDER,
    },
  ];
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
      detailExtra: CODEX_DETAIL_PLACEHOLDER,
    },
    {
      id: 'affix_rare',
      title: '稀有词条池',
      listSummary: `${GEAR_RARE_AFFIX_DEFS.length} 种特殊效果…`,
      accentColor: 0xb84878,
      coreStats: [{ label: '词条种类', value: `${GEAR_RARE_AFFIX_DEFS.length} 种` }],
      body: rareBody,
      detailExtra: CODEX_DETAIL_PLACEHOLDER,
    },
  ];
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
          '操作：虚拟摇杆或 WASD；Q / E 在已解锁武器间切换；升级时从随机强化卡中选一项。',
          '装备：击杀掉落紫箱装备入库；首页「装备」以九宫格穿戴九部位，词条聚合为承伤、生命、移速、步枪与暴击等加成；主武器局内为三八式。',
          '套装与稀有词条见紫箱装备图鉴；阵亡时结算本局统计。',
        ].join('\n'),
        detailExtra: CODEX_DETAIL_PLACEHOLDER,
        codexPortrait: 'hero',
      },
    ];
  }
  if (category === 'weapon') {
    const r = survivorBalance.rifle.maxRange;
    return PLAYER_WEAPON_ORDER.map((wk) => {
      const w = PLAYER_WEAPON_DEFS[wk];
      const interval = (RIFLE_COOLDOWN_SEC * w.cooldownScale).toFixed(2);
      const dmg = Math.round(RIFLE_BASE_DAMAGE * w.damageMult);
      const pierceLabel =
        w.pierceExtra <= 0 ? '无' : `可穿 ${w.pierceExtra + 1} 敌`;
      return {
        id: `w_${wk}`,
        title: w.displayName,
        subtitle: '主武器 · 索敌自动射击',
        listSummary: w.codexSummary,
        accentColor: w.bulletColor,
        coreStats: [
          { label: '基准单发伤害', value: String(dmg) },
          { label: '射击间隔(基准×)', value: `${interval}s` },
          { label: '弹丸数(基准)', value: String(w.baseBulletCount) },
          { label: '穿透', value: pierceLabel },
          { label: '弹速×', value: w.bulletSpeedMult.toFixed(2) },
          { label: '弹径×', value: w.bulletRadiusMult.toFixed(2) },
          { label: '最大射程', value: String(r) },
        ],
        body: [
          w.codexSummary,
          '',
          '局内按 Q / E 循环切换；升级「散射」在武器固有弹数上再增加弹丸；射速卡缩短冷却。',
          '有敌人进入射程时自动朝最近目标射击；无目标时不消耗冷却。子弹可被土房障碍阻挡。',
        ].join('\n'),
        detailExtra: CODEX_DETAIL_PLACEHOLDER,
      };
    });
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
  return levelUpCardTemplates.map((t) => {
    const mid = materializeLevelUpCard(t, 10);
    const early = materializeLevelUpCard(t, 4);
    const late = materializeLevelUpCard(t, 24);
    return {
      id: `c_${t.id}`,
      title: t.title,
      subtitle: `稀有度 ${levelUpCardTierPresentation[t.tier].label}`,
      listSummary: mid.description,
      cardTier: t.tier,
      accentColor: levelUpCardTierPresentation[t.tier].rim,
      coreStats: [
        { label: '稀有度', value: levelUpCardTierPresentation[t.tier].label },
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
      detailExtra: CODEX_DETAIL_PLACEHOLDER,
    };
  });
}
