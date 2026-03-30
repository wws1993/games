import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { ACHIEVEMENT_DEFS } from '../game/meta/achievementDefs';
import {
  getAchievementProgressSummary,
  getUnlockedAchievementIds,
  loadAchievementSave,
} from '../game/meta/achievementStore';

/** 成就列表：本地存档统计 + 可滚动 */
export function AchievementsPage(): JSX.Element {
  const navigate = useNavigate();
  const { rows, summary } = useMemo(() => {
    const save = loadAchievementSave();
    const unlocked = getUnlockedAchievementIds(save);
    const p = getAchievementProgressSummary(save);
    return {
      summary: `累计军功 ${p.totalMerit}　累计击杀 ${p.totalKills}　累计阵亡 ${p.deathCount}`,
      rows: ACHIEVEMENT_DEFS.map((def) => ({ def, ok: unlocked.has(def.id) })),
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#181008]/94">
      <header className="shrink-0 px-4 pt-10 text-center">
        <h1 className="text-[28px] font-bold text-[#fff4d0]">成就</h1>
        <p className="mt-2 text-sm text-[#b8a890]">{summary}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-4">
        <ul className="mx-auto flex max-w-lg flex-col gap-3.5">
          {rows.map(({ def, ok }) => (
            <li
              key={def.id}
              className={`rounded-lg border-l-[5px] px-3 py-3 ${
                ok ? 'border-[#c9a030] bg-black/20' : 'border-[#4a4540] bg-black/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className={`text-[17px] font-bold ${ok ? 'text-[#fff4e8]' : 'text-[#7a7268]'}`}>{def.title}</h2>
                <span className={`shrink-0 text-xs font-bold ${ok ? 'text-[#88cc88]' : 'text-[#665850]'}`}>
                  {ok ? '已解锁' : '未解锁'}
                </span>
              </div>
              <p className={`mt-2 text-sm leading-[22px] ${ok ? 'text-[#a09080]' : 'text-[#5a5248]'}`}>{def.description}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="fixed bottom-0 left-0 right-0 flex justify-center bg-gradient-to-t from-[#181008] py-5">
        <button
          type="button"
          className="rounded-full border-2 border-[#5a4020] bg-[#e8c878] px-10 py-2.5 text-xl font-bold text-[#2a1a0a]"
          onClick={() => void navigate('/')}
        >
          返回
        </button>
      </div>
    </div>
  );
}
