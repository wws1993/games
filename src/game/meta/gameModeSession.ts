/**
 * 首页选定模式写入 sessionStorage，进入 `GameScreen.prepare` 时消费一次，避免刷新重复套用
 */
import type { GameModeId } from '../config/gameModeConfig';

const KEY = 'app_game_pending_mode_v1';

/** 写入待开局模式（进入 `/game` 前调用） */
export function setPendingGameMode(mode: GameModeId): void {
  sessionStorage.setItem(KEY, mode);
}

/**
 * 读取并清除待开局模式；非法或缺失时返回 `standard`
 */
export function consumePendingGameMode(): GameModeId {
  const v = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  if (v === 'ground_assault' || v === 'air_threat' || v === 'standard') {
    return v;
  }
  return 'standard';
}
