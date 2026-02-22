import { describe, expect, it } from "vitest";
import { BuffSystem } from "../src/game/systems/BuffSystem";

describe("BuffSystem", () => {
  it("stacks up to 3 and expires correctly", () => {
    const buff = new BuffSystem();
    const now = 1000;

    let state = { stacks: 0, expiresAt: 0 };
    state = buff.consumeMeal(state, now);
    state = buff.consumeMeal(state, now + 1000);
    state = buff.consumeMeal(state, now + 2000);
    state = buff.consumeMeal(state, now + 3000);

    expect(state.stacks).toBe(3);
    expect(buff.getCatchBonus(state, now + 3500)).toBeCloseTo(0.3);
    expect(buff.getActiveStacks(state, state.expiresAt + 1)).toBe(0);
  });
});
