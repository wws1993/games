import './app.css';

import { createRoot } from 'react-dom/client';

import { designConfig } from './game/designConfig';
import { PixiEmptyScreen } from './screens/PixiEmptyScreen';
import { App } from './ui/App';
import { app } from './utils/application';
import { navigation } from './utils/navigation';
import { getClampedDevicePixelRatio } from './utils/rendererProfile';

/** 按设计分辨率与窗口计算渲染缓冲区尺寸（对齐 bubbo-bubbo `main.ts` 的 `resize`） */
function resize(): void {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const minWidth = designConfig.content.width;
  const minHeight = designConfig.content.height;

  const scaleX = windowWidth < minWidth ? minWidth / windowWidth : 1;
  const scaleY = windowHeight < minHeight ? minHeight / windowHeight : 1;
  const scale = scaleX > scaleY ? scaleX : scaleY;
  const width = windowWidth * scale;
  const height = windowHeight * scale;

  app.canvas.style.width = `${windowWidth}px`;
  app.canvas.style.height = `${windowHeight}px`;
  window.scrollTo(0, 0);

  app.renderer.resize(width, height);
  navigation.resize(width, height);
}

/** 初始化 Application、导航、Pixi 占位与 React 壳层 */
async function init(): Promise<void> {
  await app.init({
    resolution: getClampedDevicePixelRatio(2),
    antialias: false,
    backgroundColor: 0xffffff,
  });

  app.canvas.id = 'pixi-game-canvas';
  document.body.appendChild(app.canvas);
  app.stage.eventMode = 'static';

  navigation.init();
  window.addEventListener('resize', resize);
  resize();

  await navigation.goToScreen(PixiEmptyScreen);

  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('missing #root');
  }
  createRoot(rootEl).render(<App />);
}

void init();
