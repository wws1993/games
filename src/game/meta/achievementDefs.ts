/**
 * 成就 id、文案与「通关」所需单局存活秒数（无真正胜利界面时，以存活时长近似通关）
 */

/** 单局存活达到该秒数且本局阵亡时，视为完成一次「通关」并解锁「第一滴血」 */
export const ACHIEVEMENT_FIRST_CLEAR_SURVIVAL_SEC = 300;

export type AchievementId =
  | 'first_clear'
  | 'kills_100'
  | 'kills_1000'
  | 'kills_10000'
  | 'die_once';

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
    id: 'die_once',
    title: '菜就多练',
    description: '任意一局阵亡一次即可解锁。',
  },
];
