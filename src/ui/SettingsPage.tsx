import { useNavigate } from 'react-router-dom';

/** 占位设置页：音量等后续接本地存储 */
export function SettingsPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center bg-[#120a06]/92 p-4">
      <div className="w-full max-w-[360px] rounded-[14px] border-2 border-[#6a5848] bg-gradient-to-b from-[#3a3028] to-[#221c18] px-6 py-10 shadow-lg">
        <h1 className="text-center text-[28px] font-bold text-[#f5e6d3]">设置</h1>
        <p className="mt-6 text-center text-base leading-6 text-[#c8b8a0]">
          音效、画质等选项将在此配置
          <br />
          当前为占位界面
        </p>
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            className="rounded-full border-2 border-[#5a4020] bg-[#e8c878] px-10 py-2.5 text-xl font-bold text-[#2a1a0a]"
            onClick={() => void navigate('/')}
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
