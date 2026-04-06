import {
  getEffectiveMusicGain,
  getEffectiveSfxGain,
  loadAudioSettings,
  subscribeAudioSettings,
} from '../meta/audioSettingsStore';

/** 背景音乐场景：优先播放 `public/bgm/冲锋！.mp3`；`fetch` 失败时用 G 小调/126BPM 程序化近似 */
export type BgmScene = 'menu' | 'battle';

/** 与 `public/bgm/` 下文件名一致；含中文与符号，请求时用 `encodeURIComponent` */
const BGM_ASSET_FILE_NAME = '冲锋！.mp3';

/** 《UwU Funk》公开资料约 126 BPM、G 小调；十六分音时长（秒） */
const UWU_FUNK_BPM = 126;
const BGM_SIXTEENTH_SEC = 60 / UWU_FUNK_BPM / 4;
const BGM_EIGHTH_SEC = BGM_SIXTEENTH_SEC * 2;

let ctx: AudioContext | null = null;
/** 用户已交互解锁前不播放，避免自动播放策略拦截 */
let unlocked = false;
/** 当前路由期望的场景（未解锁时仍记录，解锁后立即应用） */
let desiredScene: BgmScene = 'menu';

let bgmMasterGain: GainNode | null = null;
/** 旋律层总线，便于一键断开 */
let bgmMelodyBus: GainNode | null = null;
/** 接在旋律总线后、略压峰，避免多声部叠乘时爆音 */
let bgmComp: DynamicsCompressorNode | null = null;
/** 已调度但未结束的 BGM 声部（振荡器或鼓点噪声缓冲源） */
type BgmVoice =
  | { kind: 'osc'; osc: OscillatorNode; endSec: number }
  | { kind: 'buf'; src: AudioBufferSourceNode; endSec: number };
const bgmVoices: BgmVoice[] = [];
/** 下一次循环在 `AudioContext` 时间轴上的起点 */
let bgmLoopAnchorSec = 0;
/** `setTimeout` 句柄，切场景或卸载时清除 */
let bgmLoopTimer: ReturnType<typeof setTimeout> | null = null;
/** 当前循环使用的场景（定时器回调需读最新值，避免切页后仍播旧调） */
let bgmSceneActive: BgmScene = 'menu';

/** 解码后的 BGM 整段；`fetch` 失败时为 null，走程序化鼓+方波 */
let bgmUwUFunkBuffer: AudioBuffer | null = null;
/** 文件 BGM 的 `BufferSource`，需在 `disconnectBgmGraph` 中 stop */
let bgmUwUFunkSource: AudioBufferSourceNode | null = null;
/** 避免对 `BGM_ASSET_FILE_NAME` 重复 `fetch`/`decode` */
let bgmUwUFunkLoadState: 'idle' | 'loading' | 'done' | 'failed' = 'idle';

let lastGemSfxMs = 0;

/** 与当前 `AudioContext` 采样率对齐的短白噪缓冲，供步枪射击复用，避免每发分配 */
let rifleNoiseBuffer: AudioBuffer | null = null;
/** BGM 鼓点用略长白噪切片，与步枪缓冲分开避免采样率变更时串用 */
let bgmDrumNoiseBuffer: AudioBuffer | null = null;

/** 懒创建 `AudioContext`（部分浏览器需用户手势后才可 `resume`） */
function ensureCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

function disconnectBgmGraph(): void {
  if (bgmUwUFunkSource) {
    try {
      bgmUwUFunkSource.stop(0);
      bgmUwUFunkSource.disconnect();
    } catch {
      /* 已停止 */
    }
    bgmUwUFunkSource = null;
  }
  if (bgmLoopTimer != null) {
    clearTimeout(bgmLoopTimer);
    bgmLoopTimer = null;
  }
  for (const v of bgmVoices) {
    try {
      if (v.kind === 'osc') {
        v.osc.stop(0);
        v.osc.disconnect();
      } else {
        v.src.stop(0);
        v.src.disconnect();
      }
    } catch {
      /* 已停止 */
    }
  }
  bgmVoices.length = 0;
  try {
    bgmMelodyBus?.disconnect();
  } catch {
    /* */
  }
  bgmMelodyBus = null;
  try {
    bgmComp?.disconnect();
  } catch {
    /* */
  }
  bgmComp = null;
}

/** 将 store 中的音乐总增益应用到 BGM 主增益节点 */
function applyBgmMasterFromStore(): void {
  if (!bgmMasterGain) {
    return;
  }
  const g = getEffectiveMusicGain();
  const c = bgmMasterGain.context;
  const t = c.currentTime;
  bgmMasterGain.gain.cancelScheduledValues(t);
  bgmMasterGain.gain.setValueAtTime(g, t);
}

subscribeAudioSettings(() => {
  applyBgmMasterFromStore();
});

/** MIDI 音符号转 Hz（A4=69 → 440Hz） */
function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** 单条旋律步进：音高 + 时长（秒） */
type BgmMelodyStep = { midi: number; durSec: number };

/**
 * 程序化后备主旋：G 小调五声（与《UwU Funk》调性一致），16 个十六分音；步长对齐 126 BPM。
 */
const BGM_LEAD_BATTLE: readonly BgmMelodyStep[] = [
  { midi: 70, durSec: BGM_SIXTEENTH_SEC },
  { midi: 72, durSec: BGM_SIXTEENTH_SEC },
  { midi: 70, durSec: BGM_SIXTEENTH_SEC },
  { midi: 67, durSec: BGM_SIXTEENTH_SEC },
  { midi: 70, durSec: BGM_SIXTEENTH_SEC },
  { midi: 72, durSec: BGM_SIXTEENTH_SEC },
  { midi: 77, durSec: BGM_SIXTEENTH_SEC },
  { midi: 74, durSec: BGM_SIXTEENTH_SEC },
  { midi: 70, durSec: BGM_SIXTEENTH_SEC },
  { midi: 67, durSec: BGM_SIXTEENTH_SEC },
  { midi: 65, durSec: BGM_SIXTEENTH_SEC },
  { midi: 67, durSec: BGM_SIXTEENTH_SEC },
  { midi: 70, durSec: BGM_SIXTEENTH_SEC },
  { midi: 72, durSec: BGM_SIXTEENTH_SEC },
  { midi: 70, durSec: BGM_SIXTEENTH_SEC },
  { midi: 67, durSec: BGM_SIXTEENTH_SEC },
];

/** 低音：八步八分音符，与 16 步主旋同总长 */
const BGM_BASS_BATTLE: readonly BgmMelodyStep[] = [
  { midi: 43, durSec: BGM_EIGHTH_SEC },
  { midi: 43, durSec: BGM_EIGHTH_SEC },
  { midi: 41, durSec: BGM_EIGHTH_SEC },
  { midi: 46, durSec: BGM_EIGHTH_SEC },
  { midi: 43, durSec: BGM_EIGHTH_SEC },
  { midi: 39, durSec: BGM_EIGHTH_SEC },
  { midi: 41, durSec: BGM_EIGHTH_SEC },
  { midi: 43, durSec: BGM_EIGHTH_SEC },
];

/** 菜单：低大二度、步长略拉长，仍保持强节奏型 */
function mapMenuLead(step: BgmMelodyStep): BgmMelodyStep {
  return { midi: step.midi - 2, durSec: step.durSec * 1.08 };
}

function mapMenuBass(step: BgmMelodyStep): BgmMelodyStep {
  return { midi: step.midi - 2, durSec: step.durSec * 1.08 };
}

/** 计算一组步进的总时长 */
function melodyTotalSec(steps: readonly BgmMelodyStep[]): number {
  let s = 0;
  for (const x of steps) {
    s += x.durSec;
  }
  return s;
}

const BGM_LOOP_SEC_BATTLE = melodyTotalSec(BGM_LEAD_BATTLE);

/** 供鼓点复用的白噪缓冲（约 0.12s） */
function ensureBgmDrumNoiseBuffer(c: AudioContext): AudioBuffer {
  if (bgmDrumNoiseBuffer && bgmDrumNoiseBuffer.sampleRate === c.sampleRate) {
    return bgmDrumNoiseBuffer;
  }
  const durSec = 0.12;
  const n = Math.max(256, Math.floor(c.sampleRate * durSec));
  bgmDrumNoiseBuffer = c.createBuffer(1, n, c.sampleRate);
  const d = bgmDrumNoiseBuffer.getChannelData(0);
  for (let i = 0; i < n; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 0.2;
  }
  return bgmDrumNoiseBuffer;
}

/** 底鼓：低通白噪短促衰减，模拟 8-bit 鼓机底鼓 */
function scheduleBgmDrumKick(
  c: AudioContext,
  tStart: number,
  peak: number,
  dest: AudioNode,
): void {
  const buf = ensureBgmDrumNoiseBuffer(c);
  const src = c.createBufferSource();
  src.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(220, tStart);
  lp.Q.setValueAtTime(0.7, tStart);
  const g = c.createGain();
  const dur = 0.06;
  g.gain.setValueAtTime(0.0001, tStart);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), tStart + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, tStart + dur);
  src.connect(lp);
  lp.connect(g);
  g.connect(dest);
  src.start(tStart);
  src.stop(tStart + dur + 0.02);
  bgmVoices.push({ kind: 'buf', src, endSec: tStart + dur + 0.03 });
}

/** 军鼓：带通白噪 + 略短 */
function scheduleBgmDrumSnare(
  c: AudioContext,
  tStart: number,
  peak: number,
  dest: AudioNode,
): void {
  const buf = ensureBgmDrumNoiseBuffer(c);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1800, tStart);
  bp.Q.setValueAtTime(0.6, tStart);
  const g = c.createGain();
  const dur = 0.045;
  g.gain.setValueAtTime(0.0001, tStart);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), tStart + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, tStart + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(tStart);
  src.stop(tStart + dur + 0.02);
  bgmVoices.push({ kind: 'buf', src, endSec: tStart + dur + 0.03 });
}

/** 踩镲：高通白噪极短 */
function scheduleBgmDrumHat(
  c: AudioContext,
  tStart: number,
  peak: number,
  dest: AudioNode,
): void {
  const buf = ensureBgmDrumNoiseBuffer(c);
  const src = c.createBufferSource();
  src.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(6500, tStart);
  const g = c.createGain();
  const dur = 0.028;
  g.gain.setValueAtTime(0.0001, tStart);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), tStart + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, tStart + dur);
  src.connect(hp);
  hp.connect(g);
  g.connect(dest);
  src.start(tStart);
  src.stop(tStart + dur + 0.015);
  bgmVoices.push({ kind: 'buf', src, endSec: tStart + dur + 0.03 });
}

/**
 * 强节奏鼓组：四拍底鼓（每四分音一击）+ 2/4 军鼓 + 十六分踩镲（战斗全步、菜单八分弱化）；贴近魔性小游戏舞曲听感。
 */
function scheduleBgmDrumPattern(
  c: AudioContext,
  t0: number,
  loopSec: number,
  scene: BgmScene,
  dest: AudioNode,
): void {
  const six = loopSec / 16;
  const kickP = scene === 'battle' ? 0.12 : 0.078;
  const snareP = scene === 'battle' ? 0.082 : 0.052;
  const hatStrong = scene === 'battle' ? 0.042 : 0.028;
  const hatWeak = scene === 'battle' ? 0.032 : 0.022;
  for (let s = 0; s < 16; s++) {
    const t = t0 + s * six;
    if (s % 4 === 0) {
      scheduleBgmDrumKick(c, t, kickP, dest);
    }
    if (s === 4 || s === 12) {
      scheduleBgmDrumSnare(c, t, snareP, dest);
    }
    if (scene === 'battle') {
      const hp = s % 4 === 0 ? hatWeak : hatStrong;
      scheduleBgmDrumHat(c, t, hp, dest);
    } else if (s % 2 === 0) {
      scheduleBgmDrumHat(c, t, hatWeak, dest);
    }
  }
}

/** 调度一个短音符：主奏方波 + 亮低通；低音方波 + 低低通；短起音、线性收尾，颗粒感对齐鼓点 */
function scheduleBgmSynthNote(
  c: AudioContext,
  tStart: number,
  midi: number,
  durSec: number,
  peak: number,
  oscType: OscillatorType,
  lowpassHz: number,
  dest: AudioNode,
): void {
  const osc = c.createOscillator();
  osc.type = oscType;
  osc.frequency.setValueAtTime(midiToHz(midi), tStart);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(lowpassHz, tStart);
  const g = c.createGain();
  const atk = Math.min(0.014, durSec * 0.28);
  const tEnd = tStart + durSec;
  g.gain.setValueAtTime(0.0001, tStart);
  g.gain.linearRampToValueAtTime(peak, tStart + atk);
  g.gain.linearRampToValueAtTime(0.0001, tEnd);
  osc.connect(lp);
  lp.connect(g);
  g.connect(dest);
  osc.start(tStart);
  osc.stop(tEnd + 0.02);
  bgmVoices.push({ kind: 'osc', osc, endSec: tEnd + 0.03 });
}

/** 修剪已自然结束的声部引用，避免数组无限增长 */
function pruneBgmVoices(c: AudioContext): void {
  const t = c.currentTime;
  for (let i = bgmVoices.length - 1; i >= 0; i--) {
    if (bgmVoices[i]!.endSec < t - 0.05) {
      bgmVoices.splice(i, 1);
    }
  }
}

/** 在 `bgmLoopAnchorSec` 起播一整段循环，并在墙钟时间后调度下一段 */
function scheduleBgmLoopTick(): void {
  const scene = bgmSceneActive;
  const c = ensureCtx();
  pruneBgmVoices(c);
  if (!bgmMelodyBus) {
    return;
  }
  const dest = bgmMelodyBus;
  /** 防止 `setTimeout` 漂移导致下一拍从「过去」起音，产生裂隙或叠音 */
  const t0 = Math.max(bgmLoopAnchorSec, c.currentTime + 0.02);
  const leadSteps =
    scene === 'battle' ? BGM_LEAD_BATTLE : BGM_LEAD_BATTLE.map(mapMenuLead);
  const bassSteps =
    scene === 'battle' ? BGM_BASS_BATTLE : BGM_BASS_BATTLE.map(mapMenuBass);
  const loopSec =
    scene === 'battle' ? BGM_LOOP_SEC_BATTLE : melodyTotalSec(leadSteps);
  const leadPeak = scene === 'battle' ? 0.072 : 0.05;
  const bassPeak = scene === 'battle' ? 0.09 : 0.062;
  const leadLp = scene === 'battle' ? 7200 : 5800;

  scheduleBgmDrumPattern(c, t0, loopSec, scene, dest);

  let t = 0;
  for (const step of leadSteps) {
    scheduleBgmSynthNote(c, t0 + t, step.midi, step.durSec, leadPeak, 'square', leadLp, dest);
    t += step.durSec;
  }
  t = 0;
  for (const step of bassSteps) {
    scheduleBgmSynthNote(c, t0 + t, step.midi, step.durSec, bassPeak, 'square', 620, dest);
    t += step.durSec;
  }

  bgmLoopAnchorSec = t0 + loopSec;
  /** 用「距离下一循环锚点」的剩余音频时间设墙钟延迟，减少与 `currentTime` 漂移 */
  const delayMs = Math.max(12, (bgmLoopAnchorSec - c.currentTime) * 1000 - 10);
  bgmLoopTimer = setTimeout(() => {
    bgmLoopTimer = null;
    scheduleBgmLoopTick();
  }, delayMs);
}

/** 从 `public/bgm/` 拉取 `BGM_ASSET_FILE_NAME` 并解码；失败则保持程序化 G 小调/126BPM 后备 */
async function loadBgmUwUFunkOnce(c: AudioContext): Promise<void> {
  if (bgmUwUFunkBuffer || bgmUwUFunkLoadState === 'failed') {
    return;
  }
  if (bgmUwUFunkLoadState === 'loading') {
    return;
  }
  bgmUwUFunkLoadState = 'loading';
  try {
    const url = `${import.meta.env.BASE_URL}bgm/${encodeURIComponent(BGM_ASSET_FILE_NAME)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(String(res.status));
    }
    const raw = await res.arrayBuffer();
    bgmUwUFunkBuffer = await c.decodeAudioData(raw.slice(0));
    bgmUwUFunkLoadState = 'done';
    if (unlocked) {
      buildBgmGraph(desiredScene);
    }
  } catch {
    bgmUwUFunkBuffer = null;
    bgmUwUFunkLoadState = 'failed';
  }
}

/** 将解码缓冲接到旋律总线并 `loop`；整曲循环接缝处可能略有跳变 */
function startBgmUwUFunkLoop(c: AudioContext, buf: AudioBuffer): void {
  if (!bgmMelodyBus) {
    return;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(bgmMelodyBus);
  src.start(0);
  bgmUwUFunkSource = src;
}

/** 构建 BGM：已解码文件则播真轨；否则程序化方波+鼓；`battle` 镲更密 */
function buildBgmGraph(scene: BgmScene): void {
  const c = ensureCtx();
  disconnectBgmGraph();
  if (!bgmMasterGain) {
    bgmMasterGain = c.createGain();
    bgmMasterGain.connect(c.destination);
  }
  applyBgmMasterFromStore();

  bgmMelodyBus = c.createGain();
  bgmMelodyBus.gain.value = scene === 'menu' ? 0.9 : 1;
  bgmComp = c.createDynamicsCompressor();
  bgmComp.threshold.value = -20;
  bgmComp.knee.value = 12;
  bgmComp.ratio.value = 3.4;
  bgmComp.attack.value = 0.006;
  bgmComp.release.value = 0.18;
  bgmMelodyBus.connect(bgmComp);
  bgmComp.connect(bgmMasterGain);

  bgmSceneActive = scene;
  if (bgmUwUFunkBuffer) {
    startBgmUwUFunkLoop(c, bgmUwUFunkBuffer);
  } else {
    bgmLoopAnchorSec = c.currentTime + 0.06;
    scheduleBgmLoopTick();
  }
  void loadBgmUwUFunkOnce(c);
}

/** 按路由切换菜单/战斗铺底；未解锁时仅记录 `desiredScene` */
export function syncBgmScene(pathname: string): void {
  desiredScene = pathname === '/game' ? 'battle' : 'menu';
  if (!unlocked) {
    return;
  }
  buildBgmGraph(desiredScene);
}

/** 用户首次点击/触摸后调用：恢复 `AudioContext` 并启动与当前路由一致的 BGM */
export async function resumeAudioIfNeeded(): Promise<void> {
  loadAudioSettings();
  const c = ensureCtx();
  if (c.state === 'suspended') {
    await c.resume();
  }
  unlocked = true;
  buildBgmGraph(desiredScene);
}

/** 供设置页「试听」：短促确认音，不依赖局内状态 */
export function playSettingsTestSfx(): void {
  const amp = getEffectiveSfxGain();
  if (amp <= 0.001) {
    return;
  }
  playToneSequence(
    [
      { freq: 523.25, t: 0, dur: 0.07 },
      { freq: 659.25, t: 0.08, dur: 0.08 },
    ],
    amp * 0.9,
  );
}

/** 升级三选一面板展开时 */
export function playLevelUpPanelSfx(): void {
  const amp = getEffectiveSfxGain();
  if (amp <= 0.001) {
    return;
  }
  playToneSequence(
    [
      { freq: 392, t: 0, dur: 0.06 },
      { freq: 493.88, t: 0.07, dur: 0.06 },
      { freq: 587.33, t: 0.14, dur: 0.1 },
    ],
    amp * 0.85,
  );
}

/** 玩家点选升级卡后 */
export function playLevelUpConfirmSfx(): void {
  const amp = getEffectiveSfxGain();
  if (amp <= 0.001) {
    return;
  }
  playToneBurst(880, 0.09, amp * 0.65);
}

/** 主角阵亡、显示结算遮罩时 */
export function playGameOverSfx(): void {
  const amp = getEffectiveSfxGain();
  if (amp <= 0.001) {
    return;
  }
  const c = ensureCtx();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, t0);
  osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.55);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(amp * 0.35, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.65);
}

/** 拾取经验球（帧内可能多枚，内部节流） */
export function playGemPickupSfx(): void {
  const amp = getEffectiveSfxGain();
  if (amp <= 0.001) {
    return;
  }
  const now = performance.now();
  if (now - lastGemSfxMs < 45) {
    return;
  }
  lastGemSfxMs = now;
  playToneBurst(740 + Math.random() * 40, 0.035, amp * 0.28);
}

/** 拾取地图宝箱（增益或紫箱） */
export function playChestPickupSfx(): void {
  const amp = getEffectiveSfxGain();
  if (amp <= 0.001) {
    return;
  }
  playToneSequence(
    [
      { freq: 349.23, t: 0, dur: 0.05 },
      { freq: 440, t: 0.06, dur: 0.07 },
      { freq: 554.37, t: 0.14, dur: 0.1 },
    ],
    amp * 0.75,
  );
}

/** 玩家步枪一次齐射（含多发霰弹）时播放；白噪短促衰减 + 高频咔嗒，随主音量与音效开关 */
export function playRifleShootSfx(): void {
  const amp = getEffectiveSfxGain();
  if (amp <= 0.001) {
    return;
  }
  const c = ensureCtx();
  const t0 = c.currentTime;
  const peak = amp * 0.42;
  const buf = ensureRifleNoiseBuffer(c);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'highpass';
  bp.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
  src.connect(bp);
  bp.connect(g);
  g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + 0.07);
  const click = c.createOscillator();
  click.type = 'square';
  click.frequency.setValueAtTime(2400, t0);
  click.frequency.exponentialRampToValueAtTime(420, t0 + 0.028);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.0001, t0);
  g2.gain.exponentialRampToValueAtTime(amp * 0.12, t0 + 0.001);
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  click.connect(g2);
  g2.connect(c.destination);
  click.start(t0);
  click.stop(t0 + 0.045);
}

/** 近战主武器挥击：低频短促扫频，区别于枪声 */
export function playMeleeSwingSfx(): void {
  const amp = getEffectiveSfxGain();
  if (amp <= 0.001) {
    return;
  }
  const c = ensureCtx();
  const t0 = c.currentTime;
  const peak = amp * 0.38;
  const buf = ensureRifleNoiseBuffer(c);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 420;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  src.connect(bp);
  bp.connect(g);
  g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + 0.1);
}

/** 玩家实际扣血时（弹伤/接触等，已计无敌与闪避）；阵亡由 `playGameOverSfx` 另行播放 */
export function playPlayerHurtSfx(): void {
  const amp = getEffectiveSfxGain();
  if (amp <= 0.001) {
    return;
  }
  const c = ensureCtx();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(165, t0);
  osc.frequency.exponentialRampToValueAtTime(72, t0 + 0.11);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(amp * 0.26, t0 + 0.018);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.16);
  const n = c.createOscillator();
  n.type = 'sawtooth';
  n.frequency.setValueAtTime(380, t0);
  n.frequency.exponentialRampToValueAtTime(120, t0 + 0.05);
  const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(amp * 0.08, t0 + 0.006);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  n.connect(gn);
  gn.connect(c.destination);
  n.start(t0);
  n.stop(t0 + 0.1);
}

function ensureRifleNoiseBuffer(c: AudioContext): AudioBuffer {
  if (rifleNoiseBuffer && rifleNoiseBuffer.sampleRate === c.sampleRate) {
    return rifleNoiseBuffer;
  }
  const durSec = 0.06;
  const n = Math.max(256, Math.floor(c.sampleRate * durSec));
  rifleNoiseBuffer = c.createBuffer(1, n, c.sampleRate);
  const d = rifleNoiseBuffer.getChannelData(0);
  for (let i = 0; i < n; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 0.35;
  }
  return rifleNoiseBuffer;
}

function playToneBurst(freq: number, durSec: number, peakAmp: number): void {
  const c = ensureCtx();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peakAmp), t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durSec + 0.02);
}

function playToneSequence(
  steps: readonly { freq: number; t: number; dur: number }[],
  peakAmp: number,
): void {
  const c = ensureCtx();
  const tBase = c.currentTime;
  for (const s of steps) {
    const t0 = tBase + s.t;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = s.freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peakAmp), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + s.dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + s.dur + 0.02);
  }
}
