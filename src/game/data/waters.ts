import type { Point, WaterBody, WaterId, ZoneId } from "../types";

export const TILE_SIZE = 32;

function p(tx: number, ty: number): Point {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

export const WATER_BODIES: WaterBody[] = [
  {
    id: "lake",
    kind: "lake",
    polygon: [p(10, 8), p(18, 6), p(29, 8), p(36, 14), p(37, 22), p(32, 28), p(21, 31), p(12, 28), p(8, 21), p(8, 13)],
    zoneDefs: [
      { id: "reed_edge", polygon: [p(10, 9), p(17, 7), p(28, 9), p(35, 14), p(35, 21), p(31, 27), p(22, 29), p(13, 27), p(10, 21), p(9, 14)] },
      { id: "general", polygon: [p(14, 12), p(20, 10), p(27, 12), p(31, 16), p(31, 22), p(28, 25), p(21, 27), p(15, 25), p(12, 21), p(12, 16)] },
      { id: "deep_center", polygon: [p(18, 15), p(22, 14), p(26, 16), p(27, 20), p(24, 23), p(20, 24), p(17, 22), p(16, 18)] }
    ],
    fishableAreas: [p(12, 10), p(17, 8), p(25, 9), p(33, 15), p(30, 26), p(20, 30), p(11, 24), p(9, 16)]
  },
  {
    id: "river",
    kind: "river",
    polygon: [p(42, 4), p(46, 6), p(50, 12), p(48, 18), p(51, 24), p(49, 31), p(44, 36), p(40, 34), p(42, 27), p(39, 20), p(40, 12)],
    zoneDefs: [
      { id: "reed_edge", polygon: [p(42, 5), p(45, 7), p(48, 12), p(47, 18), p(49, 24), p(48, 30), p(44, 34), p(41, 33), p(42, 27), p(40, 20), p(41, 12)] },
      { id: "general", polygon: [p(43, 8), p(45, 10), p(47, 14), p(46, 18), p(47, 23), p(46, 28), p(44, 31), p(42, 30), p(43, 25), p(42, 19), p(43, 14)] },
      { id: "river_run", polygon: [p(44, 11), p(45, 13), p(45, 17), p(45, 22), p(45, 26), p(44, 28), p(43, 26), p(43, 22), p(43, 17), p(43, 13)] }
    ],
    fishableAreas: [p(43, 7), p(47, 13), p(46, 21), p(46, 28), p(43, 33), p(40, 18)]
  },
  {
    id: "skogstjarn",
    kind: "lake",
    polygon: [p(4, 27), p(8, 25), p(12, 27), p(12, 32), p(9, 36), p(4, 35), p(2, 31)],
    zoneDefs: [
      { id: "reed_edge", polygon: [p(4, 28), p(8, 26), p(11, 28), p(11, 32), p(9, 35), p(4, 34), p(3, 31)] },
      { id: "general", polygon: [p(5, 29), p(8, 27), p(10, 29), p(10, 32), p(8, 34), p(5, 33), p(4, 31)] },
      { id: "deep_center", polygon: [p(7, 30), p(8, 29), p(9, 30), p(9, 32), p(8, 33), p(7, 32)] }
    ],
    fishableAreas: [p(4, 29), p(8, 27), p(11, 29), p(10, 34), p(5, 34), p(3, 31)]
  },
  {
    id: "klippsjon",
    kind: "lake",
    polygon: [p(49, 3), p(55, 2), p(58, 5), p(57, 10), p(52, 11), p(48, 8)],
    zoneDefs: [
      { id: "reed_edge", polygon: [p(50, 4), p(55, 3), p(57, 6), p(56, 9), p(52, 10), p(49, 8)] },
      { id: "general", polygon: [p(51, 5), p(54, 4), p(56, 6), p(55, 8), p(53, 9), p(50, 8)] },
      { id: "deep_center", polygon: [p(52, 6), p(54, 6), p(55, 7), p(54, 8), p(52, 8), p(51, 7)] }
    ],
    fishableAreas: [p(50, 4), p(54, 3), p(57, 6), p(56, 9), p(52, 10), p(49, 7)]
  },
  {
    id: "myrkanal",
    kind: "river",
    polygon: [p(53, 23), p(57, 24), p(58, 28), p(57, 34), p(54, 37), p(51, 35), p(52, 29)],
    zoneDefs: [
      { id: "reed_edge", polygon: [p(53, 24), p(56, 25), p(57, 28), p(56, 33), p(54, 36), p(52, 34), p(52, 29)] },
      { id: "general", polygon: [p(54, 25), p(56, 26), p(56, 29), p(55, 33), p(54, 35), p(53, 33), p(53, 29)] },
      { id: "river_run", polygon: [p(54, 27), p(55, 28), p(55, 31), p(54, 33), p(53, 31), p(53, 28)] }
    ],
    fishableAreas: [p(53, 24), p(56, 26), p(57, 30), p(55, 35), p(52, 34), p(52, 29)]
  }
];

export function getWaterById(waterId: WaterId): WaterBody | null {
  return WATER_BODIES.find((w) => w.id === waterId) ?? null;
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects = yi > point.y !== yj > point.y
      && point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-6) + xi;

    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function projectPointToSegment(point: Point, a: Point, b: Point): Point {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abLen2 = abx * abx + aby * aby || 1;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
  return {
    x: a.x + abx * t,
    y: a.y + aby * t
  };
}

export function polygonCentroid(polygon: Point[]): Point {
  const sum = polygon.reduce((acc, p0) => ({ x: acc.x + p0.x, y: acc.y + p0.y }), { x: 0, y: 0 });
  return { x: sum.x / polygon.length, y: sum.y / polygon.length };
}

export function getNearestPointOnPolygonBoundary(point: Point, polygon: Point[]): Point {
  let best = polygon[0];
  let bestD = Number.POSITIVE_INFINITY;

  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const candidate = projectPointToSegment(point, a, b);
    const d = distance(point, candidate);
    if (d < bestD) {
      bestD = d;
      best = candidate;
    }
  }

  return best;
}

export function getWaterAtPoint(point: Point): WaterBody | null {
  return WATER_BODIES.find((w) => pointInPolygon(point, w.polygon)) ?? null;
}

export function isPointInAnyWater(point: Point): boolean {
  return WATER_BODIES.some((w) => pointInPolygon(point, w.polygon));
}

export function getNearestWaterBoundaryPoint(point: Point): { waterId: WaterId; point: Point } | null {
  let best: { waterId: WaterId; point: Point } | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const water of WATER_BODIES) {
    const boundaryPoint = getNearestPointOnPolygonBoundary(point, water.polygon);
    const d = distance(point, boundaryPoint);
    if (d < bestDistance) {
      bestDistance = d;
      best = { waterId: water.id, point: boundaryPoint };
    }
  }

  return best;
}

export function clampPointToWater(point: Point, waterId: WaterId): Point | null {
  const water = getWaterById(waterId);
  if (!water) {
    return null;
  }
  if (pointInPolygon(point, water.polygon)) {
    return point;
  }

  const boundary = getNearestPointOnPolygonBoundary(point, water.polygon);
  const centroid = polygonCentroid(water.polygon);
  const vx = centroid.x - boundary.x;
  const vy = centroid.y - boundary.y;
  const len = Math.hypot(vx, vy) || 1;
  const inward = {
    x: boundary.x + (vx / len) * 4,
    y: boundary.y + (vy / len) * 4
  };

  return pointInPolygon(inward, water.polygon) ? inward : centroid;
}

export function getZoneAtPoint(water: WaterBody, point: Point): ZoneId | null {
  const ordered: ZoneId[] = ["deep_center", "river_run", "general", "reed_edge"];
  for (const id of ordered) {
    const zone = water.zoneDefs.find((z) => z.id === id);
    if (zone && pointInPolygon(point, zone.polygon)) {
      return id;
    }
  }
  return pointInPolygon(point, water.polygon) ? "general" : null;
}

export function nearestFishablePoint(origin: Point, waterId: WaterId): Point | null {
  const water = WATER_BODIES.find((w) => w.id === waterId);
  if (!water) {
    return null;
  }
  let best: Point | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const candidate of water.fishableAreas) {
    const d = distance(origin, candidate);
    if (d < bestD) {
      best = candidate;
      bestD = d;
    }
  }
  return best;
}
