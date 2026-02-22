import { isPointInAnyWater } from "../data/waters";
import type { NpcPlacement, Point, RectZone } from "../types";

function pointInRect(point: Point, rect: RectZone): boolean {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
}

export class SpawnValidationSystem {
  isLandPoint(point: Point, blockedRects: RectZone[] = []): boolean {
    if (isPointInAnyWater(point)) {
      return false;
    }
    return !blockedRects.some((r) => pointInRect(point, r));
  }

  findNearestLandPoint(origin: Point, blockedRects: RectZone[] = [], maxRadius = 420, step = 10): Point {
    if (this.isLandPoint(origin, blockedRects)) {
      return origin;
    }

    for (let radius = step; radius <= maxRadius; radius += step) {
      const samples = 24 + Math.floor(radius / 8);
      for (let i = 0; i < samples; i += 1) {
        const angle = (Math.PI * 2 * i) / samples;
        const candidate = {
          x: origin.x + Math.cos(angle) * radius,
          y: origin.y + Math.sin(angle) * radius
        };
        if (this.isLandPoint(candidate, blockedRects)) {
          return candidate;
        }
      }
    }

    return origin;
  }

  validateNpcPlacement(npc: NpcPlacement, blockedRects: RectZone[] = []): NpcPlacement {
    const point = this.findNearestLandPoint({ x: npc.x, y: npc.y }, blockedRects);
    return {
      ...npc,
      x: point.x,
      y: point.y
    };
  }
}
