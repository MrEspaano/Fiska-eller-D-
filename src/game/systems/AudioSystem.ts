type SfxId = "ui_move" | "ui_confirm" | "ui_back";

export interface AudioSettings {
  soundOn: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value / 5) * 5));
}

export function volumeToGain(value: number): number {
  return clampVolume(value) / 100;
}

export class AudioSystem {
  private soundOn = true;
  private musicVolume = 70;
  private sfxVolume = 80;
  private musicStarted = false;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private context: AudioContext | null = null;

  constructor(initial: AudioSettings) {
    this.applySettings(initial);
  }

  applySettings(settings: AudioSettings): void {
    this.soundOn = settings.soundOn;
    this.musicVolume = clampVolume(settings.musicVolume);
    this.sfxVolume = clampVolume(settings.sfxVolume);
    if (!this.soundOn) {
      this.stopMusicTimer();
    } else if (this.musicStarted) {
      this.startMusicTimer();
    }
  }

  unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
  }

  setEnabled(soundOn: boolean): void {
    this.soundOn = soundOn;
    if (!soundOn) {
      this.stopMusicTimer();
      return;
    }
    if (this.musicStarted) {
      this.startMusicTimer();
    }
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = clampVolume(volume);
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = clampVolume(volume);
  }

  startMusic(): void {
    this.musicStarted = true;
    if (!this.soundOn) {
      return;
    }
    this.startMusicTimer();
  }

  stopMusic(): void {
    this.musicStarted = false;
    this.stopMusicTimer();
  }

  playSfx(id: SfxId): void {
    if (!this.soundOn) {
      return;
    }
    const gain = volumeToGain(this.sfxVolume) * 0.3;
    if (id === "ui_move") {
      this.playTone(480, 0.045, gain, "square");
      return;
    }
    if (id === "ui_back") {
      this.playTone(320, 0.07, gain * 0.95, "triangle");
      return;
    }

    this.playTone(620, 0.05, gain, "square");
    setTimeout(() => {
      this.playTone(760, 0.07, gain * 0.9, "triangle");
    }, 50);
  }

  destroy(): void {
    this.stopMusicTimer();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }

  getSnapshot(): AudioSettings {
    return {
      soundOn: this.soundOn,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume
    };
  }

  private startMusicTimer(): void {
    if (this.musicTimer) {
      return;
    }
    this.musicTimer = setInterval(() => this.playMusicTick(), 260);
  }

  private stopMusicTimer(): void {
    if (!this.musicTimer) {
      return;
    }
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private playMusicTick(): void {
    if (!this.soundOn || this.musicVolume <= 0) {
      return;
    }

    const pattern: Array<number | null> = [220, 262, 247, 196, 220, 294, 262, null];
    const freq = pattern[this.musicStep % pattern.length];
    this.musicStep += 1;
    if (!freq) {
      return;
    }

    const gain = volumeToGain(this.musicVolume) * 0.14;
    this.playTone(freq, 0.2, gain, "triangle");
  }

  private playTone(
    frequency: number,
    durationSec: number,
    gainValue: number,
    type: OscillatorType
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || gainValue <= 0) {
      return;
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.02, durationSec));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + Math.max(0.03, durationSec + 0.02));
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const w = typeof window !== "undefined" ? window : null;
    const Ctx = w?.AudioContext ?? (w as unknown as { webkitAudioContext?: typeof AudioContext })?.webkitAudioContext;
    if (!Ctx) {
      return null;
    }

    this.context = new Ctx();
    return this.context;
  }
}
