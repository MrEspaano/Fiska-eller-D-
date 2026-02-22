import { describe, expect, it } from "vitest";
import { getWaterAtPoint, getZoneAtPoint, WATER_BODIES } from "../src/game/data/waters";

describe("water zoning", () => {
  it("classifies a deep-center point in lake", () => {
    const lake = WATER_BODIES.find((w) => w.id === "lake");
    expect(lake).toBeTruthy();
    if (!lake) return;

    const p = lake.zoneDefs.find((z) => z.id === "deep_center")?.polygon[0];
    expect(p).toBeTruthy();
    if (!p) return;

    expect(getWaterAtPoint(p)?.id).toBe("lake");
    expect(getZoneAtPoint(lake, p)).toBe("deep_center");
  });

  it("returns null outside of water", () => {
    expect(getWaterAtPoint({ x: 20, y: 20 })).toBeNull();
  });
});
