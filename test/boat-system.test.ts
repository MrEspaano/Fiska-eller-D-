import { describe, expect, it } from "vitest";
import { DOCKS, HOUSE_LAYOUT } from "../src/game/data/layout";
import { isPointInAnyWater } from "../src/game/data/waters";
import { BoatSystem } from "../src/game/systems/BoatSystem";

describe("BoatSystem", () => {
  it("boards when near dock", () => {
    const sys = new BoatSystem();
    const dock = DOCKS[0];
    const nearDock = { ...dock.boardPoint };

    const board = sys.boardIfNearDock(nearDock);
    expect(board.boarded).toBe(true);
    expect(board.waterId).toBe(dock.waterId);
    expect(board.boatPosition).not.toBeNull();
  });

  it("keeps boat movement inside water", () => {
    const sys = new BoatSystem();
    const waterId = "lake" as const;
    const start = sys.getBoatSpawn(waterId);
    const moved = sys.moveBoat(start, waterId, -5, -5, 1000, 300);

    expect(isPointInAnyWater(moved)).toBe(true);
  });

  it("does not allow boat movement onto dock area", () => {
    const sys = new BoatSystem();
    const dock = DOCKS[0];
    const start = { ...dock.boatSpawn };
    const dx = dock.boardPoint.x - start.x;
    const dy = dock.boardPoint.y - start.y;

    const moved = sys.moveBoat(start, dock.waterId, dx, dy, 1000, 1);
    expect(moved).toEqual(start);
  });

  it("disembarks near dock or shore", () => {
    const sys = new BoatSystem();
    const dock = DOCKS[1];
    const boatPoint = { x: dock.boatSpawn.x, y: dock.boatSpawn.y };

    const res = sys.tryDisembark(boatPoint, dock.waterId, [HOUSE_LAYOUT.bounds]);
    expect(res.disembarked).toBe(true);
    expect(res.playerPoint).not.toBeNull();
    expect(res.playerPoint).toEqual(dock.boardPoint);
  });
});
