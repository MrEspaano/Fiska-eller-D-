import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioSystem, clampVolume, volumeToGain } from "../src/game/systems/AudioSystem";

describe("AudioSystem", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps 0..100 volume values to gain", () => {
    expect(clampVolume(-10)).toBe(0);
    expect(clampVolume(72)).toBe(70);
    expect(clampVolume(104)).toBe(100);
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(100)).toBe(1);
    expect(volumeToGain(73)).toBe(0.75);
  });

  it("keeps music and sfx volumes separate", () => {
    const audio = new AudioSystem({ soundOn: true, musicVolume: 70, sfxVolume: 80 });
    audio.setMusicVolume(25);
    expect(audio.getSnapshot()).toEqual({ soundOn: true, musicVolume: 25, sfxVolume: 80 });

    audio.setSfxVolume(45);
    expect(audio.getSnapshot()).toEqual({ soundOn: true, musicVolume: 25, sfxVolume: 45 });
  });

  it("stops scheduled music output when muted", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const audio = new AudioSystem({ soundOn: true, musicVolume: 70, sfxVolume: 80 });

    audio.startMusic();
    expect(setIntervalSpy).toHaveBeenCalled();

    audio.setEnabled(false);
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
