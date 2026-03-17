/**
 * 欢迎页 - 使用 PixiJS 8 渲染的欢迎界面
 */
import { Application, Text, Container } from 'https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.mjs';

/** @type {HTMLDivElement} */
const container = document.getElementById('game-container');

/**
 * 初始化并显示欢迎页
 */
async function initWelcome() {
  const app = new Application();
  await app.init({
    resizeTo: container || window,
    backgroundColor: 0x1a1a2e,
    antialias: true,
  });

  if (container) {
    container.appendChild(app.canvas);
  } else {
    document.body.appendChild(app.canvas);
  }

  const welcomeContainer = new Container();
  app.stage.addChild(welcomeContainer);

  const title = new Text({
    text: '欢迎',
    style: {
      fontFamily: 'Arial, sans-serif',
      fontSize: 48,
      fill: '#ffffff',
      fontWeight: 'bold',
    },
    anchor: 0.5,
  });
  welcomeContainer.addChild(title);

  const subtitle = new Text({
    text: '安卓游戏脚手架',
    style: {
      fontFamily: 'Arial, sans-serif',
      fontSize: 24,
      fill: '#aaaaaa',
    },
    anchor: 0.5,
  });
  subtitle.y = 60;
  welcomeContainer.addChild(subtitle);

  welcomeContainer.x = app.screen.width / 2;
  welcomeContainer.y = app.screen.height / 2;

  window.addEventListener('resize', () => {
    welcomeContainer.x = app.screen.width / 2;
    welcomeContainer.y = app.screen.height / 2;
  });
}

document.addEventListener('deviceready', initWelcome, false);
if (typeof cordova === 'undefined') {
  initWelcome();
}
