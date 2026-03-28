/** 脚本注册表：导出 bin 下所有可执行脚本供主入口调用 */
import * as setPackage from './set-package';
import * as setAppMeta from './set-app-meta';
import * as setVersion from './set-version';
import * as push from './push';

export interface ScriptItem {
  id: string;
  name: string;
  description: string;
  run: () => Promise<void>;
}

export const scripts: ScriptItem[] = [
  { id: 'set-package', name: setPackage.name, description: setPackage.description, run: setPackage.run },
  { id: 'set-app-meta', name: setAppMeta.name, description: setAppMeta.description, run: setAppMeta.run },
  { id: 'set-version', name: setVersion.name, description: setVersion.description, run: setVersion.run },
  { id: 'push', name: push.name, description: push.description, run: push.run },
];
