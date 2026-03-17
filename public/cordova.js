/** Cordova 开发占位：Vite 开发时使用，Cordova 运行时会由平台覆盖 */
(function () {
  window.cordova = { platformId: 'browser' };
  document.dispatchEvent(new Event('deviceready'));
})();
