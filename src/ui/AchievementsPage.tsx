import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { ACHIEVEMENT_DEFS } from '../game/meta/achievementDefs';
import {
  getAchievementProgressDetail,
  getAchievementProgressSummary,
  getUnlockedAchievementIds,
  loadAchievementSave,
} from '../game/meta/achievementStore';
import { AchievementIcon } from './AchievementIcon';

/** 成就列表：专属图标、数值进度条、存档推导解锁态；顶栏摘要与「已解锁 n / 总数」 */
export function AchievementsPage(): JSX.Element {
  const navigate = useNavigate();
  const { rows, summary, unlockedCount, totalCount } = useMemo(() => {
    const save = loadAchievementSave();
    const unlocked = getUnlockedAchievementIds(save);
    const p = getAchievementProgressSummary(save);
    const list = ACHIEVEMENT_DEFS.map((def) => ({
      def,
      ok: unlocked.has(def.id),
      progress: getAchievementProgressDetail(save, def.id),
    }));
    const okN = list.filter((r) => r.ok).length;
    return {
      summary: `累计击杀 ${p.totalKills} · 累计阵亡 ${p.deathCount}`,
      rows: list,
      unlockedCount: okN,
      totalCount: ACHIEVEMENT_DEFS.length,
    };
  }, []);

  return (
    <div className="page page-achievements">
      <header className="achievements-header">
        <div className="page-subnav-row">
          <button type="button" className="codex-back page-subnav-back" onClick={() => void navigate('/')}>
            <span aria-hidden className="codex-back-chevron" />
            返回首页
          </button>
        </div>
        <h1 className="achievements-header-title">成就</h1>
        <p className="achievements-summary">{summary}</p>
        <p className="achievements-progress" aria-live="polite">
          已解锁 {unlockedCount} / {totalCount}
        </p>
      </header>
      <div className="page-scroll">
        <ul className="ach-list">
          {rows.map(({ def, ok, progress }) => (
            <li key={def.id} className={`ach-item ${ok ? 'ach-item--unlocked' : ''}`}>
              <div className="ach-item-row">
                <div className={`ach-item-icon-wrap ${ok ? 'ach-item-icon-wrap--ok' : ''}`} aria-hidden>
                  <AchievementIcon id={def.id} />
                </div>
                <div className="ach-item-body">
                  <div className="ach-item-head">
                    <h2 className={`ach-item-title ${ok ? 'ach-item-title--ok' : ''}`}>{def.title}</h2>
                    <span className={`ach-item-badge ${ok ? 'ach-item-badge--ok' : ''}`}>
                      {ok ? '已解锁' : '未解锁'}
                    </span>
                  </div>
                  <div className="ach-item-progress-row">
                    <div className="ach-item-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.ratio * 100)}>
                      <div className="ach-item-progress-fill" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
                    </div>
                    <span className="ach-item-progress-label">{progress.shortLabel}</span>
                  </div>
                  <p className={`ach-item-desc ${ok ? 'ach-item-desc--ok' : ''}`}>{def.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
