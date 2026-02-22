import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaveSystem, createDefaultSaveState } from "../src/game/systems/SaveSystem";

describe("Settings save compatibility", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      }
    });
  });

  it("provides default music and sfx volumes", () => {
    const state = createDefaultSaveState();
    expect(state.settings.soundOn).toBe(true);
    expect(state.settings.musicVolume).toBe(70);
    expect(state.settings.sfxVolume).toBe(80);
  });

  it("merges old saves that only had soundOn", () => {
    const legacySave = {
      score: 55,
      settings: { soundOn: false }
    };
    localStorage.setItem("fiske2d_save_v1", JSON.stringify(legacySave));

    const loaded = new SaveSystem().load();
    expect(loaded.score).toBe(55);
    expect(loaded.settings.soundOn).toBe(false);
    expect(loaded.settings.musicVolume).toBe(70);
    expect(loaded.settings.sfxVolume).toBe(80);
  });
});
