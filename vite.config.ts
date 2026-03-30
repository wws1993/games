/** Vite 配置：React + TS，打包产物输出到 www 供 Cordova 使用 */
import tailwindcss from '@tailwindcss/vite';
import postcssCascadeLayers from '@csstools/postcss-cascade-layers';
import browserslist from 'browserslist';
import { browserslistToTargets, transform as lightningcssTransform } from 'lightningcss';
import postcss from 'postcss';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/**
 * Cordova/Android WebView 以 file:// 加载 www 时，带 crossorigin 的 link/script 在部分真机上会导致外链 CSS/模块加载失败；模拟器 Chrome 较新往往正常。构建后去掉 crossorigin 以与 file:// 同源策略一致
 */
function cordovaStripCrossorigin(): Plugin {
  return {
    name: 'cordova-strip-crossorigin',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/\s+crossorigin(?:="(?:anonymous|use-credentials)")?/gi, '');
      },
    },
  };
}

/**
 * 构建结束后把外链 CSS 内联进 index.html，并对 Tailwind v4 产物做 Cordova 兼容：旧 Android System WebView（Chrome 99 以下）不认识 `@layer`，会整块丢掉工具类；先 PostCSS 展开层，再 Lightning 降级，最后去掉仍残留的 `@property`
 */
function cordovaInlineCss(outDir: string): Plugin {
  return {
    name: 'cordova-inline-css',
    apply: 'build',
    async closeBundle() {
      const htmlPath = join(outDir, 'index.html');
      let html = readFileSync(htmlPath, 'utf-8');
      const linkRe =
        /<link\s+rel="stylesheet"\s+href="(\.\/assets\/[^"]+\.css)"\s*\/?>/i;
      const m = html.match(linkRe);
      if (!m) {
        return;
      }
      const relCss = m[1]!;
      const cssPath = join(outDir, relCss.replace(/^\.\//, ''));
      let css = readFileSync(cssPath, 'utf-8');
      const layered = await postcss([postcssCascadeLayers()]).process(css, {
        from: undefined,
      });
      css = layered.css;
      try {
        const out = lightningcssTransform({
          filename: 'cordova-bundle.css',
          code: Buffer.from(css, 'utf-8'),
          minify: true,
          targets: cordovaCssTargets,
          errorRecovery: true,
        });
        css = out.code.toString();
      } catch {
        /* 降级失败则保留 PostCSS 结果 */
      }
      for (let i = 0; i < 8 && /@property\b/.test(css); i++) {
        css = css.replace(/@property\s+[\s\S]*?\}\s*/g, '');
      }
      if (css.includes('</style')) {
        css = css.replace(/<\/style/gi, '<\\/style');
      }
      html = html.replace(linkRe, `<style>${css}</style>`);
      writeFileSync(htmlPath, html);
      try {
        unlinkSync(cssPath);
      } catch {
        /* 忽略只读或并发删除失败 */
      }
    },
  };
}

/** 与旧版 Android System WebView（≈ Chrome 68+）对齐，降级 Tailwind v4 的 @property / oklab 等，避免整表解析丢弃 */
const cordovaCssTargets = browserslistToTargets(
  browserslist('chrome >= 68, and_chr >= 68, samsung >= 8'),
);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cordovaStripCrossorigin(),
    cordovaInlineCss('www'),
  ],
  root: '.',
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: cordovaCssTargets,
    },
  },
  build: {
    outDir: 'www',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  base: './',
});
