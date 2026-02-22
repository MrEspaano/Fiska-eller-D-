import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaveSystem } from "../src/game/systems/SaveSystem";

describe("Save progression compatibility", () => {
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

  it("migrates legacy saves with no progression fields", () => {
    localStorage.setItem("fiske2d_save_v1", JSON.stringify({ score: 500 }));

    const loaded = new SaveSystem().load();
    expect(loaded.score).toBe(500);
    expect(loaded.progression.level).toBe(1);
    expect(loaded.progression.xp).toBe(0);
    expect(loaded.unlocks.unlockedWaters).toContain("lake");
    expect(loaded.unlocks.unlockedWaters).toContain("river");
  });

  it("preserves progression when present", () => {
    localStorage.setItem("fiske2d_save_v1", JSON.stringify({
      progression: { level: 7, xp: 20, xpToNext: 215 },
      unlocks: { unlockedWaters: ["lake", "river", "skogstjarn"] }
    }));

    const loaded = new SaveSystem().load();
    expect(loaded.progression.level).toBe(7);
    expect(loaded.progression.xp).toBe(20);
    expect(loaded.unlocks.unlockedWaters).toContain("skogstjarn");
  });
});
