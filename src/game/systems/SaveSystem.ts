import type { SaveState } from "../types";
import { FISH_SPECIES } from "../data/fish";

const SAVE_KEY = "fiske2d_save_v1";

function defaultSpeciesLog(): SaveState["speciesLog"] {
  const log: SaveState["speciesLog"] = {};
  for (const fish of FISH_SPECIES) {
    log[fish.id] = { discovered: false, maxPoints: 0, count: 0 };
  }
  return log;
}

export function createDefaultSaveState(): SaveState {
  return {
    score: 0,
    speciesLog: defaultSpeciesLog(),
    freezer: { bySpecies: {} },
    inventory: { carriedCount: 0, carriedBySpecies: {} },
    settings: { soundOn: true, musicVolume: 70, sfxVolume: 80 },
    buffState: { stacks: 0, expiresAt: 0 }
  };
}

export class SaveSystem {
  load(): SaveState {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return createDefaultSaveState();
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SaveState>;
      const defaults = createDefaultSaveState();
      return {
        ...defaults,
        ...parsed,
        freezer: { ...defaults.freezer, ...parsed.freezer },
        inventory: { ...defaults.inventory, ...parsed.inventory },
        settings: { ...defaults.settings, ...parsed.settings },
        buffState: { ...defaults.buffState, ...parsed.buffState },
        speciesLog: { ...defaults.speciesLog, ...parsed.speciesLog }
      };
    } catch {
      return createDefaultSaveState();
    }
  }

  save(state: SaveState): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }
}
