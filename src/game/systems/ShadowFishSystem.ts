import { FISH_SPECIES, getSpeciesById } from "../data/fish";
import {
  WATER_BODIES,
  distance,
  getNearestPointOnPolygonBoundary,
  getZoneAtPoint,
  pointInPolygon,
  polygonCentroid
} from "../data/waters";
import type { Point, ShadowFish, WaterBody } from "../types";

interface RespawnTicket {
  waterId: string;
  at: number;
}

export class ShadowFishSystem {
  private shadows: ShadowFish[] = [];
  private pendingRespawns: RespawnTicket[] = [];
  private readonly waterById = new Map(WATER_BODIES.map((w) => [w.id, w]));
  private readonly waterCentroids = new Map(WATER_BODIES.map((w) => [w.id, polygonCentroid(w.polygon)]));

  initialize(now: number): void {
    this.shadows = [];
    this.pendingRespawns = [];

    for (const water of WATER_BODIES) {
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i += 1) {
        this.shadows.push(this.spawnShadow(water, now));
      }
    }
  }

  update(deltaMs: number, now: number): void {
    const deltaSec = deltaMs / 1000;

    for (const shadow of this.shadows) {
      shadow.ttl -= deltaMs;

      const water = this.waterById.get(shadow.waterId);
      if (!water) {
        continue;
      }

      shadow.wobblePhase += deltaSec * (3.6 + shadow.size * 1.6);

      if (Math.random() < 0.01) {
        shadow.heading += (Math.random() - 0.5) * 0.9;
      }

      const sway = Math.sin(shadow.wobblePhase) * 0.22;
      const heading = shadow.heading + sway;

      const speed = (18 + shadow.size * 10) * deltaSec;
      const target = shadow.patrolPath[shadow.pathIndex];
      const toTarget = {
        x: target.x - shadow.position.x,
        y: target.y - shadow.position.y
      };
      const targetHeading = Math.atan2(toTarget.y, toTarget.x);

      shadow.heading = blendAngles(shadow.heading, targetHeading, 0.06 + deltaSec * 0.8);

      const lateralStrength = Math.sin(shadow.wobblePhase * 2.1) * (1.4 + shadow.size * 0.8);
      const lateral = {
        x: Math.cos(heading + Math.PI / 2) * lateralStrength * deltaSec,
        y: Math.sin(heading + Math.PI / 2) * lateralStrength * deltaSec
      };
      const tentative = {
        x: shadow.position.x + Math.cos(heading) * speed + lateral.x,
        y: shadow.position.y + Math.sin(heading) * speed + lateral.y
      };

      if (pointInPolygon(tentative, water.polygon)) {
        shadow.position.x = tentative.x;
        shadow.position.y = tentative.y;
      } else {
        const corrected = this.clampInsideWater(tentative, water);
        shadow.position.x = corrected.x;
        shadow.position.y = corrected.y;
        shadow.heading += Math.PI * (0.5 + Math.random() * 0.7);
        shadow.pathIndex = (shadow.pathIndex + 1) % shadow.patrolPath.length;
      }

      if (distance(shadow.position, target) < 10) {
        shadow.pathIndex = (shadow.pathIndex + 1) % shadow.patrolPath.length;
      }

      if (shadow.ttl <= 0) {
        this.consumeShadow(shadow.id, now);
      }
    }

    this.shadows = this.shadows.filter((s) => s.ttl > 0);

    const ready = this.pendingRespawns.filter((r) => r.at <= now);
    this.pendingRespawns = this.pendingRespawns.filter((r) => r.at > now);

    for (const ticket of ready) {
      const water = this.waterById.get(ticket.waterId as WaterBody["id"]);
      if (!water) {
        continue;
      }
      this.shadows.push(this.spawnShadow(water, now));
    }
  }

  getAll(): ShadowFish[] {
    return this.shadows;
  }

  findNearby(point: Point, radius: number): ShadowFish | null {
    return this.shadows.find((s) => distance(s.position, point) <= radius) ?? null;
  }

  consumeShadow(id: string, now: number): void {
    const index = this.shadows.findIndex((s) => s.id === id);
    if (index < 0) {
      return;
    }

    const [removed] = this.shadows.splice(index, 1);
    const respawnDelayMs = (10 + Math.random() * 5) * 1000;
    this.pendingRespawns.push({ waterId: removed.waterId, at: now + respawnDelayMs });
  }

  private spawnShadow(water: WaterBody, now: number): ShadowFish {
    const anchor = water.zoneDefs[Math.floor(Math.random() * water.zoneDefs.length)]?.polygon[0] ?? this.waterCentroids.get(water.id) ?? water.polygon[0];
    const position = this.randomPointInWater(water, anchor, 90, 120);

    const zone = getZoneAtPoint(water, position) ?? "general";
    const candidates = FISH_SPECIES.filter((f) => f.allowedWaters.includes(water.id) && (f.zoneWeights[zone] ?? 0) > 0);
    const species = candidates[Math.floor(Math.random() * candidates.length)] ?? FISH_SPECIES[0];

    const profile = getSpeciesById(species.id)?.visualProfile;
    const shape = profile?.bodyType ?? "normal";

    const patrolPath = [
      this.randomPointInWater(water, position, 90, 120),
      this.randomPointInWater(water, position, 90, 120),
      this.randomPointInWater(water, position, 90, 120)
    ];

    const size = Math.random() > 0.75 ? 1.2 : (Math.random() < 0.4 ? 0.8 : 1);
    const lengthBase = shape === "slim" ? 26 : shape === "wide" ? 30 : 28;

    return {
      id: `${water.id}-${now}-${Math.random().toString(36).slice(2, 8)}`,
      speciesId: species.id,
      waterId: water.id,
      position,
      patrolPath,
      pathIndex: 0,
      ttl: (18 + Math.random() * 20) * 1000,
      size,
      heading: Math.random() * Math.PI * 2,
      wobblePhase: Math.random() * Math.PI * 2,
      shape,
      lengthPx: lengthBase * size
    };
  }

  private randomPointInWater(water: WaterBody, around: Point, spread: number, tries: number): Point {
    for (let i = 0; i < tries; i += 1) {
      const candidate = {
        x: around.x + (Math.random() - 0.5) * spread,
        y: around.y + (Math.random() - 0.5) * spread
      };
      if (pointInPolygon(candidate, water.polygon)) {
        return candidate;
      }
    }

    const centroid = this.waterCentroids.get(water.id) ?? water.polygon[0];
    if (pointInPolygon(centroid, water.polygon)) {
      return centroid;
    }

    return this.clampInsideWater(around, water);
  }

  private clampInsideWater(point: Point, water: WaterBody): Point {
    const boundary = getNearestPointOnPolygonBoundary(point, water.polygon);
    const centroid = this.waterCentroids.get(water.id) ?? water.polygon[0];
    const vx = centroid.x - boundary.x;
    const vy = centroid.y - boundary.y;
    const len = Math.hypot(vx, vy) || 1;
    const inward = {
      x: boundary.x + (vx / len) * 3,
      y: boundary.y + (vy / len) * 3
    };

    if (pointInPolygon(inward, water.polygon)) {
      return inward;
    }

    return centroid;
  }
}

function blendAngles(from: number, to: number, amount: number): number {
  const wrapped = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return from + wrapped * Math.max(0, Math.min(1, amount));
}
