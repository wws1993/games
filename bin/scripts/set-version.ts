/** 修改版本号脚本：通过 consola 获取输入并同步到 config.xml、package.json 及平台配置 */
import { consola } from 'consola';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { syncVersion } from './utils/version';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

export const name = '修改版本号';
export const description = '修改 config.xml 与 package.json 中的版本号，并同步到各平台';

export async function run(): Promise<void> {
  const pkgPath = join(ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const current = pkg.version as string;

  const newVersion = await consola.prompt('请输入新版本号', {
    type: 'text',
    initial: current,
    placeholder: '例如: 1.0.1',
  });

  if (typeof newVersion !== 'string' || !newVersion.trim()) {
    consola.warn('已取消');
    return;
  }

  const trimmed = newVersion.trim();
  syncVersion(trimmed);
  consola.success(`版本号已更新为: ${trimmed}`);
}
