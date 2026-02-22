import { getSpeciesById } from "../data/fish";
import type { FreezerState, InventoryState } from "../types";

interface FreezerPanelHandlers {
  onDepositAll: () => void;
  onCookFresh: (speciesId: string) => void;
  onCookFrozen: (speciesId: string) => void;
  onClose: () => void;
}

export class FreezerPanel {
  private readonly el: HTMLDivElement;
  private open = false;

  constructor(root: HTMLElement, private readonly handlers: FreezerPanelHandlers) {
    root.querySelectorAll(".freezer-panel").forEach((el) => el.remove());
    this.el = document.createElement("div");
    this.el.className = "freezer-panel";
    root.appendChild(this.el);
  }

  isOpen(): boolean {
    return this.open;
  }

  show(inventory: InventoryState, freezer: FreezerState): void {
    this.open = true;
    this.el.classList.add("show");
    this.render(inventory, freezer);
  }

  hide(): void {
    this.open = false;
    this.el.classList.remove("show");
  }

  render(inventory: InventoryState, freezer: FreezerState): void {
    const freshRows = Object.entries(inventory.carriedBySpecies)
      .map(([id, count]) => this.row(id, count, "fresh"))
      .join("");

    const freezerRows = Object.entries(freezer.bySpecies)
      .map(([id, count]) => this.row(id, count, "freezer"))
      .join("");

    this.el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>Frys & Matlagning</strong>
        <button data-close>Stäng</button>
      </div>
      <div style="margin:8px 0;display:flex;gap:8px">
        <button data-deposit>Lägg allt i frysen</button>
      </div>
      <div><strong>Färsk fisk</strong></div>
      ${freshRows || "<div>Ingen färsk fisk.</div>"}
      <div style="margin-top:10px"><strong>Fryst fisk</strong></div>
      ${freezerRows || "<div>Frysen är tom.</div>"}
    `;

    this.el.querySelector("[data-close]")?.addEventListener("click", () => this.handlers.onClose());
    this.el.querySelector("[data-deposit]")?.addEventListener("click", () => this.handlers.onDepositAll());
    this.el.querySelectorAll<HTMLButtonElement>("[data-cook-source]").forEach((btn) => {
      const source = btn.dataset.cookSource;
      const speciesId = btn.dataset.speciesId;
      if (!source || !speciesId) {
        return;
      }
      btn.addEventListener("click", () => {
        if (source === "fresh") {
          this.handlers.onCookFresh(speciesId);
          return;
        }
        this.handlers.onCookFrozen(speciesId);
      });
    });
  }

  private row(speciesId: string, count: number, source: "fresh" | "freezer"): string {
    const name = getSpeciesById(speciesId)?.nameSv ?? speciesId;
    const actionLabel = source === "fresh" ? "Stek färsk" : "Stek fryst";

    return `<div class=\"freezer-row\">
      <span>${name} (${count})</span>
      <button data-cook-source=\"${source}\" data-species-id=\"${speciesId}\">${actionLabel}</button>
      <span></span>
    </div>`;
  }
}
