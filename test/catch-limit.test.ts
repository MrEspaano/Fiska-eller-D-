import { describe, expect, it } from "vitest";
import { CatchLimitSystem } from "../src/game/systems/CatchLimitSystem";

describe("CatchLimitSystem", () => {
  it("blocks catches at 15 fish", () => {
    const sys = new CatchLimitSystem();
    expect(sys.canCatch({ carriedCount: 14, carriedBySpecies: {} })).toBe(true);
    expect(sys.canCatch({ carriedCount: 15, carriedBySpecies: {} })).toBe(false);
  });
});
