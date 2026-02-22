import { describe, expect, it } from "vitest";
import { getSpeciesById } from "../src/game/data/fish";
import { createDefaultProgressionState, createDefaultUnlockState } from "../src/game/data/progression";
import { ProgressionSystem } from "../src/game/systems/ProgressionSystem";

describe("ProgressionSystem", () => {
  it("adds base XP for successful catches", () => {
    const system = new ProgressionSystem();
    const result = system.applyCatchXp({
      success: true,
      pointsAwarded: 100,
      wasFirstCatch: false,
      species: getSpeciesById("abborre"),
      progression: createDefaultProgressionState(),
      unlocks: createDefaultUnlockState()
    });

    expect(result.reward.base).toBeGreaterThan(0);
    expect(result.reward.firstCatchBonus).toBe(0);
    expect(result.reward.rareBonus).toBe(0);
    expect(result.progression.level).toBe(1);
    expect(result.progression.xp).toBe(result.reward.total);
  });

  it("awards first-catch bonus only on first catch", () => {
    const system = new ProgressionSystem();
    const state = createDefaultProgressionState();
    const unlocks = createDefaultUnlockState();

    const first = system.applyCatchXp({
      success: true,
      pointsAwarded: 100,
      wasFirstCatch: true,
      species: getSpeciesById("abborre"),
      progression: state,
      unlocks
    });

    const second = system.applyCatchXp({
      success: true,
      pointsAwarded: 100,
      wasFirstCatch: false,
      species: getSpeciesById("abborre"),
      progression: first.progression,
      unlocks: first.unlocks
    });

    expect(first.reward.firstCatchBonus).toBeGreaterThan(0);
    expect(second.reward.firstCatchBonus).toBe(0);
  });

  it("awards rare bonus for rare species", () => {
    const system = new ProgressionSystem();
    const result = system.applyCatchXp({
      success: true,
      pointsAwarded: 220,
      wasFirstCatch: false,
      species: getSpeciesById("lax"),
      progression: createDefaultProgressionState(),
      unlocks: createDefaultUnlockState()
    });

    expect(result.reward.rareBonus).toBeGreaterThan(0);
    expect(result.reward.total).toBe(result.reward.base + result.reward.rareBonus);
  });

  it("awards no XP on failed catch", () => {
    const system = new ProgressionSystem();
    const progression = createDefaultProgressionState();
    const unlocks = createDefaultUnlockState();
    const result = system.applyCatchXp({
      success: false,
      pointsAwarded: 0,
      wasFirstCatch: false,
      species: undefined,
      progression,
      unlocks
    });

    expect(result.reward.total).toBe(0);
    expect(result.progression).toEqual(progression);
    expect(result.unlocks.unlockedWaters).toEqual(unlocks.unlockedWaters);
  });

  it("handles multiple level-ups in a single large reward", () => {
    const system = new ProgressionSystem();
    const result = system.applyCatchXp({
      success: true,
      pointsAwarded: 2200,
      wasFirstCatch: true,
      species: getSpeciesById("lax"),
      progression: createDefaultProgressionState(),
      unlocks: createDefaultUnlockState()
    });

    expect(result.levelUps).toBeGreaterThan(1);
    expect(result.progression.level).toBeGreaterThan(2);
  });
});
