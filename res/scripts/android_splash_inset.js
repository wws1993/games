#!/usr/bin/env node
/** Android 12 启动屏使用圆形遮罩，宽幅 logo 会被裁剪。本钩子在 after_prepare 后复制 inset drawable 并更新主题，使 logo 完整显示；并补齐自适应图标缺失的 ic_launcher_foreground（Cordova 对 foreground 为 .jpg 时常漏拷）。 */
const fs = require('fs');
const path = require('path');

/** 各 mipmap-*dpi 目录内需存在 ic_launcher_foreground.*，否则 mipmap-*-v26/ic_launcher.xml 链接失败 */
function ensureAdaptiveIconForeground(androidRes) {
    if (!fs.existsSync(androidRes)) return;
    for (const ent of fs.readdirSync(androidRes, { withFileTypes: true })) {
        if (!ent.isDirectory()) continue;
        const dirName = ent.name;
        if (!dirName.startsWith('mipmap-') || dirName.includes('-v26')) continue;
        const dir = path.join(androidRes, dirName);
        const names = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
        const hasFg = names.some((f) => /^ic_launcher_foreground\.(png|jpg|jpeg|webp)$/i.test(f));
        if (hasFg) continue;
        const launcher = names.find((f) => /^ic_launcher\.(png|jpg|jpeg|webp)$/i.test(f));
        if (!launcher) continue;
        const ext = path.extname(launcher);
        const dest = path.join(dir, `ic_launcher_foreground${ext}`);
        fs.copyFileSync(path.join(dir, launcher), dest);
        console.log(`[android_adaptive_icon] 已补齐 ${dirName}/ic_launcher_foreground${ext}`);
    }
}

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

    ensureAdaptiveIconForeground(androidRes);
};
