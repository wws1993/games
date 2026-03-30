/** 单局军功计算（阶段 5.1 占位，系数可外置到 balance 后再接 UI 调参） */
export function computeRunMerit(survivalSec: number, killCount: number): number {
  const sec = Math.max(0, Number(survivalSec) || 0);
  const k = Math.max(0, Math.floor(killCount));
  const perSec = 0.35;
  const perKill = 2;
  return Math.max(0, Math.floor(sec * perSec + k * perKill));
}
