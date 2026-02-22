import { getSpeciesById } from "../data/fish";
import type { BuffState, FreezerState, InventoryState } from "../types";
import { BuffSystem } from "./BuffSystem";

export type CookSource = "fresh" | "freezer";

export interface CookResult {
  ok: boolean;
  message: string;
  inventory: InventoryState;
  freezer: FreezerState;
  buffState: BuffState;
}

export class CookingSystem {
  private readonly buff = new BuffSystem();

  cook(speciesId: string, source: CookSource, inventory: InventoryState, freezer: FreezerState, buffState: BuffState, now: number): CookResult {
    if (source === "fresh") {
      const amount = inventory.carriedBySpecies[speciesId] ?? 0;
      if (amount <= 0) {
        return { ok: false, message: "Du har ingen färsk fisk av den arten.", inventory, freezer, buffState };
      }

      const nextInv = {
        carriedCount: inventory.carriedCount - 1,
        carriedBySpecies: { ...inventory.carriedBySpecies, [speciesId]: amount - 1 }
      };
      if (nextInv.carriedBySpecies[speciesId] <= 0) {
        delete nextInv.carriedBySpecies[speciesId];
      }

      const nextBuff = this.buff.consumeMeal(buffState, now);
      return {
        ok: true,
        message: `${getSpeciesById(speciesId)?.nameSv ?? "Fisken"} stektes och åts. Buff x${nextBuff.stacks}.`,
        inventory: nextInv,
        freezer,
        buffState: nextBuff
      };
    }

    const frozen = freezer.bySpecies[speciesId] ?? 0;
    if (frozen <= 0) {
      return { ok: false, message: "Ingen sådan fisk i frysen.", inventory, freezer, buffState };
    }

    const nextFreezer = { bySpecies: { ...freezer.bySpecies, [speciesId]: frozen - 1 } };
    if (nextFreezer.bySpecies[speciesId] <= 0) {
      delete nextFreezer.bySpecies[speciesId];
    }

    const nextBuff = this.buff.consumeMeal(buffState, now);
    return {
      ok: true,
      message: `${getSpeciesById(speciesId)?.nameSv ?? "Fisken"} från frysen stektes. Buff x${nextBuff.stacks}.`,
      inventory,
      freezer: nextFreezer,
      buffState: nextBuff
    };
  }
}
