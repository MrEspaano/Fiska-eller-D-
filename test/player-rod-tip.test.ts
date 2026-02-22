import { describe, expect, it } from "vitest";
import { computeRodTipWorldPoint } from "../src/game/systems/PlayerSpriteSystem";

describe("computeRodTipWorldPoint", () => {
  it("returns a point in front of the rod when visible", () => {
    const p = computeRodTipWorldPoint({
      containerX: 100,
      containerY: 200,
      containerScaleX: 1,
      rodX: 22,
      rodY: -5,
      rodWidth: 26,
      rodRotation: 0,
      rodVisible: true,
      fallbackX: 20,
      fallbackY: 0
    });

    expect(p.x).toBe(135);
    expect(p.y).toBe(195);
  });

  it("changes with rod rotation", () => {
    const p0 = computeRodTipWorldPoint({
      containerX: 300,
      containerY: 300,
      containerScaleX: 1,
      rodX: 22,
      rodY: -5,
      rodWidth: 26,
      rodRotation: 0,
      rodVisible: true,
      fallbackX: 20,
      fallbackY: 0
    });
    const p1 = computeRodTipWorldPoint({
      containerX: 300,
      containerY: 300,
      containerScaleX: 1,
      rodX: 22,
      rodY: -5,
      rodWidth: 26,
      rodRotation: Math.PI / 4,
      rodVisible: true,
      fallbackX: 20,
      fallbackY: 0
    });

    expect(p1.x !== p0.x || p1.y !== p0.y).toBe(true);
  });

  it("respects left-facing scaleX and fallback when rod is hidden", () => {
    const p = computeRodTipWorldPoint({
      containerX: 400,
      containerY: 120,
      containerScaleX: -1,
      rodX: 22,
      rodY: -5,
      rodWidth: 26,
      rodRotation: 0.3,
      rodVisible: false,
      fallbackX: 24,
      fallbackY: 3
    });

    expect(p.x).toBe(376);
    expect(p.y).toBe(123);
  });
});
