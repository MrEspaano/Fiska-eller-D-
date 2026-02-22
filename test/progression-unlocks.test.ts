import { describe, expect, it } from "vitest";
import {
  START_UNLOCKED_WATERS,
  createDefaultProgressionState,
  createDefaultUnlockState
} from "../src/game/data/progression";
import { ProgressionSystem } from "../src/game/systems/ProgressionSystem";

describe("Progression unlock rules", () => {
  it("starts with base waters unlocked", () => {
    const unlocks = createDefaultUnlockState();
    for (const waterId of START_UNLOCKED_WATERS) {
      expect(unlocks.unlockedWaters).toContain(waterId);
    }
  });

  it("unlocks waters when required levels are reached", () => {
    const system = new ProgressionSystem();
    const progression = { ...createDefaultProgressionState(), level: 12, xp: 0, xpToNext: 300 };
    const unlocks = createDefaultUnlockState();

    const result = system.applyCatchXp({
      success: true,
      pointsAwarded: 80,
      wasFirstCatch: false,
      species: undefined,
      progression,
      unlocks
    });

    expect(result.unlocks.unlockedWaters).toContain("skogstjarn");
    expect(result.unlocks.unlockedWaters).toContain("klippsjon");
    expect(result.unlocks.unlockedWaters).toContain("myrkanal");
  });

  it("does not duplicate unlock entries", () => {
    const system = new ProgressionSystem();
    const start = {
      unlockedWaters: ["lake", "river", "skogstjarn", "klippsjon", "myrkanal"] as const
    };
    const result = system.applyCatchXp({
      success: true,
      pointsAwarded: 120,
      wasFirstCatch: false,
      species: undefined,
      progression: { level: 12, xp: 0, xpToNext: 300 },
      unlocks: {
        unlockedWaters: [...start.unlockedWaters]
      }
    });

    const unique = new Set(result.unlocks.unlockedWaters);
    expect(unique.size).toBe(result.unlocks.unlockedWaters.length);
    expect(result.newlyUnlocked.length).toBe(0);
  });
});
