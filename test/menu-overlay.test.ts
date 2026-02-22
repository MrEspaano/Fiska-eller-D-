import { describe, expect, it } from "vitest";
import {
  HELP_LINES,
  MAIN_MENU_ITEMS,
  MENU_TITLE,
  getNextMenuIndex,
  resolveEscapeAction
} from "../src/game/ui/MenuOverlay";

describe("Menu overlay configuration", () => {
  it("uses the locked title and menu options", () => {
    expect(MENU_TITLE).toBe("Välkommen - Fiska eller DÖ");
    expect(MAIN_MENU_ITEMS.map((item) => item.label)).toEqual([
      "Starta spelet",
      "Inställningar",
      "Hjälp",
      "Avsluta till meny"
    ]);
  });

  it("cycles keyboard selection up/down", () => {
    expect(getNextMenuIndex(0, "down", MAIN_MENU_ITEMS.length)).toBe(1);
    expect(getNextMenuIndex(MAIN_MENU_ITEMS.length - 1, "down", MAIN_MENU_ITEMS.length)).toBe(0);
    expect(getNextMenuIndex(0, "up", MAIN_MENU_ITEMS.length)).toBe(MAIN_MENU_ITEMS.length - 1);
  });

  it("resolves escape behavior for boot/pause/subpanels", () => {
    expect(resolveEscapeAction("boot", "main")).toBe("none");
    expect(resolveEscapeAction("pause", "main")).toBe("close_menu");
    expect(resolveEscapeAction("pause", "settings")).toBe("back_to_main");
    expect(resolveEscapeAction("boot", "help")).toBe("back_to_main");
  });

  it("contains updated mobile controls help line", () => {
    expect(HELP_LINES).toContain("Mobil: pilknappar + A-knapp + Meny");
  });
});
