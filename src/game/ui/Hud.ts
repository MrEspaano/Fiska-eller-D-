import type { BuffState, SaveState } from "../types";

const PLAYER_NAME = "Albanus";

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

    this.el.innerHTML = `
      <div>Spelare: ${PLAYER_NAME}</div>
      <div>Poäng: ${state.score}</div>
      <div>Bär: ${state.inventory.carriedCount}/15</div>
      <div>Arter: ${topSpecies}/12</div>
      <div>Buff: x${buff.stacks}</div>
      <div style="margin-top:6px;color:#d2b85c">${message}</div>
      <div style="margin-top:8px;opacity:.85">SPACE/E: Interagera/Fiska</div>
    `;
  }
}
