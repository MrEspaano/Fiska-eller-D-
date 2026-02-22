import { isPointInRect } from "../data/layout";
import type { Point, UnlockGateLayout, WaterId } from "../types";

export function getBlockedGateForPoint(
  point: Point,
  gates: UnlockGateLayout[],
  unlockedWaters: WaterId[]
): UnlockGateLayout | null {
  const unlocked = new Set(unlockedWaters);
  for (const gate of gates) {
    if (unlocked.has(gate.waterId)) {
      continue;
    }
    if (isPointInRect(point, gate.lockedArea) || isPointInRect(point, gate.barrier)) {
      return gate;
    }
  }
  return null;
}

export function getLockedGates(gates: UnlockGateLayout[], unlockedWaters: WaterId[]): UnlockGateLayout[] {
  const unlocked = new Set(unlockedWaters);
  return gates.filter((gate) => !unlocked.has(gate.waterId));
}
