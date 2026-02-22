import { describe, expect, it } from "vitest";
import { CastZoneSystem } from "../src/game/systems/CastZoneSystem";
import { isPointInAnyWater } from "../src/game/data/waters";

describe("Cast zone aiming", () => {
  it("clamps pointer aim into active water", () => {
    const sys = new CastZoneSystem();
    const player = { x: 11 * 32, y: 14 * 32 };
    const pointer = { x: 2 * 32, y: 2 * 32 };

    const zone = sys.compute(player, pointer);
    expect(zone.visible).toBe(true);
    expect(zone.isAiming).toBe(true);
    expect(zone.aimCenter).not.toBeNull();
    if (zone.aimCenter) {
      expect(isPointInAnyWater(zone.aimCenter)).toBe(true);
    }
  });

  it("aim center can differ from auto center when pointing deeper", () => {
    const sys = new CastZoneSystem();
    const player = { x: 10 * 32, y: 15 * 32 };
    const pointer = { x: 20 * 32, y: 20 * 32 };

    const zone = sys.compute(player, pointer);
    expect(zone.visible).toBe(true);
    expect(zone.autoCenter).toBeDefined();
    expect(zone.aimCenter).not.toBeNull();

    if (zone.autoCenter && zone.aimCenter) {
      const same = Math.abs(zone.autoCenter.x - zone.aimCenter.x) < 1 && Math.abs(zone.autoCenter.y - zone.aimCenter.y) < 1;
      expect(same).toBe(false);
    }
  });
});
