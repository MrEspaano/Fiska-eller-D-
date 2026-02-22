import { describe, expect, it } from "vitest";
import { ShadowFishSystem } from "../src/game/systems/ShadowFishSystem";

describe("Shadow fish shape metadata", () => {
  it("assigns fish shape and heading values", () => {
    const sys = new ShadowFishSystem();
    sys.initialize(1000);

    for (const shadow of sys.getAll()) {
      expect(["slim", "normal", "wide"]).toContain(shadow.shape);
      expect(Number.isFinite(shadow.heading)).toBe(true);
      expect(Number.isFinite(shadow.wobblePhase)).toBe(true);
      expect(shadow.lengthPx).toBeGreaterThan(0);
    }
  });
});
