import { useEffect, useRef, useState } from 'react';
import { HashRouter, useLocation, useNavigate } from 'react-router-dom';

import {
  closePauseEquipmentOverlay,
  registerPauseEquipmentUi,
} from '../game/meta/gamePauseBridge';
import { GameScreen } from '../screens/GameScreen';
import { PixiEmptyScreen } from '../screens/PixiEmptyScreen';
import { navigation } from '../utils/navigation';
import { EquipmentPage } from './EquipmentPage';
import { bindReactNavigate } from './shellBridge';
import { PageTransitionStack } from './PageTransitionStack';

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

/** 局内暂停时叠在画布之上的装备整备层（不卸载 `GameScreen`） */
function GamePauseEquipmentLayer(): JSX.Element | null {
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    registerPauseEquipmentUi(setOpen);
    return () => registerPauseEquipmentUi(null);
  }, []);
  useEffect(() => {
    if (loc.pathname !== '/game') {
      setOpen(false);
    }
  }, [loc.pathname]);
  if (loc.pathname !== '/game' || !open) {
    return null;
  }
  return (
    <div className="game-pause-equipment-layer">
      <EquipmentPage mode="battlePause" onCloseBattle={closePauseEquipmentOverlay} />
    </div>
  );
}

/** Hash 路由壳：`/game` 仅切换 Pixi，其余为 React 页面 */
export function App(): JSX.Element {
  return (
    <HashRouter>
      <ShellSync />
      <GamePauseEquipmentLayer />
      <PageTransitionStack />
    </HashRouter>
  );
}
