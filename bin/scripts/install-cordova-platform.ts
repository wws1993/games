/** 安装 Cordova 平台：选择 Web / iOS / Android 后执行 cordova platform add */
import { consola } from 'consola';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

/** 用户选项 value → cordova platform 目录名 */
const PLATFORM_OPTIONS = [
  { value: 'browser', label: 'Web（浏览器，cordova-browser）' },
  { value: 'android', label: 'Android（cordova-android）' },
  { value: 'ios', label: 'iOS（cordova-ios，需 macOS 与 Xcode）' },
  { value: 'all', label: '全部（browser + android + ios）' },
] as const;

function isPlatformInstalled(platformId: string): boolean {
  return existsSync(join(ROOT, 'platforms', platformId));
}

function addPlatform(platformId: string): boolean {
  if (isPlatformInstalled(platformId)) {
    consola.warn(`平台 ${platformId} 已存在于 platforms/，跳过`);
    return true;
  }

  consola.info(`正在安装平台: ${platformId} ...`);
  const result = spawnSync('npx', ['cordova', 'platform', 'add', platformId], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    consola.error(`安装平台 ${platformId} 失败`);
    return false;
  }

  consola.success(`平台 ${platformId} 安装完成`);
  return true;
}

export const name = '安装 Cordova 平台';
export const description = '选择 Web / iOS / Android，执行 cordova platform add';

export async function run(): Promise<void> {
  const choice = await consola.prompt('请选择要安装的平台', {
    type: 'select',
    options: PLATFORM_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
  });

  if (!choice) {
    consola.warn('已取消');
    return;
  }

  if (choice === 'ios' && process.platform === 'win32') {
    const proceed = await consola.prompt('iOS 平台通常需在 macOS 上构建，是否仍尝试安装？', {
      type: 'confirm',
      initial: false,
    });
    if (!proceed) {
      consola.warn('已取消');
      return;
    }
  }

  const platformIds: string[] =
    choice === 'all' ? ['browser', 'android', 'ios'] : [choice as string];

  let allOk = true;
  for (const id of platformIds) {
    if (!addPlatform(id)) allOk = false;
  }

  if (!allOk) {
    process.exit(1);
  }
}
