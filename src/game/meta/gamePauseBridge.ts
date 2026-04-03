/**
 * 局内暂停与 React 装备层桥接：`GameScreen` 注册处理器，`App` 注册 UI 开关；关闭时同步档案到本局模型
 */

type PauseEquipHandlers = {
  setManualPaused: (v: boolean) => void;
  /** 从存档重算武器与护具/配件（局内整备后调用） */
  syncLoadoutFromSave: () => void;
};

let handlers: PauseEquipHandlers | null = null;
let uiOpen: (v: boolean) => void = () => {};

/** 由 `GameScreen.prepare` 注册，`hide` 时解绑 */
export function registerPauseEquipment(h: PauseEquipHandlers | null): void {
  handlers = h;
}

/** 由 `App` 内 `GamePauseEquipmentLayer` 注册，卸载时传 `null` */
export function registerPauseEquipmentUi(setOpen: (v: boolean) => void | null): void {
  uiOpen = setOpen ?? (() => {});
}

/** 打开暂停层并冻结局内逻辑 */
export function openPauseEquipmentOverlay(): void {
  handlers?.setManualPaused(true);
  uiOpen(true);
}

/** 关闭暂停层、恢复战斗并做一次档案同步 */
export function closePauseEquipmentOverlay(): void {
  handlers?.syncLoadoutFromSave();
  handlers?.setManualPaused(false);
  uiOpen(false);
}

/** 局内在装备页点选后立即同步到模型（不必等关闭） */
export function notifyBattleEquipmentChanged(): void {
  handlers?.syncLoadoutFromSave();
}
