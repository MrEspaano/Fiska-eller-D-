import type { BuffState } from "../types";

const MAX_STACKS = 3;
const DURATION_PER_STACK_MS = 3 * 60 * 1000;

export class BuffSystem {
  getActiveStacks(state: BuffState, now: number): number {
    if (now > state.expiresAt) {
      return 0;
    }
    return state.stacks;
  }

  getCatchBonus(state: BuffState, now: number): number {
    return this.getActiveStacks(state, now) * 0.1;
  }

  consumeMeal(state: BuffState, now: number): BuffState {
    const active = this.getActiveStacks(state, now);
    const stacks = Math.min(MAX_STACKS, active + 1);
    const base = now > state.expiresAt ? now : state.expiresAt;
    return {
      stacks,
      expiresAt: base + DURATION_PER_STACK_MS
    };
  }

  normalize(state: BuffState, now: number): BuffState {
    if (now > state.expiresAt) {
      return { stacks: 0, expiresAt: 0 };
    }
    return state;
  }
}
