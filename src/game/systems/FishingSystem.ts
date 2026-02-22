import { FISH_SPECIES, getSpeciesById } from "../data/fish";
import { distance, getWaterAtPoint, getZoneAtPoint } from "../data/waters";
import type { BuffState, FishingAttempt, FishingResult, FishingSession, Point } from "../types";
import { BuffSystem } from "./BuffSystem";

interface RollOptions {
  nearShadowId?: string;
  nearShadowSpeciesId?: string;
  now: number;
  buffState: BuffState;
}

export type FishingSessionEvent = "waiting" | "bite_started" | "bite_missed" | "ready";

export interface SessionUpdate {
  session: FishingSession;
  event?: FishingSessionEvent;
}

export const CAST_MS = 500;
export const WAIT_MIN_MS = 5000;
export const WAIT_MAX_MS = 7000;
export const BITE_WINDOW_MS = 900;
export const COOLDOWN_MS = 300;

export class FishingSystem {
  private readonly buffSystem = new BuffSystem();
  private readonly baseCatchChance = 0.65;

  buildAttempt(castPoint: Point): FishingAttempt | null {
    const water = getWaterAtPoint(castPoint);
    if (!water) {
      return null;
    }

    const zone = getZoneAtPoint(water, castPoint);
    if (!zone) {
      return null;
    }

    return {
      waterId: water.id,
      zoneId: zone,
      castPoint
    };
  }

  startSession(attempt: FishingAttempt, now: number, nearShadowId?: string, nearShadowSpeciesId?: string): FishingSession {
    const waitMs = WAIT_MIN_MS + Math.random() * (WAIT_MAX_MS - WAIT_MIN_MS);
    const castEndsAt = now + CAST_MS;
    return {
      phase: "casting",
      castPoint: attempt.castPoint,
      attempt,
      startedAt: now,
      castEndsAt,
      waitUntil: castEndsAt + waitMs,
      biteUntil: 0,
      cooldownUntil: 0,
      nearShadowId,
      nearShadowSpeciesId,
      lockedMovement: true
    };
  }

  updateSession(session: FishingSession, now: number): SessionUpdate {
    if (session.phase === "casting" && now >= session.castEndsAt) {
      return {
        session: {
          ...session,
          phase: "waiting"
        },
        event: "waiting"
      };
    }

    if (session.phase === "waiting" && now >= session.waitUntil) {
      return {
        session: {
          ...session,
          phase: "bite_window",
          biteUntil: now + BITE_WINDOW_MS
        },
        event: "bite_started"
      };
    }

    if (session.phase === "bite_window" && now > session.biteUntil) {
      return {
        session: this.startCooldown(session, now),
        event: "bite_missed"
      };
    }

    if (session.phase === "cooldown" && now >= session.cooldownUntil) {
      return {
        session: {
          ...session,
          phase: "idle",
          lockedMovement: false
        },
        event: "ready"
      };
    }

    return { session };
  }

  tryHook(session: FishingSession, now: number): { accepted: boolean; session: FishingSession } {
    if (session.phase !== "bite_window") {
      return { accepted: false, session };
    }

    if (now > session.biteUntil) {
      return { accepted: false, session: this.startCooldown(session, now) };
    }

    return {
      accepted: true,
      session: {
        ...session,
        phase: "resolve",
        lockedMovement: false
      }
    };
  }

  resolveSession(session: FishingSession, options: { now: number; buffState: BuffState }): FishingResult {
    if (session.phase !== "resolve") {
      return {
        success: false,
        pointsAwarded: 0,
        message: "Kroken hann inte sättas."
      };
    }

    return this.rollCatch(session.attempt, {
      now: options.now,
      buffState: options.buffState,
      nearShadowId: session.nearShadowId,
      nearShadowSpeciesId: session.nearShadowSpeciesId
    });
  }

  startCooldown(session: FishingSession, now: number): FishingSession {
    return {
      ...session,
      phase: "cooldown",
      cooldownUntil: now + COOLDOWN_MS,
      lockedMovement: false
    };
  }

  rollCatch(attempt: FishingAttempt, options: RollOptions): FishingResult {
    const buffBonus = this.buffSystem.getCatchBonus(options.buffState, options.now);
    const shadowBonus = options.nearShadowId ? 0.3 : 0;
    const catchChance = Math.min(0.95, this.baseCatchChance + buffBonus + shadowBonus);

    if (Math.random() > catchChance) {
      return {
        success: false,
        message: "Ingen napp den här gången.",
        pointsAwarded: 0
      };
    }

    const pool = FISH_SPECIES
      .filter((s) => s.allowedWaters.includes(attempt.waterId))
      .map((s) => {
        const w = s.zoneWeights[attempt.zoneId] ?? 0;
        if (w <= 0) {
          return { speciesId: s.id, weight: 0 };
        }
        const nearBoost = options.nearShadowSpeciesId === s.id ? 2.0 : 1.0;
        return { speciesId: s.id, weight: w * nearBoost };
      })
      .filter((entry) => entry.weight > 0);

    if (pool.length === 0) {
      return {
        success: false,
        message: "Vattnet känns tomt här.",
        pointsAwarded: 0
      };
    }

    const fishId = weightedPick(pool);
    const species = getSpeciesById(fishId);
    if (!species) {
      return {
        success: false,
        message: "Något gick fel i fångsten.",
        pointsAwarded: 0
      };
    }

    return {
      success: true,
      fishId,
      pointsAwarded: species.points,
      consumedShadowId: options.nearShadowId,
      message: `Du fick ${species.nameSv}! +${species.points} poäng`
    };
  }
}

function weightedPick(entries: { speciesId: string; weight: number }[]): string {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.speciesId;
    }
  }
  return entries[entries.length - 1].speciesId;
}

export function isNear(point: Point, target: Point, radius: number): boolean {
  return distance(point, target) <= radius;
}
