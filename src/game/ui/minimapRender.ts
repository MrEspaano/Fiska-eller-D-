import type { Point, RectZone } from "../types";

export interface MinimapModelInput {
  worldWidth: number;
  worldHeight: number;
  tileSize: number;
  waters: Point[][];
  pathTiles: Set<string>;
  docks: RectZone[];
  house: RectZone;
  scale?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface MinimapModel {
  worldWidth: number;
  worldHeight: number;
  scale: number;
  viewportWidth: number;
  viewportHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  waters: Point[][];
  pathRects: RectZone[];
  dockRects: RectZone[];
  houseRect: RectZone;
}

export interface MinimapViewport {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  playerScreenX: number;
  playerScreenY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseTileKey(key: string): { tx: number; ty: number } | null {
  const [xRaw, yRaw] = key.split(",");
  const tx = Number(xRaw);
  const ty = Number(yRaw);
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
    return null;
  }
  return { tx, ty };
}

export function createMinimapModel(input: MinimapModelInput): MinimapModel {
  const scale = input.scale ?? 0.14;
  const viewportWidth = input.viewportWidth ?? 188;
  const viewportHeight = input.viewportHeight ?? 124;

  const scaledWidth = Math.max(viewportWidth, Math.round(input.worldWidth * scale));
  const scaledHeight = Math.max(viewportHeight, Math.round(input.worldHeight * scale));

  const pathRects: RectZone[] = [];
  for (const key of input.pathTiles) {
    const parsed = parseTileKey(key);
    if (!parsed) {
      continue;
    }
    pathRects.push({
      x: parsed.tx * input.tileSize,
      y: parsed.ty * input.tileSize,
      width: input.tileSize,
      height: input.tileSize
    });
  }

  return {
    worldWidth: input.worldWidth,
    worldHeight: input.worldHeight,
    scale,
    viewportWidth,
    viewportHeight,
    scaledWidth,
    scaledHeight,
    waters: input.waters,
    pathRects,
    dockRects: input.docks,
    houseRect: input.house
  };
}

export function computeMinimapViewport(player: Point, model: MinimapModel): MinimapViewport {
  const px = player.x * model.scale;
  const py = player.y * model.scale;

  const maxSourceX = Math.max(0, model.scaledWidth - model.viewportWidth);
  const maxSourceY = Math.max(0, model.scaledHeight - model.viewportHeight);

  const sourceX = clamp(px - model.viewportWidth / 2, 0, maxSourceX);
  const sourceY = clamp(py - model.viewportHeight / 2, 0, maxSourceY);

  return {
    sourceX,
    sourceY,
    sourceWidth: model.viewportWidth,
    sourceHeight: model.viewportHeight,
    playerScreenX: px - sourceX,
    playerScreenY: py - sourceY
  };
}

export function shouldShowMinimap(sceneKind: "world" | "cabin", menuOpen: boolean): boolean {
  return sceneKind === "world" && !menuOpen;
}
