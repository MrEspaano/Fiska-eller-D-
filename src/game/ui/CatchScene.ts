import { getSpeciesById } from "../data/fish";
import { SPECIES_FACTS } from "../data/speciesFacts";

export class CatchScene {
  private readonly el: HTMLDivElement;

  constructor(root: HTMLElement) {
    root.querySelectorAll(".catch-overlay").forEach((el) => el.remove());
    this.el = document.createElement("div");
    this.el.className = "catch-overlay";
    root.appendChild(this.el);
  }

  showCatch(fishId: string, points: number, rare: boolean): void {
    const fish = getSpeciesById(fishId);
    if (!fish) {
      return;
    }
    const border = rare ? "2px solid #d2b85c" : "2px solid #111";
    this.el.style.border = border;
    this.el.classList.add("show");

    this.el.innerHTML = `
      <div>
        <canvas id="catch-fish-canvas" width="192" height="96" style="width:100%;height:auto;background:#27333c"></canvas>
      </div>
      <div>
        <h3 style="margin:0 0 8px 0">${fish.nameSv}</h3>
        <p style="margin:0 0 8px 0">+${points} poäng</p>
        <p style="margin:0 0 12px 0; line-height:1.6">${SPECIES_FACTS[fishId] ?? "En fångst från nordiska vatten."}</p>
        <button id="catch-close">Fortsätt</button>
      </div>
    `;

    this.drawFish(fishId);
    this.el.querySelector("#catch-close")?.addEventListener("click", () => this.hide());
  }

  hide(): void {
    this.el.classList.remove("show");
  }

  isOpen(): boolean {
    return this.el.classList.contains("show");
  }

  private drawFish(fishId: string): void {
    const fish = getSpeciesById(fishId);
    const canvas = this.el.querySelector("#catch-fish-canvas") as HTMLCanvasElement | null;
    if (!fish || !canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1f2a30";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const y = 48;
    const length = fish.visualProfile.bodyType === "wide" ? 96 : fish.visualProfile.bodyType === "slim" ? 108 : 100;
    const height = fish.visualProfile.bodyType === "wide" ? 34 : fish.visualProfile.bodyType === "slim" ? 24 : 28;

    ctx.fillStyle = fish.visualProfile.baseColor;
    ctx.beginPath();
    ctx.ellipse(92, y, length / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fish.visualProfile.finColor;
    ctx.beginPath();
    ctx.moveTo(145, y);
    ctx.lineTo(170, y - 14);
    ctx.lineTo(170, y + 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = fish.visualProfile.patternColor;
    for (let i = 0; i < 5; i += 1) {
      const px = 60 + i * 12;
      ctx.fillRect(px, y - 8, 4, 16);
    }

    ctx.fillStyle = "#0f1114";
    ctx.fillRect(44, y - 4, 4, 4);
  }
}
