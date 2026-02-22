import type { InventoryState } from "../types";

export const MAX_CARRIED_FISH = 15;

export class CatchLimitSystem {
  canCatch(inventory: InventoryState): boolean {
    return inventory.carriedCount < MAX_CARRIED_FISH;
  }

  remaining(inventory: InventoryState): number {
    return Math.max(0, MAX_CARRIED_FISH - inventory.carriedCount);
  }
}
