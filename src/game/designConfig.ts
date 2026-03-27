/** 设计稿最小宽度，小于此值时由缩放逻辑放大渲染缓冲区 */
const minWidth = 428;
/** 设计稿最小高度，小于此值时由缩放逻辑放大渲染缓冲区 */
const minHeight = 925;

/** 与 bubbo-bubbo 一致：非玩法 UI 的布局与调试相关常量 */
export const designConfig = {
  content: {
    width: minWidth,
    height: minHeight,
  },
  /** 背景平铺缩放（本项目中首页仅用纯色底，保留字段便于扩展） */
  backgroundTileScale: 2,
};
