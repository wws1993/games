#!/usr/bin/env npx tsx
/** bin 主入口：读取 scripts 注册表，列出脚本供用户选择并执行 */
import { consola } from 'consola';
import { scripts } from './scripts/registry';

async function main(): Promise<void> {
  consola.box('项目脚本工具');

  const choice = await consola.prompt('请选择要执行的脚本', {
    type: 'select',
    options: [
      ...scripts.map((s) => ({ value: s.id, label: `${s.name} - ${s.description}` })),
      { value: 'exit', label: '退出' },
    ],
  });

  if (choice === 'exit' || !choice) {
    consola.info('已退出');
    return;
  }

  const script = scripts.find((s) => s.id === choice);
  if (!script) {
    consola.error('未找到脚本');
    return;
  }

  try {
    await script.run();
  } catch (e) {
    consola.error(e);
    process.exit(1);
  }
}

main();
