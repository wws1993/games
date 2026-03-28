/** 修改应用显示名称与描述：同步 config.xml 与 package.json，并在完成后提示图标配置位置 */
import { consola } from 'consola';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

/** 收集根目录与各已存在平台下的 config.xml 路径 */
function getConfigPaths(): string[] {
  const paths = [join(ROOT, 'config.xml')];
  const platformsDir = join(ROOT, 'platforms');
  if (existsSync(platformsDir)) {
    const platforms = ['browser', 'android', 'ios'];
    for (const p of platforms) {
      const cfg = join(platformsDir, p, 'config.xml');
      if (existsSync(cfg)) paths.push(cfg);
      const wwwCfg = join(platformsDir, p, 'www', 'config.xml');
      if (existsSync(wwwCfg)) paths.push(wwwCfg);
    }
  }
  return paths;
}

/** 转义为可写入 XML 文本节点的字符串 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 将 XML 文本节点内容还原为展示字符串，供 prompt 初始值使用 */
function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** 从根目录 config.xml 解析当前 <name> 与 <description> */
function readRootConfigMeta(): { name: string; description: string } {
  const rootCfg = join(ROOT, 'config.xml');
  const content = readFileSync(rootCfg, 'utf-8');
  const nameMatch = content.match(/<name>([\s\S]*?)<\/name>/);
  const descMatch = content.match(/<description>([\s\S]*?)<\/description>/);
  return {
    name: nameMatch ? unescapeXml(nameMatch[1].trim()) : '',
    description: descMatch ? unescapeXml(descMatch[1].trim()) : '',
  };
}

/** 写入 config.xml 中唯一 <name> 元素文本 */
function updateConfigXmlName(filePath: string, newName: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const esc = escapeXml(newName);
  const updated = content.replace(/<name>[\s\S]*?<\/name>/, `<name>${esc}</name>`);
  writeFileSync(filePath, updated);
}

/** 写入 config.xml 中唯一 <description> 元素文本 */
function updateConfigXmlDescription(filePath: string, newDescription: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const esc = escapeXml(newDescription);
  const updated = content.replace(/<description>[\s\S]*?<\/description>/, `<description>${esc}</description>`);
  writeFileSync(filePath, updated);
}

/** 更新 package.json 的 displayName 与 description */
function updatePackageJsonMeta(filePath: string, displayName: string, description: string): void {
  const pkg = JSON.parse(readFileSync(filePath, 'utf-8'));
  pkg.displayName = displayName;
  pkg.description = description;
  writeFileSync(filePath, JSON.stringify(pkg, null, 2));
}

/** 输出桌面图标与 Android 启动图在本项目中的配置位置说明 */
function printIconHints(): void {
  consola.box(
    [
      '图标与启动图配置提示',
      '',
      '• 桌面启动图标（Android 8+）：在 config.xml 使用 adaptive 的 background（纯色见 res/values/cdv_icon_colors.xml 的 cdv_app_icon_background）+ foreground（如 res/app-icon.jpg）；单张 src 易被缩小产生「白边方块」。前景图应铺满画布、主体略偏大以抵消圆形裁切。',
      '',
      '• Android 12+ 启动画面中心图：根目录 config.xml 中 preference「AndroidWindowSplashScreenAnimatedIcon」，当前示例指向 res/logo.png，可替换该文件或修改该 preference 的路径。',
      '',
      '• 技术包名（applicationId / widget id）：请使用脚本「修改包名」。',
    ].join('\n'),
  );
}

export const name = '修改应用名称与描述';
export const description = '更新 config.xml 的 <name>、<description> 及 package.json 的 displayName、description';

export async function run(): Promise<void> {
  const pkgPath = join(ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const fromXml = readRootConfigMeta();
  const initialName = (fromXml.name || (pkg.displayName as string) || '').trim();
  const initialDesc = (fromXml.description || (pkg.description as string) || '').trim();

  const newName = await consola.prompt('请输入应用显示名称（对应 config.xml 的 <name>）', {
    type: 'text',
    initial: initialName,
    placeholder: '例如: 我的游戏',
  });

  if (typeof newName !== 'string' || !newName.trim()) {
    consola.warn('已取消');
    return;
  }

  const newDescription = await consola.prompt('请输入应用描述（对应 config.xml 的 <description>）', {
    type: 'text',
    initial: initialDesc,
    placeholder: '简短说明用途或亮点',
  });

  if (typeof newDescription !== 'string') {
    consola.warn('已取消');
    return;
  }

  const nameTrimmed = newName.trim();
  const descTrimmed = newDescription.trim();

  updatePackageJsonMeta(pkgPath, nameTrimmed, descTrimmed);

  for (const cfg of getConfigPaths()) {
    updateConfigXmlName(cfg, nameTrimmed);
    updateConfigXmlDescription(cfg, descTrimmed);
  }

  consola.success(`应用名称与描述已更新。\n显示名称: ${nameTrimmed}\n描述: ${descTrimmed || '（空）'}`);
  printIconHints();
}
