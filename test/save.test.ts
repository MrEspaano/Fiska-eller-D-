import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaveSystem, createDefaultSaveState } from "../src/game/systems/SaveSystem";

describe("SaveSystem", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      }
    });
  });

  it("loads defaults when no save exists", () => {
    const sys = new SaveSystem();
    const state = sys.load();
    expect(state.score).toBe(0);
    expect(state.inventory.carriedCount).toBe(0);
  });

  it("saves and reloads state", () => {
    const sys = new SaveSystem();
    const state = createDefaultSaveState();
    state.score = 123;
    state.inventory.carriedCount = 4;
    sys.save(state);

    const loaded = sys.load();
    expect(loaded.score).toBe(123);
    expect(loaded.inventory.carriedCount).toBe(4);
  });
});
