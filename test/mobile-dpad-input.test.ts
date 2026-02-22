import { describe, expect, it } from "vitest";
import { computeMoveVectorFromInputs } from "../src/game/systems/mobileInput";

describe("Mobile d-pad input", () => {
  it("holding right yields positive X movement", () => {
    const v = computeMoveVectorFromInputs(0, 0, {
      up: false,
      down: false,
      left: false,
      right: true
    });
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBe(0);
  });

  it("holding up+right yields normalized diagonal vector", () => {
    const v = computeMoveVectorFromInputs(0, 0, {
      up: true,
      down: false,
      left: false,
      right: true
    });
    expect(v.x).toBeCloseTo(Math.SQRT1_2, 4);
    expect(v.y).toBeCloseTo(-Math.SQRT1_2, 4);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 4);
  });

  it("releasing all directions returns zero vector", () => {
    const v = computeMoveVectorFromInputs(0, 0, {
      up: false,
      down: false,
      left: false,
      right: false
    });
    expect(v).toEqual({ x: 0, y: 0 });
  });
});
