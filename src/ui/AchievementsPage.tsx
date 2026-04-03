import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { ACHIEVEMENT_DEFS } from '../game/meta/achievementDefs';
import {
  getAchievementProgressSummary,
  getUnlockedAchievementIds,
  loadAchievementSave,
} from '../game/meta/achievementStore';

/** 成就列表：存档推导解锁态，顶栏展示进度摘要与「已解锁 n / 总数」 */
export function AchievementsPage(): JSX.Element {
  const navigate = useNavigate();
  const { rows, summary, unlockedCount, totalCount } = useMemo(() => {
    const save = loadAchievementSave();
    const unlocked = getUnlockedAchievementIds(save);
    const p = getAchievementProgressSummary(save);
    const list = ACHIEVEMENT_DEFS.map((def) => ({ def, ok: unlocked.has(def.id) }));
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
        <h1 className="achievements-header-title">成就</h1>
        <p className="achievements-summary">{summary}</p>
        <p className="achievements-progress" aria-live="polite">
          已解锁 {unlockedCount} / {totalCount}
        </p>
      </header>
      <div className="page-scroll">
        <ul className="ach-list">
          {rows.map(({ def, ok }) => (
            <li key={def.id} className={`ach-item ${ok ? 'ach-item--unlocked' : ''}`}>
              <div className="ach-item-head">
                <h2 className={`ach-item-title ${ok ? 'ach-item-title--ok' : ''}`}>{def.title}</h2>
                <span className={`ach-item-badge ${ok ? 'ach-item-badge--ok' : ''}`}>
                  {ok ? '已解锁' : '未解锁'}
                </span>
              </div>
              <p className={`ach-item-desc ${ok ? 'ach-item-desc--ok' : ''}`}>{def.description}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="page-bottom-bar">
        <button type="button" className="page-btn-primary" onClick={() => void navigate('/')}>
          返回
        </button>
      </div>
    </div>
  );
}
