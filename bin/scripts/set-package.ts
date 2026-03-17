/** 修改包名脚本：通过 consola 获取输入并同步到 config.xml、package.json 及平台配置 */
import { consola } from 'consola';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

/** 获取项目根目录下的 config.xml 路径 */
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

/** 从 config.xml 中替换 widget id */
function updateConfigXml(filePath: string, newId: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const updated = content.replace(/<widget\s+id="[^"]*"/, `<widget id="${newId}"`);
  writeFileSync(filePath, updated);
}

/** 从 package.json 中替换 name */
function updatePackageJson(filePath: string, newName: string): void {
  const pkg = JSON.parse(readFileSync(filePath, 'utf-8'));
  pkg.name = newName;
  writeFileSync(filePath, JSON.stringify(pkg, null, 2));
}

export const name = '修改包名';
export const description = '修改 config.xml 与 package.json 中的包名，并同步到各平台';

export async function run(): Promise<void> {
  const pkgPath = join(ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const current = pkg.name as string;

  const newPackage = await consola.prompt('请输入新包名', {
    type: 'text',
    initial: current,
    placeholder: '例如: com.example.app',
  });

  if (typeof newPackage !== 'string' || !newPackage.trim()) {
    consola.warn('已取消');
    return;
  }

  const trimmed = newPackage.trim();
  updatePackageJson(pkgPath, trimmed);

  for (const cfg of getConfigPaths()) {
    updateConfigXml(cfg, trimmed);
  }

  consola.success(`包名已更新为: ${trimmed}`);
}
