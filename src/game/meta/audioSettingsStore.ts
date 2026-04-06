/** 音频偏好：主音量 / 音乐 / 音效，持久化到 localStorage；变更时通知订阅者以同步 Web Audio 增益 */
const STORAGE_KEY = 'app_game_audio_v1';

/** 单例快照，供 `subscribeAudioSettings` 与 React 同步 */
export interface AudioSettingsState {
  /** 总音量倍率 0–1，作用于音乐与音效 */
  masterVolume: number;
  /** 音乐倍率 0–1（再乘 master） */
  musicVolume: number;
  /** 音效倍率 0–1（再乘 master） */
  sfxVolume: number;
  /** 是否播放背景音乐 */
  musicEnabled: boolean;
  /** 是否播放音效 */
  sfxEnabled: boolean;
}

const DEFAULT_STATE: AudioSettingsState = {
  masterVolume: 0.85,
  musicVolume: 0.55,
  sfxVolume: 0.75,
  musicEnabled: true,
  sfxEnabled: true,
};

let snapshot: AudioSettingsState = { ...DEFAULT_STATE };

const listeners = new Set<() => void>();

function clamp01(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(1, Math.max(0, n));
}

function normalize(raw: unknown): AudioSettingsState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STATE };
  }
  const o = raw as Record<string, unknown>;
  return {
    masterVolume: clamp01(Number(o.masterVolume) || DEFAULT_STATE.masterVolume),
    musicVolume: clamp01(Number(o.musicVolume) || DEFAULT_STATE.musicVolume),
    sfxVolume: clamp01(Number(o.sfxVolume) || DEFAULT_STATE.sfxVolume),
    musicEnabled: typeof o.musicEnabled === 'boolean' ? o.musicEnabled : DEFAULT_STATE.musicEnabled,
    sfxEnabled: typeof o.sfxEnabled === 'boolean' ? o.sfxEnabled : DEFAULT_STATE.sfxEnabled,
  };
}

/** 从 localStorage 读取并更新内存快照 */
export function loadAudioSettings(): AudioSettingsState {
  if (typeof localStorage === 'undefined') {
    snapshot = { ...DEFAULT_STATE };
    return snapshot;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      snapshot = { ...DEFAULT_STATE };
      return snapshot;
    }
    snapshot = normalize(JSON.parse(raw) as unknown);
    return snapshot;
  } catch {
    snapshot = { ...DEFAULT_STATE };
    return snapshot;
  }
}

function persist(state: AudioSettingsState): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 存储满或隐私模式 */
  }
}

function emit(): void {
  for (const cb of listeners) {
    cb();
  }
}

/** 合并写入、持久化并通知（用于设置页滑块与开关） */
export function updateAudioSettings(partial: Partial<AudioSettingsState>): AudioSettingsState {
  const next: AudioSettingsState = {
    ...snapshot,
    ...partial,
  };
  next.masterVolume = clamp01(next.masterVolume);
  next.musicVolume = clamp01(next.musicVolume);
  next.sfxVolume = clamp01(next.sfxVolume);
  snapshot = next;
  persist(snapshot);
  emit();
  return snapshot;
}

/** 订阅设置变更；返回取消订阅函数 */
export function subscribeAudioSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** 供 `useSyncExternalStore` 或初次渲染使用的当前快照 */
export function getAudioSettingsSnapshot(): AudioSettingsState {
  return snapshot;
}

/** 将主音量与音乐/音效倍率合成为音乐总增益 0–1 */
export function getEffectiveMusicGain(): number {
  if (!snapshot.musicEnabled) {
    return 0;
  }
  return snapshot.masterVolume * snapshot.musicVolume;
}

/** 将主音量与音效倍率合成为音效总增益 0–1 */
export function getEffectiveSfxGain(): number {
  if (!snapshot.sfxEnabled) {
    return 0;
  }
  return snapshot.masterVolume * snapshot.sfxVolume;
}

// 模块加载时恢复
loadAudioSettings();
