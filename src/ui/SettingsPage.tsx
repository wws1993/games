import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { playSettingsTestSfx, resumeAudioIfNeeded } from '../game/audio/gameAudio';
import {
  getAudioSettingsSnapshot,
  loadAudioSettings,
  subscribeAudioSettings,
  updateAudioSettings,
  type AudioSettingsState,
} from '../game/meta/audioSettingsStore';

/** 将 0–1 倍率转为整数百分比展示 */
function toPct(v: number): number {
  return Math.round(v * 100);
}

/** 将整数百分比压回 0–1 */
function fromPct(n: number): number {
  return Math.min(1, Math.max(0, n / 100));
}

/** 设置页：主音量、音乐与音效开关及滑块，写入 localStorage 并驱动全局 Web Audio */
export function SettingsPage(): JSX.Element {
  const navigate = useNavigate();
  const [st, setSt] = useState<AudioSettingsState>(() => loadAudioSettings());

  useEffect(() => {
    return subscribeAudioSettings(() => {
      setSt(getAudioSettingsSnapshot());
    });
  }, []);

  return (
    <div className="page page-panel page-settings">
      <header className="page-settings-nav">
        <button type="button" className="codex-back" onClick={() => void navigate('/')}>
          <span aria-hidden className="codex-back-chevron" />
          返回首页
        </button>
      </header>
      <div className="page-settings-body">
        <div className="page-panel-card page-settings-card">
          <h1 className="page-panel-title">设置</h1>
          <p className="page-settings-lead">音量与开关会保存在本机，可随时调整背景音乐与音效。</p>

          <div className="page-settings-section">
            <div className="page-settings-row">
              <span className="page-settings-label">总音量</span>
              <span className="page-settings-value">{toPct(st.masterVolume)}%</span>
            </div>
            <input
              type="range"
              className="page-settings-range"
              min={0}
              max={100}
              value={toPct(st.masterVolume)}
              aria-label="总音量"
              onChange={(e) => updateAudioSettings({ masterVolume: fromPct(Number(e.target.value)) })}
            />
          </div>

          <div className="page-settings-section">
            <div className="page-settings-row">
              <span className="page-settings-label">音乐</span>
              <label className="page-settings-switch">
                <input
                  type="checkbox"
                  checked={st.musicEnabled}
                  onChange={(e) => updateAudioSettings({ musicEnabled: e.target.checked })}
                />
                <span className="page-settings-switch-ui" aria-hidden />
              </label>
            </div>
            <div className="page-settings-row page-settings-row--sub">
              <span className="page-settings-sublabel">音乐音量</span>
              <span className="page-settings-value">{toPct(st.musicVolume)}%</span>
            </div>
            <input
              type="range"
              className="page-settings-range"
              min={0}
              max={100}
              value={toPct(st.musicVolume)}
              disabled={!st.musicEnabled}
              aria-label="音乐音量"
              onChange={(e) => updateAudioSettings({ musicVolume: fromPct(Number(e.target.value)) })}
            />
          </div>

          <div className="page-settings-section">
            <div className="page-settings-row">
              <span className="page-settings-label">音效</span>
              <label className="page-settings-switch">
                <input
                  type="checkbox"
                  checked={st.sfxEnabled}
                  onChange={(e) => updateAudioSettings({ sfxEnabled: e.target.checked })}
                />
                <span className="page-settings-switch-ui" aria-hidden />
              </label>
            </div>
            <div className="page-settings-row page-settings-row--sub">
              <span className="page-settings-sublabel">音效音量</span>
              <span className="page-settings-value">{toPct(st.sfxVolume)}%</span>
            </div>
            <input
              type="range"
              className="page-settings-range"
              min={0}
              max={100}
              value={toPct(st.sfxVolume)}
              disabled={!st.sfxEnabled}
              aria-label="音效音量"
              onChange={(e) => updateAudioSettings({ sfxVolume: fromPct(Number(e.target.value)) })}
            />
          </div>

          <div className="page-settings-actions">
            <button
              type="button"
              className="page-btn-primary page-settings-test"
              onClick={() => {
                void resumeAudioIfNeeded();
                playSettingsTestSfx();
              }}
            >
              试听音效
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
