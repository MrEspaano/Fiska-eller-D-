import { describe, expect, it } from "vitest";
import { createDefaultSaveState } from "../src/game/systems/SaveSystem";
import { buildHudProgressInfo } from "../src/game/ui/Hud";

describe("HUD progression info", () => {
  it("shows level and xp ratio", () => {
    const state = createDefaultSaveState();
    state.progression.level = 3;
    state.progression.xp = 45;
    state.progression.xpToNext = 110;

    const info = buildHudProgressInfo(state);
    expect(info.levelText).toBe("Nivå: 3");
    expect(info.xpText).toBe("XP: 45/110");
    expect(info.xpPercent).toBe(41);
  });

  it("shows next unlock while there are locked waters", () => {
    const state = createDefaultSaveState();
    const info = buildHudProgressInfo(state);
    expect(info.nextUnlockText).toContain("Nästa upplåsning:");
    expect(info.nextUnlockText).toContain("nivå");
  });
});
