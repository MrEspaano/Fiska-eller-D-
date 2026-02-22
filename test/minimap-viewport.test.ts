import { describe, expect, it } from "vitest";
import { computeMinimapViewport, createMinimapModel } from "../src/game/ui/minimapRender";

describe("Minimap viewport", () => {
  const model = createMinimapModel({
    worldWidth: 500,
    worldHeight: 400,
    tileSize: 10,
    waters: [],
    pathTiles: new Set(),
    docks: [],
    house: { x: 0, y: 0, width: 20, height: 20 },
    scale: 1,
    viewportWidth: 100,
    viewportHeight: 80
  });

  it("keeps player centered in normal case", () => {
    const view = computeMinimapViewport({ x: 250, y: 200 }, model);
    expect(view.playerScreenX).toBeCloseTo(50, 4);
    expect(view.playerScreenY).toBeCloseTo(40, 4);
  });

  it("clamps near top-left border", () => {
    const view = computeMinimapViewport({ x: 0, y: 0 }, model);
    expect(view.sourceX).toBe(0);
    expect(view.sourceY).toBe(0);
    expect(view.playerScreenX).toBe(0);
    expect(view.playerScreenY).toBe(0);
  });

  it("clamps near bottom-right border", () => {
    const view = computeMinimapViewport({ x: 500, y: 400 }, model);
    expect(view.sourceX).toBe(model.scaledWidth - model.viewportWidth);
    expect(view.sourceY).toBe(model.scaledHeight - model.viewportHeight);
    expect(view.playerScreenX).toBeCloseTo(model.viewportWidth, 4);
    expect(view.playerScreenY).toBeCloseTo(model.viewportHeight, 4);
  });
});
