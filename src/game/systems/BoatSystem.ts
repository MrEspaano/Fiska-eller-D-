import { DOCKS, isPointInRect } from "../data/layout";
import { clampPointToWater, distance, getWaterById, pointInPolygon } from "../data/waters";
import type { BoatState, DockPlacement, Point, RectZone, WaterId } from "../types";

export class BoatSystem {
  private readonly dockByWater = new Map<WaterId, DockPlacement>(DOCKS.map((d) => [d.waterId, d]));

  createInitialState(): BoatState {
    const first = DOCKS[0];
    return {
      onBoat: false,
      position: { x: first.boatSpawn.x, y: first.boatSpawn.y },
      currentWaterId: null
    };
  }

  getBoatSpawn(waterId: WaterId): Point {
    return this.dockByWater.get(waterId)?.boatSpawn ?? { x: 0, y: 0 };
  }

  boardIfNearDock(playerPoint: Point): { boarded: boolean; waterId: WaterId | null; boatPosition: Point | null } {
    for (const dock of DOCKS) {
      if (this.isNearDock(playerPoint, dock)) {
        return {
          boarded: true,
          waterId: dock.waterId,
          boatPosition: { x: dock.boatSpawn.x, y: dock.boatSpawn.y }
        };
      }
    }

    return { boarded: false, waterId: null, boatPosition: null };
  }

  isNearDock(point: Point, dock: DockPlacement): boolean {
    const rectWithMargin = {
      x: dock.rect.x - 20,
      y: dock.rect.y - 20,
      width: dock.rect.width + 40,
      height: dock.rect.height + 40
    };

    if (isPointInRect(point, rectWithMargin)) {
      return true;
    }

    if (distance(point, dock.boardPoint) < 76) {
      return true;
    }

    const dockCenter = {
      x: dock.rect.x + dock.rect.width / 2,
      y: dock.rect.y + dock.rect.height / 2
    };
    return distance(point, dockCenter) < 42;
  }

  moveBoat(current: Point, waterId: WaterId, dx: number, dy: number, deltaMs: number, speed = 150): Point {
    const next = {
      x: current.x + dx * speed * (deltaMs / 1000),
      y: current.y + dy * speed * (deltaMs / 1000)
    };

    const dock = this.dockByWater.get(waterId);
    const dockBlock = dock
      ? {
        x: dock.rect.x - 4,
        y: dock.rect.y - 6,
        width: dock.rect.width + 8,
        height: dock.rect.height + 12
      }
      : null;

    if (dockBlock && isPointInRect(next, dockBlock)) {
      return current;
    }

    const water = getWaterById(waterId);
    if (!water) {
      return current;
    }

    if (pointInPolygon(next, water.polygon)) {
      return next;
    }

    const clamped = clampPointToWater(next, waterId);
    if (!clamped) {
      return current;
    }

    if (dockBlock && isPointInRect(clamped, dockBlock)) {
      return current;
    }

    return clamped;
  }

  tryDisembark(
    boatPoint: Point,
    waterId: WaterId,
    blockedRects: RectZone[]
  ): { disembarked: boolean; playerPoint: Point | null } {
    const dock = this.dockByWater.get(waterId);
    if (dock && (this.isNearDock(boatPoint, dock) || distance(boatPoint, dock.boatSpawn) < 64)) {
      return {
        disembarked: true,
        playerPoint: { ...dock.boardPoint }
      };
    }

    const shoreCandidate = this.findNearestShoreDisembark(boatPoint, waterId, blockedRects);
    if (!shoreCandidate) {
      return { disembarked: false, playerPoint: null };
    }

    return { disembarked: true, playerPoint: shoreCandidate };
  }

  private findNearestShoreDisembark(point: Point, waterId: WaterId, blockedRects: RectZone[]): Point | null {
    const directions = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 }
    ];

    const step = 14;
    for (let radius = step; radius <= 90; radius += step) {
      for (const dir of directions) {
        const candidate = {
          x: point.x + dir.x * radius,
          y: point.y + dir.y * radius
        };

        if (clampPointToWater(candidate, waterId) && distance(candidate, point) > 8) {
          continue;
        }

        if (blockedRects.some((r) => isPointInRect(candidate, r))) {
          continue;
        }

        return candidate;
      }
    }

    return null;
  }
}
