import { describe, expect, it } from "vitest";
import { HOUSE_LAYOUT, WORLD_NPCS } from "../src/game/data/layout";
import { isPointInAnyWater, WATER_BODIES } from "../src/game/data/waters";
import { SpawnValidationSystem } from "../src/game/systems/SpawnValidationSystem";

describe("SpawnValidationSystem", () => {
  it("keeps configured NPC placements on land", () => {
    const sys = new SpawnValidationSystem();
    for (const npc of WORLD_NPCS) {
      const validated = sys.validateNpcPlacement(npc, [HOUSE_LAYOUT.bounds]);
      expect(isPointInAnyWater({ x: validated.x, y: validated.y })).toBe(false);
    }
  });

  it("moves an NPC out of water if placed in a water polygon", () => {
    const sys = new SpawnValidationSystem();
    const waterPoint = WATER_BODIES[0].polygon[0];
    const npc = { id: "bad", x: waterPoint.x, y: waterPoint.y, facing: "down" as const, variant: 0 };

    const validated = sys.validateNpcPlacement(npc, [HOUSE_LAYOUT.bounds]);
    expect(isPointInAnyWater({ x: validated.x, y: validated.y })).toBe(false);
  });
});
