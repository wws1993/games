/** 将画布 `resolution` 限制在 [1, cap]，显著降低手机端填充率（原 `Math.max(dpr,2)` 在 3x 屏上过重） */
export function getClampedDevicePixelRatio(cap = 2): number {
  const raw = window.devicePixelRatio ?? 1;
  if (!Number.isFinite(raw) || raw < 1) {
    return 1;
  }
  return Math.min(raw, cap);
}
