import { describe, expect, it, vi } from "vitest";
import { BITE_WINDOW_MS, CAST_MS, COOLDOWN_MS, FishingSystem, WAIT_MAX_MS, WAIT_MIN_MS } from "../src/game/systems/FishingSystem";

describe("Fishing session flow", () => {
  it("creates wait window between 5-7 seconds after cast", () => {
    const sys = new FishingSystem();
    const attempt = { waterId: "lake" as const, zoneId: "general" as const, castPoint: { x: 100, y: 150 } };

    const spy = vi.spyOn(Math, "random").mockReturnValue(0.4);
    const session = sys.startSession(attempt, 1000);

    expect(session.castEndsAt).toBe(1000 + CAST_MS);
    expect(session.waitUntil).toBeGreaterThanOrEqual(1000 + CAST_MS + WAIT_MIN_MS);
    expect(session.waitUntil).toBeLessThanOrEqual(1000 + CAST_MS + WAIT_MAX_MS);
    spy.mockRestore();
  });

  it("requires second input during bite window to hook", () => {
    const sys = new FishingSystem();
    const attempt = { waterId: "lake" as const, zoneId: "general" as const, castPoint: { x: 100, y: 150 } };

    let session = sys.startSession(attempt, 1000);
    session = sys.updateSession(session, session.castEndsAt).session;
    const biteUpdate = sys.updateSession(session, session.waitUntil);
    session = biteUpdate.session;

    expect(biteUpdate.event).toBe("bite_started");
    expect(session.phase).toBe("bite_window");

    const hook = sys.tryHook(session, session.biteUntil - 1);
    expect(hook.accepted).toBe(true);
    expect(hook.session.phase).toBe("resolve");
  });

  it("times out bite window and enters cooldown", () => {
    const sys = new FishingSystem();
    const attempt = { waterId: "lake" as const, zoneId: "general" as const, castPoint: { x: 100, y: 150 } };

    let session = sys.startSession(attempt, 1000);
    session = sys.updateSession(session, session.castEndsAt).session;
    session = sys.updateSession(session, session.waitUntil).session;

    const timeoutUpdate = sys.updateSession(session, session.biteUntil + 1);
    expect(timeoutUpdate.event).toBe("bite_missed");
    expect(timeoutUpdate.session.phase).toBe("cooldown");

    const readyUpdate = sys.updateSession(timeoutUpdate.session, timeoutUpdate.session.cooldownUntil + COOLDOWN_MS + 1);
    expect(readyUpdate.event).toBe("ready");
    expect(readyUpdate.session.phase).toBe("idle");
    expect(session.biteUntil - session.waitUntil).toBeCloseTo(BITE_WINDOW_MS, 4);
  });
});
