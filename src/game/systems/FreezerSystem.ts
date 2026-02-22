import type { FreezerState, InventoryState } from "../types";

export class FreezerSystem {
  depositAll(inventory: InventoryState, freezer: FreezerState): { inventory: InventoryState; freezer: FreezerState; moved: number } {
    if (inventory.carriedCount === 0) {
      return { inventory, freezer, moved: 0 };
    }

    const nextFreezer: FreezerState = { bySpecies: { ...freezer.bySpecies } };
    for (const [speciesId, amount] of Object.entries(inventory.carriedBySpecies)) {
      nextFreezer.bySpecies[speciesId] = (nextFreezer.bySpecies[speciesId] ?? 0) + amount;
    }

    return {
      inventory: { carriedCount: 0, carriedBySpecies: {} },
      freezer: nextFreezer,
      moved: inventory.carriedCount
    };
  }

  removeOneFromFreezer(speciesId: string, freezer: FreezerState): FreezerState | null {
    const current = freezer.bySpecies[speciesId] ?? 0;
    if (current <= 0) {
      return null;
    }
    const next = { ...freezer.bySpecies, [speciesId]: current - 1 };
    if (next[speciesId] === 0) {
      delete next[speciesId];
    }
    return { bySpecies: next };
  }
}
