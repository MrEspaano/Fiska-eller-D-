import { describe, expect, it } from "vitest";
import { distance, isPointInAnyWater } from "../src/game/data/waters";
import { CastZoneSystem } from "../src/game/systems/CastZoneSystem";

describe("Boat cast zone", () => {
  it("is visible while on boat away from shoreline", () => {
    const sys = new CastZoneSystem();
    const boatPoint = { x: 23 * 32, y: 20 * 32 };
    const zone = sys.computeForBoat(boatPoint, "lake");

    expect(zone.visible).toBe(true);
    expect(isPointInAnyWater(zone.center)).toBe(true);
  });

  it("limits aimed cast distance from boat", () => {
    const sys = new CastZoneSystem();
    const boatPoint = { x: 23 * 32, y: 20 * 32 };
    const farAim = { x: 59 * 32, y: 0 };

    const zone = sys.computeForBoat(boatPoint, "lake", farAim);
    expect(zone.visible).toBe(true);
    expect(isPointInAnyWater(zone.center)).toBe(true);
    expect(distance(boatPoint, zone.center)).toBeLessThanOrEqual(210.0001);
  });
});
