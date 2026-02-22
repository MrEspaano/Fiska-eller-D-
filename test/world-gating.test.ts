import { describe, expect, it } from "vitest";
import { UNLOCK_GATES } from "../src/game/data/layout";
import { getBlockedGateForPoint } from "../src/game/systems/WorldGatingSystem";

describe("World gating", () => {
  it("blocks movement into locked areas", () => {
    const gate = UNLOCK_GATES[0];
    const inside = {
      x: gate.lockedArea.x + gate.lockedArea.width / 2,
      y: gate.lockedArea.y + gate.lockedArea.height / 2
    };

    const blocked = getBlockedGateForPoint(inside, UNLOCK_GATES, ["lake", "river"]);
    expect(blocked?.waterId).toBe(gate.waterId);
  });

  it("allows movement after area unlock", () => {
    const gate = UNLOCK_GATES[0];
    const inside = {
      x: gate.lockedArea.x + gate.lockedArea.width / 2,
      y: gate.lockedArea.y + gate.lockedArea.height / 2
    };

    const blocked = getBlockedGateForPoint(inside, UNLOCK_GATES, ["lake", "river", gate.waterId]);
    expect(blocked).toBeNull();
  });
});
