import {
  clampPointToWater,
  distance,
  getNearestWaterBoundaryPoint,
  nearestFishablePoint,
  pointInPolygon,
  polygonCentroid,
  WATER_BODIES
} from "../data/waters";
import type { DynamicCastZone, Point, WaterId } from "../types";

export class CastZoneSystem {
  constructor(private readonly maxDistance = 185) {}

  compute(playerPoint: Point, aimPoint?: Point | null): DynamicCastZone {
    const nearest = getNearestWaterBoundaryPoint(playerPoint);
    if (!nearest) {
      return this.hidden();
    }

    const shorelineDistance = distance(playerPoint, nearest.point);
    if (shorelineDistance > this.maxDistance) {
      return this.hidden(nearest.waterId);
    }

    const water = WATER_BODIES.find((w) => w.id === nearest.waterId);
    if (!water) {
      return this.hidden();
    }

    const autoCenter = this.computeAutoCenter(playerPoint, water.id, nearest.point);
    const projectedAim = aimPoint ? this.projectAimToWater(water.id, aimPoint) : null;

    return {
      waterId: water.id,
      center: projectedAim ?? autoCenter,
      autoCenter,
      aimCenter: projectedAim,
      isAiming: Boolean(projectedAim),
      radius: 30,
      visible: true
    };
  }

  projectAimToWater(waterId: WaterId, pointerPoint: Point): Point | null {
    return clampPointToWater(pointerPoint, waterId);
  }

  private computeAutoCenter(playerPoint: Point, waterId: WaterId, boundaryPoint: Point): Point {
    const water = WATER_BODIES.find((w) => w.id === waterId);
    if (!water) {
      return boundaryPoint;
    }

    const centroid = polygonCentroid(water.polygon);
    const inwardVector = {
      x: centroid.x - boundaryPoint.x,
      y: centroid.y - boundaryPoint.y
    };
    const len = Math.hypot(inwardVector.x, inwardVector.y) || 1;
    const inward = { x: inwardVector.x / len, y: inwardVector.y / len };

    for (const offset of [20, 28, 36, 44, 52, 60]) {
      const candidate = {
        x: boundaryPoint.x + inward.x * offset,
        y: boundaryPoint.y + inward.y * offset
      };
      if (pointInPolygon(candidate, water.polygon)) {
        return candidate;
      }
    }

    return nearestFishablePoint(playerPoint, water.id) ?? boundaryPoint;
  }

  private hidden(waterId: DynamicCastZone["waterId"] = "lake"): DynamicCastZone {
    return {
      waterId,
      center: { x: 0, y: 0 },
      autoCenter: { x: 0, y: 0 },
      aimCenter: null,
      isAiming: false,
      radius: 30,
      visible: false
    };
  }
}
