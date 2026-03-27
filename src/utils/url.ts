/**
 * 读取当前 URL 查询参数（与 bubbo-bubbo `utils/utils` 中 `getUrlParam` 行为一致）
 * @param param - 查询参数名
 * @returns 参数值；不存在则为 `null`
 */
export function getUrlParam(param: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}
