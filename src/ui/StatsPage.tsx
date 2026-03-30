import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { getPlayerStatsSnapshot, loadAchievementSave } from '../game/meta/achievementStore';
import { formatDurationCn } from '../utils/formatDuration';

/** 累计作战时长、击杀、局数等（读 `PlayerProfileSave`） */
export function StatsPage(): JSX.Element {
  const navigate = useNavigate();
  const bodyText = useMemo(() => {
    const s = getPlayerStatsSnapshot(loadAchievementSave());
    const lines = [
      `累计军功：${s.totalMerit}`,
      `累计作战时长：${formatDurationCn(s.totalPlayTimeSec)}`,
      `累计结算局数：${s.totalSessions}`,
      `累计击杀：${s.totalKills}`,
      `累计阵亡：${s.deathCount}`,
      `单局最长存活：${formatDurationCn(s.bestSurvivalSec)}`,
      `平均每局存活：${formatDurationCn(s.avgSurvivalSec)}`,
      '',
      '说明：仅在战斗结束并点击返回首页时结算本局数据（含军功）。',
    ];
    return lines.join('\n');
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center bg-[#0c0806]/93 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-[#6a5840] bg-gradient-to-b from-[#2c241c] to-[#1a1410] px-5 py-6 shadow-lg">
        <h1 className="text-center text-[28px] font-bold text-[#f5e6d3]">数据统计</h1>
        <p className="mt-5 whitespace-pre-wrap text-left text-base leading-7 text-[#d8ccb8]">{bodyText}</p>
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            className="rounded-full border-2 border-[#5a4020] bg-[#e8c878] px-8 py-2.5 text-xl font-bold text-[#2a1a0a]"
            onClick={() => void navigate('/')}
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
