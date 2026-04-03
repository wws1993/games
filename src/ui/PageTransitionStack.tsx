import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { AchievementsPage } from './AchievementsPage';
import { CodexPage } from './CodexPage';
import { EquipmentPage } from './EquipmentPage';
import { HomePage } from './HomePage';
import { SettingsPage } from './SettingsPage';
import { StatsPage } from './StatsPage';

/** 与下方 CSS `page-fluid-in` 时长一致，用于动画结束后再卸底层旧页 */
const PAGE_FLUID_MS = 700;

/** `/game` 路由占位：画面由 Pixi 绘制，此处不渲染 DOM */
function GameRoutePlaceholder(): null {
  return null;
}

/** 按 pathname 渲染单页，供叠层同时挂载「旧底 + 新顶」 */
function PageForPath({ path }: { path: string }): JSX.Element | null {
  switch (path) {
    case '/':
      return <HomePage />;
    case '/equipment':
      return <EquipmentPage />;
    case '/codex':
      return <CodexPage />;
    case '/stats':
      return <StatsPage />;
    case '/settings':
      return <SettingsPage />;
    case '/achievements':
      return <AchievementsPage />;
    case '/shop':
      return <Navigate to="/equipment" replace />;
    case '/game':
      return <GameRoutePlaceholder />;
    default:
      return <Navigate to="/" replace />;
  }
}

type StackState = { base: string; overlay: string | null };

/** 双页叠层：底层保留至流体入场结束；顶层新页自右侧以非牛顿流体感（黏滞拉伸、边沿圆团、短暂过冲后定型）滑入覆盖 */
export function PageTransitionStack(): JSX.Element {
  const { pathname } = useLocation();
  const [stack, setStack] = useState<StackState>(() => ({ base: pathname, overlay: null }));
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (pathname === prevPathRef.current) {
      return;
    }
    const from = prevPathRef.current;
    prevPathRef.current = pathname;

    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setStack({ base: pathname, overlay: null });
      return;
    }

    if (pathname === '/game' || from === '/game') {
      setStack({ base: pathname, overlay: null });
      return;
    }

    setStack((s) => {
      if (s.overlay === null) {
        if (pathname === s.base) {
          return s;
        }
        return { base: s.base, overlay: pathname };
      }
      return { base: s.overlay, overlay: pathname };
    });
  }, [pathname]);

  useEffect(() => {
    if (stack.overlay === null) {
      return;
    }
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduceMotion ? 0 : PAGE_FLUID_MS;
    const id = window.setTimeout(() => {
      setStack((s) => (s.overlay === null ? s : { base: s.overlay, overlay: null }));
    }, ms);
    return () => window.clearTimeout(id);
  }, [stack.overlay]);

  return (
    <div className="page-transition-stack">
      <div className="page-transition-base" aria-hidden={stack.overlay !== null}>
        <PageForPath path={stack.base} />
      </div>
      {stack.overlay !== null ? (
        <div className="page-transition-incoming" key={stack.overlay}>
          <PageForPath path={stack.overlay} />
        </div>
      ) : null}
    </div>
  );
}
