import { useNavigate } from 'react-router-dom';

/** 与仓库 `public/bg-home.png` 对应 */
const HOME_BG_URL = `${import.meta.env.BASE_URL}bg-home.png`;

/** 竖屏主菜单：背景图 + 标题 + 底部入口列表 */
export function HomePage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-gradient-to-b from-[#ffe8b0] via-[#ffd48a] to-[#e8a86a]"
      style={{
        backgroundImage: `url(${HOME_BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35" />
      <div className="relative z-[1] flex flex-1 flex-col pt-[12vh]">
        <h1
          className="text-center text-[clamp(1.6rem,7vw,2.1rem)] font-black tracking-wide text-[#fff8e8] drop-shadow-[0_4px_6px_rgba(42,24,8,0.85)]"
          style={{
            WebkitTextStroke: '2px #4d2e1a',
            paintOrder: 'stroke fill',
          }}
        >
          敌后幸存者
        </h1>
        <p className="mt-3 text-center text-lg font-semibold text-[#e8d8c8] drop-shadow-sm">选择入口</p>
      </div>
      <nav className="relative z-[1] mx-auto mb-[max(2rem,7vh)] flex w-full max-w-sm flex-col items-center gap-4 px-6 pb-2">
        <button
          type="button"
          className="text-xl font-semibold text-[#f2ebe4] drop-shadow-[0_1px_4px_rgba(0,0,0,0.88)] [text-shadow:0_0_1px_#1a1410]"
          onClick={() => void navigate('/game')}
        >
          开始游戏
        </button>
        <button
          type="button"
          className="text-xl font-semibold text-[#f2ebe4] drop-shadow-[0_1px_4px_rgba(0,0,0,0.88)] [text-shadow:0_0_1px_#1a1410]"
          onClick={() => void navigate('/codex')}
        >
          图鉴
        </button>
        <button
          type="button"
          className="text-xl font-semibold text-[#f2ebe4] drop-shadow-[0_1px_4px_rgba(0,0,0,0.88)] [text-shadow:0_0_1px_#1a1410]"
          onClick={() => void navigate('/stats')}
        >
          统计
        </button>
        <button
          type="button"
          className="text-xl font-semibold text-[#f2ebe4] drop-shadow-[0_1px_4px_rgba(0,0,0,0.88)] [text-shadow:0_0_1px_#1a1410]"
          onClick={() => void navigate('/settings')}
        >
          设置
        </button>
        <button
          type="button"
          className="text-xl font-semibold text-[#f2ebe4] drop-shadow-[0_1px_4px_rgba(0,0,0,0.88)] [text-shadow:0_0_1px_#1a1410]"
          onClick={() => void navigate('/achievements')}
        >
          成就
        </button>
      </nav>
    </div>
  );
}
