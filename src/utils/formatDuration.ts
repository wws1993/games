/**
 * 将秒数格式化为中文可读时长（用于统计页、HUD 等）
 * @param totalSec - 总秒数（可非整数，会向下取整）
 */
export function formatDurationCn(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}小时${m}分${sec}秒`;
  }
  if (m > 0) {
    return `${m}分${sec}秒`;
  }
  return `${sec}秒`;
}
