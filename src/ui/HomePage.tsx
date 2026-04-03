import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GAME_MODE_DEFS } from '../game/config/gameModeConfig';
import { setPendingGameMode } from '../game/meta/gameModeSession';

/** 与仓库 `public/bg-home.png` 对应 */
const HOME_BG_URL = `${import.meta.env.BASE_URL}bg-home.png`;

/** 首页主标题描边 + 立体感（偏 Q 的暖棕描边）；鸿蒙 WebView 对 `-webkit-text-stroke` 与 `paint-order` 支持不完整，故用多层 `text-shadow` 模拟约 2px 描边 */
const HOME_TITLE_TEXT_SHADOW = [
  '-2px 0 0 #a85c40',
  '2px 0 0 #a85c40',
  '0 -2px 0 #a85c40',
  '0 2px 0 #a85c40',
  '-2px -2px 0 #a85c40',
  '2px -2px 0 #a85c40',
  '-2px 2px 0 #a85c40',
  '2px 2px 0 #a85c40',
  '-1px -1px 0 #c87858',
  '1px -1px 0 #c87858',
  '-1px 1px 0 #c87858',
  '1px 1px 0 #c87858',
  '0 5px 0 rgba(140, 72, 48, 0.35)',
  '0 8px 14px rgba(80, 40, 28, 0.45)',
].join(', ');

/** 竖屏主菜单：背景图 + 标题 + 主按钮 + 双列次要入口（减纵向占位）；开始游戏先选模式再进局 */
export function HomePage(): JSX.Element {
  const navigate = useNavigate();
  const [modeOpen, setModeOpen] = useState(false);

  return (
    <div
      className="page page-home"
      style={{
        backgroundImage: `url(${HOME_BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="page-home-overlay" />
      <div className="page-home-main">
        <div className="page-home-decor" aria-hidden="true">
          <span className="page-home-decor-star">★</span>
          <span className="page-home-decor-star page-home-decor-star--sm">✦</span>
          <span className="page-home-decor-star">★</span>
        </div>
        <h1
          className="page-home-title"
          style={{ textShadow: HOME_TITLE_TEXT_SHADOW }}
        >
          敌后幸存者
        </h1>
        <p className="page-home-subtitle">挑个入口出发吧～</p>
      </div>
      <nav className="home-menu" aria-label="主菜单">
        <button
          type="button"
          className="home-menu-btn home-menu-btn--primary"
          onClick={() => setModeOpen(true)}
        >
          开始游戏
        </button>
        <div className="home-menu-grid" role="group" aria-label="其他功能">
          <button
            type="button"
            className="home-menu-btn home-menu-btn--tile"
            onClick={() => void navigate('/equipment')}
          >
            装备
          </button>
          <button
            type="button"
            className="home-menu-btn home-menu-btn--tile"
            onClick={() => void navigate('/codex')}
          >
            图鉴
          </button>
          <button
            type="button"
            className="home-menu-btn home-menu-btn--tile"
            onClick={() => void navigate('/stats')}
          >
            统计
          </button>
          <button
            type="button"
            className="home-menu-btn home-menu-btn--tile"
            onClick={() => void navigate('/settings')}
          >
            设置
          </button>
          <button
            type="button"
            className="home-menu-btn home-menu-btn--tile"
            onClick={() => void navigate('/achievements')}
          >
            成就
          </button>
        </div>
      </nav>

      {modeOpen ? (
        <div className="home-mode-overlay" role="dialog" aria-modal="true" aria-labelledby="home-mode-title">
          <div className="home-mode-panel">
            <h2 id="home-mode-title" className="home-mode-title">
              选择作战模式
            </h2>
            <p className="home-mode-hint">
              不同模式影响刷怪兵种分布。击杀敌人有机会掉落紫色装备箱：随机九部位词条装备（等级越高词条越多并含稀有），拾取后入库并在装备页穿戴；地图仍会周期性出现金色增益宝箱。
            </p>
            <div className="home-mode-list">
              {GAME_MODE_DEFS.map((def) => (
                <button
                  key={def.id}
                  type="button"
                  className="home-mode-option"
                  onClick={() => {
                    setPendingGameMode(def.id);
                    setModeOpen(false);
                    void navigate('/game');
                  }}
                >
                  <span className="home-mode-option-name">{def.displayName}</span>
                  <span className="home-mode-option-sum">{def.summary}</span>
                </button>
              ))}
            </div>
            <button type="button" className="home-mode-cancel" onClick={() => setModeOpen(false)}>
              取消
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
