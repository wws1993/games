import { useNavigate } from 'react-router-dom';

/** 占位设置页：音量等后续接本地存储 */
export function SettingsPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="page page-panel page-settings">
      <div className="page-panel-card">
        <h1 className="page-panel-title">设置</h1>
        <p className="page-panel-body page-panel-body--center">
          音效、画质等选项将在此配置
          <br />
          当前为占位界面
        </p>
      </div>
      <div className="page-bottom-bar">
        <button type="button" className="page-btn-primary" onClick={() => void navigate('/')}>
          返回
        </button>
      </div>
    </div>
  );
}
