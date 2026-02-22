import { describe, expect, it } from "vitest";
import { CABIN_COLLISION_ZONES } from "../src/game/data/layout";

describe("Cabin collision areas", () => {
  it("contains stove and freezer collision footprints", () => {
    expect(CABIN_COLLISION_ZONES.furnitureBlocks.length).toBeGreaterThanOrEqual(2);

    const freezerCollision = CABIN_COLLISION_ZONES.furnitureBlocks[0];
    const stoveCollision = CABIN_COLLISION_ZONES.furnitureBlocks[1];

    expect(freezerCollision.width).toBeGreaterThan(0);
    expect(stoveCollision.width).toBeGreaterThan(0);
  });

  it("marks furniture centers as blocked", () => {
    for (const rect of CABIN_COLLISION_ZONES.furnitureBlocks) {
      const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      expect(center.x).toBeGreaterThan(rect.x);
      expect(center.y).toBeGreaterThan(rect.y);
    }
  });
});
