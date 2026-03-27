import { designConfig } from './game/designConfig';
import { navigation } from './utils/navigation';
import { app } from './utils/application';
import { HomeScreen } from './screens/HomeScreen';

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

/** 初始化 Application、导航与首屏（流程参考 pixijs/open-games bubbo-bubbo `src/main.ts`） */
async function init(): Promise<void> {
  await app.init({
    resolution: Math.max(window.devicePixelRatio, 2),
    backgroundColor: 0xffffff,
  });

  document.body.appendChild(app.canvas);
  app.canvas.style.touchAction = 'none';
  app.stage.eventMode = 'static';

  navigation.init();
  window.addEventListener('resize', resize);
  resize();

  await navigation.goToScreen(HomeScreen);
}

void init();
