import {
  MAX_LEVEL,
  UNLOCK_RULES,
  calculateCatchXpReward,
  getLevelModifiers,
  getXpToNext
} from "../data/progression";
import type {
  FishSpecies,
  LevelModifiers,
  ProgressionState,
  UnlockState,
  WaterId,
  XpRewardBreakdown
} from "../types";

interface ApplyCatchXpInput {
  success: boolean;
  pointsAwarded: number;
  wasFirstCatch: boolean;
  species?: FishSpecies;
  progression: ProgressionState;
  unlocks: UnlockState;
}

export interface ProgressionApplyResult {
  progression: ProgressionState;
  unlocks: UnlockState;
  reward: XpRewardBreakdown;
  levelUps: number;
  newlyUnlocked: WaterId[];
  messages: string[];
}

export class ProgressionSystem {
  applyCatchXp(input: ApplyCatchXpInput): ProgressionApplyResult {
    const reward = calculateCatchXpReward({
      pointsAwarded: input.pointsAwarded,
      isFirstCatch: input.wasFirstCatch,
      isRareCatch: input.species?.rarity === "rare"
    });

    const unlockedSet = new Set<WaterId>(input.unlocks.unlockedWaters);
    const progression: ProgressionState = {
      level: input.progression.level,
      xp: input.progression.xp,
      xpToNext: input.progression.xpToNext
    };
    const messages: string[] = [];
    const newlyUnlocked: WaterId[] = [];

    if (!input.success) {
      return {
        progression,
        unlocks: { unlockedWaters: Array.from(unlockedSet), newlyUnlocked: [] },
        reward: { ...reward, total: 0, base: 0, firstCatchBonus: 0, rareBonus: 0 },
        levelUps: 0,
        newlyUnlocked: [],
        messages
      };
    }

    let gained = reward.total;
    let levelUps = 0;

    while (gained > 0 && progression.level < MAX_LEVEL) {
      const required = progression.xpToNext > 0 ? progression.xpToNext : getXpToNext(progression.level);
      const missing = Math.max(1, required - progression.xp);
      if (gained < missing) {
        progression.xp += gained;
        gained = 0;
        break;
      }

      gained -= missing;
      progression.level += 1;
      progression.xp = 0;
      progression.xpToNext = progression.level >= MAX_LEVEL ? 0 : getXpToNext(progression.level);
      levelUps += 1;
      messages.push(`Nivå upp! Albanus nådde nivå ${progression.level}.`);
    }

    if (progression.level >= MAX_LEVEL) {
      progression.level = MAX_LEVEL;
      progression.xp = 0;
      progression.xpToNext = 0;
    }

    for (const rule of UNLOCK_RULES) {
      if (progression.level >= rule.requiredLevel && !unlockedSet.has(rule.waterId)) {
        unlockedSet.add(rule.waterId);
        newlyUnlocked.push(rule.waterId);
        messages.push(`Nytt vatten upplåst: ${rule.nameSv}.`);
      }
    }

    return {
      progression,
      unlocks: {
        unlockedWaters: Array.from(unlockedSet),
        newlyUnlocked
      },
      reward,
      levelUps,
      newlyUnlocked,
      messages
    };
  }

  getLevelModifiers(level: number): LevelModifiers {
    return getLevelModifiers(level);
  }
}
