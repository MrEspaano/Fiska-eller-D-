import { describe, expect, it, vi } from "vitest";
import { FishingSystem } from "../src/game/systems/FishingSystem";

describe("FishingSystem", () => {
  it("applies shadow bonus to improve chance", () => {
    const sys = new FishingSystem();
    const attempt = { waterId: "lake" as const, zoneId: "general" as const, castPoint: { x: 0, y: 0 } };

    const spy = vi.spyOn(Math, "random");
    spy.mockReturnValueOnce(0.9);
    const withoutShadow = sys.rollCatch(attempt, { now: Date.now(), buffState: { stacks: 0, expiresAt: 0 } });

    spy.mockReturnValueOnce(0.9).mockReturnValueOnce(0.1);
    const withShadow = sys.rollCatch(attempt, {
      now: Date.now(),
      buffState: { stacks: 0, expiresAt: 0 },
      nearShadowId: "s1",
      nearShadowSpeciesId: "abborre"
    });

    expect(withoutShadow.success).toBe(false);
    expect(withShadow.success).toBe(true);
    spy.mockRestore();
  });

  it("cannot resolve immediately after first cast action", () => {
    const sys = new FishingSystem();
    const attempt = { waterId: "lake" as const, zoneId: "general" as const, castPoint: { x: 120, y: 120 } };

    const session = sys.startSession(attempt, 1000);
    const result = sys.resolveSession(session, {
      now: 1100,
      buffState: { stacks: 0, expiresAt: 0 }
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Kroken");
  });
});
