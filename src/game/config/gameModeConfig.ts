/**
 * 开局可选游戏模式：仅影响刷怪权重（与 `enemyDefs.getSpawnWeightsForMode` 相乘），不改动单兵数值表
 */
import type { EnemyKind } from './enemyConfig';

/** 可持久化到 sessionStorage 的模式键 */
export type GameModeId = 'standard' | 'ground_assault' | 'air_threat';

/** 单模式：展示名 + 刷怪权重乘子（未列兵种为 1） */
export interface GameModeDef {
  id: GameModeId;
  displayName: string;
  summary: string;
  spawnWeightMult: Partial<Record<EnemyKind, number>>;
}

/** 陆战偏多：地面与装甲单位权重↑，空中单位↓ */
const GROUND_MULT: Partial<Record<EnemyKind, number>> = {
  infantry: 1.28,
  puppet: 1.22,
  engineer: 1.2,
  dog: 1.15,
  sniper: 1.12,
  grenadier: 1.18,
  heavy_infantry: 1.32,
  cavalry: 1.38,
  mg: 1.22,
  artillery: 1.12,
  scout_car: 1.25,
  motor_scout: 1.3,
  military_police: 1.24,
  mortar_team: 1.18,
  light_tank: 1.15,
  officer: 1.0,
  recon_plane: 0.48,
  fighter_plane: 0.52,
  bomber_plane: 0.55,
  gunship: 0.5,
  paratrooper: 0.62,
};

/** 空域威胁：空中与空降单位权重↑，常规地面步坦↓ */
const AIR_MULT: Partial<Record<EnemyKind, number>> = {
  recon_plane: 1.42,
  fighter_plane: 1.38,
  bomber_plane: 1.22,
  gunship: 1.35,
  paratrooper: 1.28,
  infantry: 0.78,
  puppet: 0.82,
  engineer: 0.88,
  dog: 0.85,
  sniper: 0.9,
  grenadier: 0.9,
  heavy_infantry: 0.88,
  cavalry: 0.82,
  mg: 0.9,
  artillery: 0.95,
  scout_car: 0.88,
  motor_scout: 0.86,
  military_police: 0.9,
  mortar_team: 0.92,
  light_tank: 0.9,
  officer: 0.95,
};

/** 三种模式定义（供首页引用） */
export const GAME_MODE_DEFS: readonly GameModeDef[] = [
  {
    id: 'standard',
    displayName: '标准作战',
    summary: '各兵种按默认时间轴与权重刷新，节奏均衡。',
    spawnWeightMult: {},
  },
  {
    id: 'ground_assault',
    displayName: '地面强攻',
    summary: '步兵、骑兵、车载与重火力更密集；空中袭扰相对减少。',
    spawnWeightMult: GROUND_MULT,
  },
  {
    id: 'air_threat',
    displayName: '长空截击',
    summary: '侦察机、战斗机、空中炮艇与空降更多；地面常规压力略降。',
    spawnWeightMult: AIR_MULT,
  },
];

/** 按 id 取表项 */
export const GAME_MODE_BY_ID: Record<GameModeId, GameModeDef> = {
  standard: GAME_MODE_DEFS[0]!,
  ground_assault: GAME_MODE_DEFS[1]!,
  air_threat: GAME_MODE_DEFS[2]!,
};
