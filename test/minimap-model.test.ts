import { describe, expect, it } from "vitest";
import { DOCKS, HOUSE_LAYOUT, WORLD_H, WORLD_W } from "../src/game/data/layout";
import { TILE_SIZE, WATER_BODIES } from "../src/game/data/waters";
import { createMinimapModel } from "../src/game/ui/minimapRender";

describe("Minimap model", () => {
  it("includes waters, paths, docks, house and world bounds", () => {
    const model = createMinimapModel({
      worldWidth: WORLD_W,
      worldHeight: WORLD_H,
      tileSize: TILE_SIZE,
      waters: WATER_BODIES.map((w) => w.polygon),
      pathTiles: new Set(["1,1", "8,4", "22,10"]),
      docks: DOCKS.map((dock) => dock.rect),
      house: HOUSE_LAYOUT.bounds
    });

    expect(model.worldWidth).toBe(WORLD_W);
    expect(model.worldHeight).toBe(WORLD_H);
    expect(model.waters.length).toBe(WATER_BODIES.length);
    expect(model.pathRects.length).toBe(3);
    expect(model.dockRects.length).toBe(DOCKS.length);
    expect(model.houseRect).toEqual(HOUSE_LAYOUT.bounds);
    expect(model.scaledWidth).toBeGreaterThanOrEqual(model.viewportWidth);
    expect(model.scaledHeight).toBeGreaterThanOrEqual(model.viewportHeight);
  });
});
