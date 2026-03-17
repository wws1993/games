/** 版本号工具：解析、递增及同步到项目配置 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');

/** 获取项目根目录下的 config.xml 路径 */
export function getConfigPaths(): string[] {
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

/** 从 config.xml 中替换 version */
export function updateConfigXmlVersion(filePath: string, newVersion: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const updated = content.replace(/<widget[^>]*version="[^"]*"/, (m) =>
    m.replace(/version="[^"]*"/, `version="${newVersion}"`),
  );
  writeFileSync(filePath, updated);
}

/** 从 package.json 中替换 version */
export function updatePackageJsonVersion(filePath: string, newVersion: string): void {
  const pkg = JSON.parse(readFileSync(filePath, 'utf-8'));
  pkg.version = newVersion;
  writeFileSync(filePath, JSON.stringify(pkg, null, 2));
}

/** 按类型递增版本号，遵循 semver */
export function bumpVersion(current: string, type: 'major' | 'minor' | 'patch'): string {
  const parts = current.split('.').map(Number);
  const [major = 0, minor = 0, patch = 0] = parts;
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return current;
  }
}

/** 同步版本号到所有配置文件 */
export function syncVersion(newVersion: string): void {
  const pkgPath = join(ROOT, 'package.json');
  updatePackageJsonVersion(pkgPath, newVersion);
  for (const cfg of getConfigPaths()) {
    updateConfigXmlVersion(cfg, newVersion);
  }
}
