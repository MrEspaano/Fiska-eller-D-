import { describe, expect, it } from "vitest";
import { getRoundedLineOrigin } from "../src/game/systems/FishingLineSystem";

describe("Fishing line origin", () => {
  it("rounds rod tip for pixel-perfect rendering", () => {
    const origin = getRoundedLineOrigin({ x: 412.7, y: 188.2 });
    expect(origin).toEqual({ x: 413, y: 188 });
  });

  it("keeps rod-tip origin unchanged when already integer", () => {
    const origin = getRoundedLineOrigin({ x: 512, y: 256 });
    expect(origin).toEqual({ x: 512, y: 256 });
  });

  it("works with boat-like rod tip values", () => {
    const origin = getRoundedLineOrigin({ x: 640.49, y: 301.51 });
    expect(origin).toEqual({ x: 640, y: 302 });
  });
});
