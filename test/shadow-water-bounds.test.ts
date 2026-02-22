import { describe, expect, it } from "vitest";
import { isPointInAnyWater } from "../src/game/data/waters";
import { ShadowFishSystem } from "../src/game/systems/ShadowFishSystem";

describe("ShadowFishSystem water bounds", () => {
  it("spawns shadows inside water", () => {
    const sys = new ShadowFishSystem();
    sys.initialize(0);

    for (const shadow of sys.getAll()) {
      expect(isPointInAnyWater(shadow.position)).toBe(true);
      for (const wp of shadow.patrolPath) {
        expect(isPointInAnyWater(wp)).toBe(true);
      }
    }
  });

  it("keeps shadows in water after updates", () => {
    const sys = new ShadowFishSystem();
    sys.initialize(0);

    for (let i = 0; i < 40; i += 1) {
      sys.update(120, 1000 + i * 120);
    }

    for (const shadow of sys.getAll()) {
      expect(isPointInAnyWater(shadow.position)).toBe(true);
    }
  });
});
