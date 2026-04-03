import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { getPlayerStatsSnapshot, loadAchievementSave } from '../game/meta/achievementStore';
import { formatDurationCn } from '../utils/formatDuration';

/** 单条统计卡片：标签 + 展示值（时长类可能换行） */
type StatsMetricRow = {
  id: string;
  label: string;
  value: string;
  /** 占满一行（如较长说明性数值） */
  wide?: boolean;
};

/** 累计作战时长、击杀、局数等；布局为暖色底 + 指标宫格 + 说明脚注 */
export function StatsPage(): JSX.Element {
  const navigate = useNavigate();
  const metrics = useMemo((): StatsMetricRow[] => {
    const s = getPlayerStatsSnapshot(loadAchievementSave());
    return [
      { id: 'play', label: '累计作战时长', value: formatDurationCn(s.totalPlayTimeSec), wide: true },
      { id: 'sessions', label: '累计结算局数', value: String(s.totalSessions) },
      { id: 'kills', label: '累计击杀', value: String(s.totalKills) },
      { id: 'deaths', label: '累计阵亡', value: String(s.deathCount) },
      { id: 'best', label: '单局最长存活', value: formatDurationCn(s.bestSurvivalSec), wide: true },
      { id: 'avg', label: '平均每局存活', value: formatDurationCn(s.avgSurvivalSec), wide: true },
    ];
  }, []);

  return (
    <div className="page page-stats">
      <header className="stats-header">
        <h1 className="stats-header-title">数据统计</h1>
        <p className="stats-header-sub">累计与单局表现；仅在战斗结束并返回首页时结算本局。</p>
      </header>
      <div className="page-scroll stats-body">
        <ul className="stats-grid">
          {metrics.map((m) => (
            <li
              key={m.id}
              className={`stats-metric ${m.wide ? 'stats-metric--wide' : ''}`}
            >
              <p className="stats-metric-label">{m.label}</p>
              <p className="stats-metric-value">{m.value}</p>
            </li>
          ))}
        </ul>
        <aside className="stats-note">
          说明：紫箱装备在拾取时入库；在「装备」页穿戴九部位后，词条聚合作用于局内。
        </aside>
      </div>
      <div className="page-bottom-bar">
        <button type="button" className="page-btn-primary" onClick={() => void navigate('/')}>
          返回
        </button>
      </div>
    </div>
  );
}
