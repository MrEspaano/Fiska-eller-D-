import { describe, expect, it } from "vitest";
import { CastZoneSystem } from "../src/game/systems/CastZoneSystem";
import { isPointInAnyWater } from "../src/game/data/waters";

describe("CastZoneSystem", () => {
  it("shows cast zone near water and keeps center in water", () => {
    const sys = new CastZoneSystem();
    const nearLake = { x: 11 * 32, y: 14 * 32 };

    const zone = sys.compute(nearLake);
    expect(zone.visible).toBe(true);
    expect(isPointInAnyWater(zone.center)).toBe(true);
  });

  it("moves cast zone as player moves along shoreline", () => {
    const sys = new CastZoneSystem();
    const p1 = { x: 10 * 32, y: 15 * 32 };
    const p2 = { x: 14 * 32, y: 22 * 32 };

    const z1 = sys.compute(p1);
    const z2 = sys.compute(p2);

    expect(z1.visible).toBe(true);
    expect(z2.visible).toBe(true);
    expect(z1.center.x !== z2.center.x || z1.center.y !== z2.center.y).toBe(true);
  });
});
