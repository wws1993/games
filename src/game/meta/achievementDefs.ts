/**
 * 成就 id、文案与「通关」所需单局存活秒数（无真正胜利界面时，以存活时长近似通关）
 */

/** 单局存活达到该秒数且本局阵亡时，视为完成一次「通关」并解锁「第一滴血」 */
export const ACHIEVEMENT_FIRST_CLEAR_SURVIVAL_SEC = 300;

/** 累计作战时长（秒）达到该值解锁「鏖战沙场」 */
export const ACHIEVEMENT_TOTAL_PLAY_1H_SEC = 3600;

/** 累计作战时长（秒）达到该值解锁「鏖战无休」 */
export const ACHIEVEMENT_TOTAL_PLAY_2H_SEC = 7200;

/** 单局最长存活（秒）达到该值解锁「屹立不倒」 */
export const ACHIEVEMENT_BEST_SURVIVAL_180_SEC = 180;

/** 单局最长存活（秒）达到该值解锁「钢铁意志」 */
export const ACHIEVEMENT_BEST_SURVIVAL_600_SEC = 600;

export type AchievementId =
  | 'first_clear'
  | 'kills_100'
  | 'kills_1000'
  | 'kills_10000'
  | 'kills_50000'
  | 'kills_100000'
  | 'sessions_10'
  | 'sessions_50'
  | 'sessions_100'
  | 'total_play_1h'
  | 'total_play_2h'
  | 'best_survival_180'
  | 'best_survival_600'
  | 'purple_stash_50'
  | 'purple_stash_100'
  | 'purple_stash_200'
  | 'nine_equipped'
  | 'lock_10'
  | 'die_once'
  | 'die_20';

/** 单条成就定义（是否已解锁由存档统计推导） */
export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
}

/** 固定列表顺序展示 */
export const ACHIEVEMENT_DEFS: readonly AchievementDef[] = [
  {
    id: 'first_clear',
    title: '第一滴血',
    description: `首次通关：单局存活满 ${ACHIEVEMENT_FIRST_CLEAR_SURVIVAL_SEC} 秒后本局阵亡并结算（累计击杀仍会统计）。`,
  },
  {
    id: 'kills_100',
    title: '百人斩',
    description: '累计消灭敌人达到 100。',
  },
  {
    id: 'kills_1000',
    title: '千人斩',
    description: '累计消灭敌人达到 1000。',
  },
  {
    id: 'kills_10000',
    title: '万人斩',
    description: '累计消灭敌人达到 10000。',
  },
  {
    id: 'kills_50000',
    title: '五万斩',
    description: '累计消灭敌人达到 50000。',
  },
  {
    id: 'kills_100000',
    title: '十万斩',
    description: '累计消灭敌人达到 100000。',
  },
  {
    id: 'sessions_10',
    title: '身经百战',
    description: '累计结算局数达到 10。',
  },
  {
    id: 'sessions_50',
    title: '久战沙场',
    description: '累计结算局数达到 50。',
  },
  {
    id: 'sessions_100',
    title: '百战余生',
    description: '累计结算局数达到 100。',
  },
  {
    id: 'total_play_1h',
    title: '鏖战沙场',
    description: `累计作战时长达到 ${ACHIEVEMENT_TOTAL_PLAY_1H_SEC / 3600} 小时（按已结算局数累计）。`,
  },
  {
    id: 'total_play_2h',
    title: '鏖战无休',
    description: `累计作战时长达到 ${ACHIEVEMENT_TOTAL_PLAY_2H_SEC / 3600} 小时（按已结算局数累计）。`,
  },
  {
    id: 'best_survival_180',
    title: '屹立不倒',
    description: `单局最长存活达到 ${ACHIEVEMENT_BEST_SURVIVAL_180_SEC} 秒（约 3 分钟）。`,
  },
  {
    id: 'best_survival_600',
    title: '钢铁意志',
    description: `单局最长存活达到 ${ACHIEVEMENT_BEST_SURVIVAL_600_SEC} 秒（约 10 分钟）。`,
  },
  {
    id: 'purple_stash_50',
    title: '仓廪充实',
    description: '紫装箱库中至少持有 50 件装备（拾取紫箱入库即计数）。',
  },
  {
    id: 'purple_stash_100',
    title: '装备大户',
    description: '紫装箱库中至少持有 100 件装备。',
  },
  {
    id: 'purple_stash_200',
    title: '囤囤鼠',
    description: '紫装箱库中至少持有 200 件装备。',
  },
  {
    id: 'nine_equipped',
    title: '齐装满员',
    description: '九个装备部位均穿戴紫装（在「装备」页配齐）。',
  },
  {
    id: 'lock_10',
    title: '珍视之物',
    description: '至少锁定 10 件紫装（仓库中已锁定的实例数）。',
  },
  {
    id: 'die_once',
    title: '菜就多练',
    description: '任意一局阵亡一次即可解锁。',
  },
  {
    id: 'die_20',
    title: '愈挫愈勇',
    description: '累计阵亡次数达到 20。',
  },
];
