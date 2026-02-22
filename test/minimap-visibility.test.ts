import { describe, expect, it } from "vitest";
import { shouldShowMinimap } from "../src/game/ui/minimapRender";

describe("Minimap visibility rules", () => {
  it("is visible in world scene when menu is closed", () => {
    expect(shouldShowMinimap("world", false)).toBe(true);
  });

  it("is hidden in world scene when menu is open", () => {
    expect(shouldShowMinimap("world", true)).toBe(false);
  });

  it("is hidden in cabin scene", () => {
    expect(shouldShowMinimap("cabin", false)).toBe(false);
    expect(shouldShowMinimap("cabin", true)).toBe(false);
  });
});
