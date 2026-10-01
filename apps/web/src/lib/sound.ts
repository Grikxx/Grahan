/**
 * Small synthesized sound set (no audio files):
 *   slide   — a soft wooden tap
 *   eclipse — a temple-bell strike with inharmonic partials
 *   win     — a rising three-note bell phrase
 */

let ctx: AudioContext | null = null;
let enabled = true;
let loaded = false;
const listeners = new Set<() => void>();

const KEY = "grahan:sound";

/** For useSyncExternalStore: whether sound is on, read from storage once. */
export function getSoundEnabled(): boolean {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      enabled = localStorage.getItem(KEY) !== "off";
    } catch {
      enabled = true;
    }
  }
  return enabled;
}

export const getSoundServerSnapshot = () => true;

export function subscribeSound(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  loaded = true;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage can be unavailable; the setting then lasts for this visit */
  }
  listeners.forEach((l) => l());
}

function audio(): AudioContext | null {
  if (!getSoundEnabled() || typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function bell(ac: AudioContext, freq: number, at: number, gain: number, length: number) {
  const partials: [number, number][] = [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]];
  const out = ac.createGain();
  out.gain.setValueAtTime(0, at);
  out.gain.linearRampToValueAtTime(gain, at + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0001, at + length);
  out.connect(ac.destination);
  for (const [ratio, amp] of partials) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = freq * ratio;
    g.gain.value = amp;
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + length);
  }
}

export function playSlide() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(330, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + 0.13);
}

export function playEclipse(count: number) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  bell(ac, 196, t, 0.16, 2.2);
  if (count > 1) bell(ac, 261.6, t + 0.12, 0.1, 1.8);
}

export function playWin() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  [293.7, 370, 440].forEach((f, i) => bell(ac, f, t + i * 0.18, 0.12, 2.4));
}
