import { useEffect, useRef } from 'react';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { GameScreen } from '../screens/GameScreen';
import { PixiEmptyScreen } from '../screens/PixiEmptyScreen';
import { navigation } from '../utils/navigation';
import { AchievementsPage } from './AchievementsPage';
import { CodexPage } from './CodexPage';
import { HomePage } from './HomePage';
import { SettingsPage } from './SettingsPage';
import { bindReactNavigate } from './shellBridge';
import { StatsPage } from './StatsPage';

/** `/game` 路由占位：画面由 Pixi `GameScreen` 绘制，此处不渲染 DOM */
function GameRoutePlaceholder(): null {
  return null;
}

/** 同步路由与 Pixi 主屏、根节点指针穿透（局内交给画布） */
function ShellSync(): null {
  const loc = useLocation();
  const nav = useNavigate();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    bindReactNavigate((path: string) => {
      void nav(path);
    });
    return () => bindReactNavigate(null);
  }, [nav]);

  useEffect(() => {
    document.getElementById('root')?.classList.toggle('shell-interactive', loc.pathname !== '/game');
  }, [loc.pathname]);

  useEffect(() => {
    const p = loc.pathname;
    const was = prevPath.current;
    if (p === '/game' && was !== '/game') {
      void navigation.goToScreen(GameScreen);
    }
    if (p !== '/game' && was === '/game') {
      void navigation.goToScreen(PixiEmptyScreen);
    }
    prevPath.current = p;
  }, [loc.pathname]);

  return null;
}

/** Hash 路由壳：`/game` 仅切换 Pixi，其余为 React 页面 */
export function App(): JSX.Element {
  return (
    <HashRouter>
      <ShellSync />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/codex" element={<CodexPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/game" element={<GameRoutePlaceholder />} />
      </Routes>
    </HashRouter>
  );
}
