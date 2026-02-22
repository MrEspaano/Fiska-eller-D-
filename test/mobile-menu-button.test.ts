import { describe, expect, it } from "vitest";
import { shouldConsumeMenuToggle } from "../src/game/systems/mobileInput";

describe("Mobile menu button behavior", () => {
  it("menuPressed triggers toggle even without keyboard press", () => {
    expect(shouldConsumeMenuToggle(false, true)).toBe(true);
  });

  it("keyboard escape still triggers toggle", () => {
    expect(shouldConsumeMenuToggle(true, false)).toBe(true);
  });

  it("returns false when no toggle source is active", () => {
    expect(shouldConsumeMenuToggle(false, false)).toBe(false);
  });
});
