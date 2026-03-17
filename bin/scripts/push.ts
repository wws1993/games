/** Push 脚本：索要提交类型与 msg、修改版本号后提交并推送到仓库 */
import { consola } from 'consola';
import { execSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { bumpVersion, syncVersion } from './utils/version';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const COMMIT_TYPES = [
  { value: 'feat', label: 'feat - 新功能' },
  { value: 'fix', label: 'fix - 修复 bug' },
  { value: 'docs', label: 'docs - 文档' },
  { value: 'style', label: 'style - 格式/样式' },
  { value: 'refactor', label: 'refactor - 重构' },
  { value: 'perf', label: 'perf - 性能' },
  { value: 'test', label: 'test - 测试' },
  { value: 'chore', label: 'chore - 构建/工具' },
] as const;

const VERSION_BUMP_TYPES = [
  { value: 'patch', label: 'patch - 1.0.0 → 1.0.1' },
  { value: 'minor', label: 'minor - 1.0.0 → 1.1.0' },
  { value: 'major', label: 'major - 1.0.0 → 2.0.0' },
  { value: 'none', label: 'none - 不修改版本' },
] as const;

export const name = 'Push 提交';
export const description = '索要提交类型与 msg、修改版本号后 git pull/add/commit/push';

export async function run(): Promise<void> {
  const pkgPath = join(ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const currentVersion = pkg.version as string;

  const commitType = await consola.prompt('选择提交类型', {
    type: 'select',
    options: [...COMMIT_TYPES],
  });

  if (!commitType) {
    consola.warn('已取消');
    return;
  }

  const msg = await consola.prompt('请输入提交信息', {
    type: 'text',
    placeholder: '简短描述本次修改',
  });

  if (typeof msg !== 'string' || !msg.trim()) {
    consola.warn('提交信息不能为空，已取消');
    return;
  }

  const bumpType = await consola.prompt('选择版本号变更', {
    type: 'select',
    options: [...VERSION_BUMP_TYPES],
  });

  let newVersion = currentVersion;
  if (bumpType && bumpType !== 'none') {
    newVersion = bumpVersion(currentVersion, bumpType as 'major' | 'minor' | 'patch');
    syncVersion(newVersion);
    consola.success(`版本号已更新: ${currentVersion} → ${newVersion}`);
  }

  const commitMsg = `${commitType}: ${msg.trim()}`;

  try {
    consola.info('拉取远程最新代码...');
    const pullResult = spawnSync('git', ['pull', '--rebase'], { cwd: ROOT, stdio: 'inherit' });
    if (pullResult.status !== 0) throw new Error('git pull 失败，请先解决冲突或检查网络');
    execSync('git add -A', { cwd: ROOT, stdio: 'inherit' });
    const commitResult = spawnSync('git', ['commit', '-m', commitMsg], { cwd: ROOT, stdio: 'inherit' });
    if (commitResult.status !== 0) throw new Error('git commit 失败');
    execSync('git push', { cwd: ROOT, stdio: 'inherit' });
    consola.success('已推送到远程仓库');
  } catch (e) {
    consola.error('git 操作失败', e);
    process.exit(1);
  }
}
