import { describe, expect, it } from "vitest";
import { DOCKS } from "../src/game/data/layout";
import { isPointInAnyWater } from "../src/game/data/waters";

describe("Dock layout", () => {
  it("has at least one dock for lake and river", () => {
    const waters = new Set(DOCKS.map((d) => d.waterId));
    expect(waters.has("lake")).toBe(true);
    expect(waters.has("river")).toBe(true);
  });

  it("spawns boat in water and boarding point on land", () => {
    for (const dock of DOCKS) {
      expect(isPointInAnyWater(dock.boatSpawn)).toBe(true);
      expect(isPointInAnyWater(dock.boardPoint)).toBe(false);
    }
  });
});
