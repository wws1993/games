import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { getPlayerStatsDetailView, loadAchievementSave } from '../game/meta/achievementStore';
import { formatDurationCn } from '../utils/formatDuration';

/** 单条统计卡片：标签 + 展示值（时长类可能换行） */
type StatsMetricRow = {
  id: string;
  label: string;
  value: string;
  /** 占满一行（如较长说明性数值） */
  wide?: boolean;
};

/** 击杀里程碑阈值（与成就「百人斩」等一致） */
const KILL_MILESTONES = [
  { id: 'm100', target: 100, label: '百人斩' },
  { id: 'm1000', target: 1000, label: '千人斩' },
  { id: 'm10000', target: 10000, label: '万人斩' },
] as const;

/** 累计作战、效率与紫装可视化；进入本页时按路由 key 重读存档 */
export function StatsPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const detail = useMemo(() => getPlayerStatsDetailView(loadAchievementSave()), [location.key]);
  const s = detail.snapshot;

  const combatHead: StatsMetricRow = {
    id: 'play',
    label: '累计作战时长',
    value: formatDurationCn(s.totalPlayTimeSec),
    wide: true,
  };
  const combatMid: StatsMetricRow[] = [
    { id: 'sessions', label: '累计结算局数', value: String(s.totalSessions) },
    { id: 'kills', label: '累计击杀', value: String(s.totalKills) },
    { id: 'deaths', label: '累计阵亡', value: String(s.deathCount) },
    { id: 'coins', label: '金币', value: String(s.coins) },
  ];
  const combatTail: StatsMetricRow[] = [
    { id: 'best', label: '单局最长存活', value: formatDurationCn(s.bestSurvivalSec), wide: true },
    { id: 'avg', label: '平均每局存活', value: formatDurationCn(s.avgSurvivalSec), wide: true },
  ];

  const efficiencyRows: StatsMetricRow[] = [
    {
      id: 'kps',
      label: '场均击杀',
      value: s.totalSessions > 0 ? detail.avgKillsPerSession.toFixed(1) : '—',
    },
    {
      id: 'kd',
      label: '累计击杀 / 阵亡',
      value: detail.killsPerDeath !== null ? detail.killsPerDeath.toFixed(1) : '—',
    },
    {
      id: 'stash',
      label: '紫装箱库件数',
      value: String(detail.purpleStashCount),
    },
    {
      id: 'lock',
      label: '锁定件数',
      value: String(detail.lockedGearCount),
    },
  ];

  const achPct =
    detail.achievementTotal > 0 ? (detail.achievementUnlocked / detail.achievementTotal) * 100 : 0;
  const donutDeg = Math.min(360, Math.max(0, (detail.achievementUnlocked / detail.achievementTotal) * 360));

  const survMax = Math.max(s.bestSurvivalSec, s.avgSurvivalSec, 1e-6);
  const bestPct = (s.bestSurvivalSec / survMax) * 100;
  const avgPct = (s.avgSurvivalSec / survMax) * 100;

  return (
    <div className="page page-stats">
      <header className="stats-header">
        <div className="page-subnav-row">
          <button type="button" className="codex-back page-subnav-back" onClick={() => void navigate('/')}>
            <span aria-hidden className="codex-back-chevron" />
            返回首页
          </button>
        </div>
        <h1 className="stats-header-title">数据统计</h1>
        <p className="stats-header-sub">累计与单局表现；仅在战斗结束并返回首页时结算本局。</p>
      </header>
      <div className="page-scroll stats-body">
        <h2 className="stats-section-title">作战与局数</h2>
        <ul className="stats-grid">
          <li className="stats-metric stats-metric--wide">
            <p className="stats-metric-label">{combatHead.label}</p>
            <p className="stats-metric-value">{combatHead.value}</p>
          </li>
        </ul>
        <ul className="stats-grid stats-grid--3cols">
          {combatMid.map((m) => (
            <li key={m.id} className="stats-metric">
              <p className="stats-metric-label">{m.label}</p>
              <p className="stats-metric-value">{m.value}</p>
            </li>
          ))}
        </ul>
        <ul className="stats-grid">
          {combatTail.map((m) => (
            <li key={m.id} className={`stats-metric ${m.wide ? 'stats-metric--wide' : ''}`}>
              <p className="stats-metric-label">{m.label}</p>
              <p className="stats-metric-value">{m.value}</p>
            </li>
          ))}
        </ul>

        <h2 className="stats-section-title">作战效率与装备摘要</h2>
        <ul className="stats-grid">
          {efficiencyRows.map((m) => (
            <li key={m.id} className="stats-metric">
              <p className="stats-metric-label">{m.label}</p>
              <p className="stats-metric-value">{m.value}</p>
            </li>
          ))}
        </ul>

        <div className="stats-viz-row">
          <div className="stats-viz-card">
            <h3 className="stats-viz-heading">成就解锁</h3>
            <div className="stats-donut-wrap" aria-hidden>
              <div
                className="stats-donut"
                style={{
                  background: `conic-gradient(#c87858 0deg ${donutDeg}deg, rgba(232, 216, 208, 0.95) ${donutDeg}deg 360deg)`,
                }}
              />
              <div className="stats-donut-hole">
                <span className="stats-donut-num">
                  {detail.achievementUnlocked}/{detail.achievementTotal}
                </span>
              </div>
            </div>
            <p className="stats-viz-caption">已解锁 {achPct.toFixed(0)}%</p>
          </div>

          <div className="stats-viz-card stats-viz-card--grow">
            <h3 className="stats-viz-heading">存活对比（相对尺度）</h3>
            <div className="stats-compare">
              <div className="stats-compare-row">
                <span className="stats-compare-label">单局最长</span>
                <div className="stats-compare-track">
                  <div className="stats-compare-fill stats-compare-fill--best" style={{ width: `${bestPct}%` }} />
                </div>
                <span className="stats-compare-val">{formatDurationCn(s.bestSurvivalSec)}</span>
              </div>
              <div className="stats-compare-row">
                <span className="stats-compare-label">平均每局</span>
                <div className="stats-compare-track">
                  <div className="stats-compare-fill stats-compare-fill--avg" style={{ width: `${avgPct}%` }} />
                </div>
                <span className="stats-compare-val">{formatDurationCn(s.avgSurvivalSec)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-viz-card stats-viz-card--block">
          <h3 className="stats-viz-heading">击杀里程碑</h3>
          <ul className="stats-milestone-list">
            {KILL_MILESTONES.map((ms) => {
              const pct = Math.min(100, (s.totalKills / ms.target) * 100);
              return (
                <li key={ms.id} className="stats-milestone-item">
                  <div className="stats-milestone-head">
                    <span className="stats-milestone-name">{ms.label}</span>
                    <span className="stats-milestone-num">
                      {s.totalKills} / {ms.target}
                    </span>
                  </div>
                  <div className="stats-milestone-track">
                    <div className="stats-milestone-fill" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="stats-viz-card stats-viz-card--block">
          <h3 className="stats-viz-heading">紫装箱库 · 等阶占比</h3>
          {detail.purpleGradeTotal === 0 ? (
            <p className="stats-viz-empty">暂无紫装，对局内拾取紫箱后将在此显示分布。</p>
          ) : (
            <div className="stats-grade-stack-wrap">
              <div className="stats-grade-stack" role="img" aria-label="紫装等阶堆叠条">
                {detail.purpleGradeSlices.map((sl) => (
                  <div
                    key={sl.grade}
                    className="stats-grade-seg"
                    style={{
                      flex: sl.count,
                      background: sl.bgCss,
                    }}
                    title={`${sl.tierName}：${sl.count} 件`}
                  />
                ))}
              </div>
              <ul className="stats-grade-legend">
                {detail.purpleGradeSlices.map((sl) => (
                  <li key={sl.grade} className="stats-grade-legend-item">
                    <span className="stats-grade-dot" style={{ background: sl.bgCss }} />
                    <span className="stats-grade-legend-text">
                      {sl.tierName} ×{sl.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="stats-viz-card stats-viz-card--block">
          <h3 className="stats-viz-heading">九部位穿戴</h3>
          <p className="stats-slot-summary">
            已装备 {detail.equippedSlotsFilled} / {detail.slotEquipped.length} 个部位
          </p>
          <ul className="stats-slot-grid">
            {detail.slotEquipped.map((slot) => (
              <li
                key={slot.id}
                className={`stats-slot-cell ${slot.equipped ? 'stats-slot-cell--on' : ''}`}
              >
                <span className="stats-slot-name">{slot.label}</span>
                <span className="stats-slot-flag">{slot.equipped ? '已穿' : '空'}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="stats-note">
          说明：紫箱装备在拾取时入库；在「装备」页穿戴九部位后，词条聚合作用于局内。
        </aside>
      </div>
    </div>
  );
}
