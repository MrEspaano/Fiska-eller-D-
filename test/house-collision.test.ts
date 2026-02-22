import { describe, expect, it } from "vitest";
import { HOUSE_LAYOUT, isPointInRect, pointFromTile } from "../src/game/data/layout";

describe("House collision layout", () => {
  it("marks house area as blocked", () => {
    const center = { x: HOUSE_LAYOUT.bounds.x + HOUSE_LAYOUT.bounds.width / 2, y: HOUSE_LAYOUT.bounds.y + HOUSE_LAYOUT.bounds.height / 2 };
    expect(isPointInRect(center, HOUSE_LAYOUT.bounds)).toBe(true);
  });

  it("keeps area outside the house walkable", () => {
    const outside = pointFromTile(1, 1);
    expect(isPointInRect(outside, HOUSE_LAYOUT.bounds)).toBe(false);
  });

  it("requires door trigger for entry", () => {
    const doorFront = {
      x: HOUSE_LAYOUT.doorTrigger.x + HOUSE_LAYOUT.doorTrigger.width / 2,
      y: HOUSE_LAYOUT.doorTrigger.y + HOUSE_LAYOUT.doorTrigger.height / 2
    };
    expect(isPointInRect(doorFront, HOUSE_LAYOUT.doorTrigger)).toBe(true);

    const nearDoorButOff = { x: doorFront.x - HOUSE_LAYOUT.doorTrigger.width, y: doorFront.y };
    expect(isPointInRect(nearDoorButOff, HOUSE_LAYOUT.doorTrigger)).toBe(false);
  });
});
