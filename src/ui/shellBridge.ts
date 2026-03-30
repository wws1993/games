/** 由 `bindReactNavigate` 注入的 `react-router` 跳转函数，供非 React 模块触发路由 */
let reactNavigate: ((path: string) => void) | null = null;

/** 由 React 根组件在挂载时注册 `useNavigate`，卸载时传 `null` 解除绑定 */
export function bindReactNavigate(fn: ((path: string) => void) | null): void {
  reactNavigate = fn;
}

/** 战斗结束返回菜单：切到 `#/` 并由路由同步逻辑卸载 `GameScreen`、挂上 `PixiEmptyScreen` */
export function exitGameToReactHome(): void {
  reactNavigate?.('/');
}
