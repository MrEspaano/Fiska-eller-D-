import { describe, expect, it } from "vitest";
import { CABIN_COLLISION_ZONES, CABIN_INTERACTION_ZONES, isPointInRect } from "../src/game/data/layout";

describe("Cabin interior zones", () => {
  it("detects freezer, stove and exit interaction zones", () => {
    const freezerPoint = {
      x: CABIN_INTERACTION_ZONES.freezer.x + CABIN_INTERACTION_ZONES.freezer.width / 2,
      y: CABIN_INTERACTION_ZONES.freezer.y + CABIN_INTERACTION_ZONES.freezer.height / 2
    };
    expect(isPointInRect(freezerPoint, CABIN_INTERACTION_ZONES.freezer)).toBe(true);

    const stovePoint = {
      x: CABIN_INTERACTION_ZONES.stove.x + CABIN_INTERACTION_ZONES.stove.width / 2,
      y: CABIN_INTERACTION_ZONES.stove.y + CABIN_INTERACTION_ZONES.stove.height / 2
    };
    expect(isPointInRect(stovePoint, CABIN_INTERACTION_ZONES.stove)).toBe(true);

    const exitPoint = {
      x: CABIN_INTERACTION_ZONES.exit.x + CABIN_INTERACTION_ZONES.exit.width / 2,
      y: CABIN_INTERACTION_ZONES.exit.y + CABIN_INTERACTION_ZONES.exit.height / 2
    };
    expect(isPointInRect(exitPoint, CABIN_INTERACTION_ZONES.exit)).toBe(true);
  });

  it("keeps collision zones separate from interaction zones", () => {
    expect(CABIN_COLLISION_ZONES.furnitureBlocks.length).toBeGreaterThan(0);
    const blocked = CABIN_COLLISION_ZONES.furnitureBlocks[0];
    const blockedPoint = {
      x: blocked.x + blocked.width / 2,
      y: blocked.y + blocked.height / 2
    };

    expect(isPointInRect(blockedPoint, blocked)).toBe(true);
    expect(isPointInRect(blockedPoint, CABIN_INTERACTION_ZONES.exit)).toBe(false);
  });
});
