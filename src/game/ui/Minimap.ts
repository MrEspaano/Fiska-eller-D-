import type { FacingDirection, Point, RectZone } from "../types";
import { computeMinimapViewport, createMinimapModel, type MinimapModel } from "./minimapRender";

interface MinimapInit {
  worldWidth: number;
  worldHeight: number;
  tileSize: number;
  waters: Point[][];
  pathTiles: Set<string>;
  docks: RectZone[];
  house: RectZone;
}

interface MinimapUpdateParams {
  player: Point;
  facing: FacingDirection;
  markers?: Point[];
}

export class Minimap {
  private readonly el: HTMLDivElement;
  private readonly baseCanvas: HTMLCanvasElement;
  private readonly dynamicCanvas: HTMLCanvasElement;
  private readonly baseCtx: CanvasRenderingContext2D;
  private readonly dynamicCtx: CanvasRenderingContext2D;
  private readonly staticCanvas: HTMLCanvasElement;
  private readonly staticCtx: CanvasRenderingContext2D;
  private readonly model: MinimapModel;

  constructor(root: HTMLElement, init: MinimapInit) {
    root.querySelectorAll(".minimap").forEach((node) => node.remove());

    this.model = createMinimapModel(init);

    this.el = document.createElement("div");
    this.el.className = "minimap";
    this.el.innerHTML = `
      <div class="minimap-frame">
        <canvas class="minimap-base"></canvas>
        <canvas class="minimap-dynamic"></canvas>
      </div>
    `;
    root.appendChild(this.el);

    this.baseCanvas = this.el.querySelector(".minimap-base") as HTMLCanvasElement;
    this.dynamicCanvas = this.el.querySelector(".minimap-dynamic") as HTMLCanvasElement;

    this.baseCanvas.width = this.model.viewportWidth;
    this.baseCanvas.height = this.model.viewportHeight;
    this.dynamicCanvas.width = this.model.viewportWidth;
    this.dynamicCanvas.height = this.model.viewportHeight;

    this.baseCtx = this.baseCanvas.getContext("2d") as CanvasRenderingContext2D;
    this.dynamicCtx = this.dynamicCanvas.getContext("2d") as CanvasRenderingContext2D;
    this.baseCtx.imageSmoothingEnabled = false;
    this.dynamicCtx.imageSmoothingEnabled = false;

    this.staticCanvas = document.createElement("canvas");
    this.staticCanvas.width = this.model.scaledWidth;
    this.staticCanvas.height = this.model.scaledHeight;
    this.staticCtx = this.staticCanvas.getContext("2d") as CanvasRenderingContext2D;
    this.staticCtx.imageSmoothingEnabled = false;

    this.drawStaticMap();
  }

  update(params: MinimapUpdateParams): void {
    const view = computeMinimapViewport(params.player, this.model);

    this.baseCtx.clearRect(0, 0, this.model.viewportWidth, this.model.viewportHeight);
    this.baseCtx.drawImage(
      this.staticCanvas,
      Math.round(view.sourceX),
      Math.round(view.sourceY),
      this.model.viewportWidth,
      this.model.viewportHeight,
      0,
      0,
      this.model.viewportWidth,
      this.model.viewportHeight
    );

    this.dynamicCtx.clearRect(0, 0, this.model.viewportWidth, this.model.viewportHeight);
    if (params.markers?.length) {
      this.drawMarkers(params.markers, view.sourceX, view.sourceY);
    }
    this.drawPlayer(params.facing, Math.round(view.playerScreenX), Math.round(view.playerScreenY));
  }

  show(): void {
    this.el.classList.remove("hidden");
  }

  hide(): void {
    this.el.classList.add("hidden");
  }

  destroy(): void {
    this.el.remove();
  }

  private drawStaticMap(): void {
    const s = this.model.scale;
    this.staticCtx.fillStyle = "#4f6f42";
    this.staticCtx.fillRect(0, 0, this.model.scaledWidth, this.model.scaledHeight);

    for (let y = 0; y < this.model.scaledHeight; y += 6) {
      this.staticCtx.fillStyle = y % 12 === 0 ? "rgba(92,132,78,0.35)" : "rgba(73,106,63,0.25)";
      this.staticCtx.fillRect(0, y, this.model.scaledWidth, 1);
    }

    this.staticCtx.fillStyle = "#c2b07a";
    for (const rect of this.model.pathRects) {
      this.staticCtx.fillRect(
        Math.round(rect.x * s),
        Math.round(rect.y * s),
        Math.max(1, Math.round(rect.width * s)),
        Math.max(1, Math.round(rect.height * s))
      );
    }

    this.staticCtx.fillStyle = "#5b8f98";
    this.staticCtx.strokeStyle = "rgba(49,88,99,0.9)";
    this.staticCtx.lineWidth = 1;
    for (const polygon of this.model.waters) {
      this.staticCtx.beginPath();
      polygon.forEach((p0, i) => {
        const x = Math.round(p0.x * s);
        const y = Math.round(p0.y * s);
        if (i === 0) {
          this.staticCtx.moveTo(x, y);
        } else {
          this.staticCtx.lineTo(x, y);
        }
      });
      this.staticCtx.closePath();
      this.staticCtx.fill();
      this.staticCtx.stroke();
    }

    this.staticCtx.fillStyle = "#b0915c";
    for (const dock of this.model.dockRects) {
      this.staticCtx.fillRect(
        Math.round(dock.x * s),
        Math.round(dock.y * s),
        Math.max(1, Math.round(dock.width * s)),
        Math.max(1, Math.round(dock.height * s))
      );
    }

    this.staticCtx.fillStyle = "#70483a";
    this.staticCtx.fillRect(
      Math.round(this.model.houseRect.x * s),
      Math.round(this.model.houseRect.y * s),
      Math.max(2, Math.round(this.model.houseRect.width * s)),
      Math.max(2, Math.round(this.model.houseRect.height * s))
    );
    this.staticCtx.strokeStyle = "rgba(20,20,20,0.9)";
    this.staticCtx.strokeRect(
      Math.round(this.model.houseRect.x * s),
      Math.round(this.model.houseRect.y * s),
      Math.max(2, Math.round(this.model.houseRect.width * s)),
      Math.max(2, Math.round(this.model.houseRect.height * s))
    );
  }

  private drawPlayer(facing: FacingDirection, x: number, y: number): void {
    this.dynamicCtx.fillStyle = "rgba(23,31,35,0.45)";
    this.dynamicCtx.beginPath();
    this.dynamicCtx.ellipse(x, y + 4, 4, 2, 0, 0, Math.PI * 2);
    this.dynamicCtx.fill();

    this.dynamicCtx.fillStyle = "#b6423f";
    this.dynamicCtx.fillRect(x - 3, y - 1, 6, 5);

    this.dynamicCtx.fillStyle = "#f4dcc5";
    this.dynamicCtx.fillRect(x - 2, y - 4, 4, 3);

    this.dynamicCtx.fillStyle = "#b83e3b";
    this.dynamicCtx.fillRect(x - 3, y - 6, 6, 2);

    this.dynamicCtx.fillStyle = "#111111";
    if (facing === "up") {
      this.dynamicCtx.fillRect(x - 1, y - 7, 2, 1);
      return;
    }
    if (facing === "down") {
      this.dynamicCtx.fillRect(x - 1, y + 5, 2, 1);
      return;
    }
    if (facing === "left") {
      this.dynamicCtx.fillRect(x - 5, y - 1, 1, 2);
      return;
    }
    this.dynamicCtx.fillRect(x + 4, y - 1, 1, 2);
  }

  private drawMarkers(markers: Point[], sourceX: number, sourceY: number): void {
    const scale = this.model.scale;
    this.dynamicCtx.fillStyle = "#f4d27f";
    this.dynamicCtx.strokeStyle = "rgba(0,0,0,0.7)";
    this.dynamicCtx.lineWidth = 1;
    for (const marker of markers) {
      const sx = Math.round(marker.x * scale - sourceX);
      const sy = Math.round(marker.y * scale - sourceY);
      if (sx < -3 || sy < -3 || sx > this.model.viewportWidth + 3 || sy > this.model.viewportHeight + 3) {
        continue;
      }

      this.dynamicCtx.beginPath();
      this.dynamicCtx.arc(sx, sy, 2, 0, Math.PI * 2);
      this.dynamicCtx.fill();
      this.dynamicCtx.stroke();
    }
  }
}
