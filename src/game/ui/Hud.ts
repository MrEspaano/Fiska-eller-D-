import type { BuffState, SaveState } from "../types";
import { getNextUnlock } from "../data/progression";

const PLAYER_NAME = "Albanus";

export interface HudProgressInfo {
  levelText: string;
  xpText: string;
  xpPercent: number;
  nextUnlockText: string;
}

export function buildHudProgressInfo(state: SaveState): HudProgressInfo {
  const level = state.progression.level;
  const xp = state.progression.xp;
  const xpToNext = state.progression.xpToNext;
  const xpPercent = xpToNext > 0 ? Math.round((xp / xpToNext) * 100) : 100;
  const nextUnlock = getNextUnlock(level, state.unlocks.unlockedWaters);

  return {
    levelText: `Nivå: ${level}`,
    xpText: xpToNext > 0 ? `XP: ${xp}/${xpToNext}` : "XP: MAX",
    xpPercent: Math.max(0, Math.min(100, xpPercent)),
    nextUnlockText: nextUnlock
      ? `Nästa upplåsning: ${nextUnlock.nameSv} (nivå ${nextUnlock.requiredLevel})`
      : "Nästa upplåsning: Alla vatten upplåsta"
  };
}

export class Hud {
  private readonly el: HTMLDivElement;

  constructor(root: HTMLElement) {
    root.querySelectorAll(".hud").forEach((el) => el.remove());
    this.el = document.createElement("div");
    this.el.className = "hud";
    root.appendChild(this.el);
  }

  render(state: SaveState, message: string, buff: BuffState): void {
    const topSpecies = Object.entries(state.speciesLog)
      .filter(([, v]) => v.discovered)
      .length;
    const progress = buildHudProgressInfo(state);

    this.el.innerHTML = `
      <div>Spelare: ${PLAYER_NAME}</div>
      <div>Poäng: ${state.score}</div>
      <div>${progress.levelText}</div>
      <div>${progress.xpText}</div>
      <div class="hud-xp-wrap"><div class="hud-xp-bar" style="width:${progress.xpPercent}%"></div></div>
      <div class="hud-next-unlock">${progress.nextUnlockText}</div>
      <div>Bär: ${state.inventory.carriedCount}/15</div>
      <div>Arter: ${topSpecies}/12</div>
      <div>Buff: x${buff.stacks}</div>
      <div style="margin-top:6px;color:#d2b85c">${message}</div>
      <div style="margin-top:8px;opacity:.85">SPACE/E: Interagera/Fiska</div>
    `;
  }
}
