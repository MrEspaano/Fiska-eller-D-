import { describe, expect, it } from "vitest";
import {
  shouldHandleWorldAction,
  shouldOpenCabinPauseMenu,
  shouldOpenWorldPauseMenu
} from "../src/game/ui/menuGuards";

describe("Menu integration gates", () => {
  it("blocks gameplay action input when world menu is open", () => {
    expect(shouldHandleWorldAction(true, false, false, true)).toBe(false);
    expect(shouldHandleWorldAction(false, true, false, true)).toBe(false);
    expect(shouldHandleWorldAction(false, false, true, true)).toBe(false);
  });

  it("allows gameplay action after resume", () => {
    expect(shouldHandleWorldAction(false, false, false, true)).toBe(true);
  });

  it("toggles pause menu only when no blocking overlays are open", () => {
    expect(shouldOpenWorldPauseMenu(false, false, false, true)).toBe(true);
    expect(shouldOpenWorldPauseMenu(true, false, false, true)).toBe(false);
    expect(shouldOpenWorldPauseMenu(false, true, false, true)).toBe(false);
    expect(shouldOpenWorldPauseMenu(false, false, true, true)).toBe(false);
    expect(shouldOpenCabinPauseMenu(false, false, true)).toBe(true);
    expect(shouldOpenCabinPauseMenu(true, false, true)).toBe(false);
    expect(shouldOpenCabinPauseMenu(false, true, true)).toBe(false);
  });
});
