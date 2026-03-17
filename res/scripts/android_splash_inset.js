#!/usr/bin/env node
/** Android 12 启动屏使用圆形遮罩，宽幅 logo 会被裁剪。本钩子在 after_prepare 后复制 inset drawable 并更新主题，使 logo 完整显示。 */
const fs = require('fs');
const path = require('path');

module.exports = function (ctx) {
    const platform = ctx.opts.platforms;
    if (!platform || !platform.includes('android')) return;

    const root = ctx.opts.projectRoot;
    const androidRes = path.join(root, 'platforms', 'android', 'app', 'src', 'main', 'res');
    const drawableDir = path.join(androidRes, 'drawable');
    const themesPath = path.join(androidRes, 'values', 'cdv_themes.xml');
    const insetSrc = path.join(root, 'res', 'drawable', 'ic_cdv_splashscreen_inset.xml');

    if (!fs.existsSync(insetSrc)) {
        console.warn('[android_splash_inset] 未找到 res/drawable/ic_cdv_splashscreen_inset.xml');
        return;
    }
    if (!fs.existsSync(themesPath)) {
        console.warn('[android_splash_inset] 未找到 cdv_themes.xml');
        return;
    }

    if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
    fs.copyFileSync(insetSrc, path.join(drawableDir, 'ic_cdv_splashscreen_inset.xml'));

    let themes = fs.readFileSync(themesPath, 'utf8');
    if (!themes.includes('ic_cdv_splashscreen_inset')) {
        themes = themes.replace(
            /@drawable\/ic_cdv_splashscreen</,
            '@drawable/ic_cdv_splashscreen_inset<'
        );
    }
    fs.writeFileSync(themesPath, themes);
    console.log('[android_splash_inset] 已应用启动屏 inset 修复');
};
