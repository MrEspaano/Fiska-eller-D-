import type {
  LevelModifiers,
  ProgressionState,
  UnlockRule,
  UnlockState,
  WaterId,
  XpRewardBreakdown
} from "../types";

export const MAX_LEVEL = 20;
export const START_UNLOCKED_WATERS: WaterId[] = ["lake", "river"];

const XP_TO_NEXT_BY_LEVEL: number[] = [
  80, 95, 110, 130, 150,
  170, 190, 215, 240, 270,
  300, 335, 370, 410, 450,
  495, 545, 600, 660, 0
];

export const UNLOCK_RULES: UnlockRule[] = [
  { waterId: "skogstjarn", requiredLevel: 4, nameSv: "Skogstjärnen" },
  { waterId: "klippsjon", requiredLevel: 8, nameSv: "Klippsjön" },
  { waterId: "myrkanal", requiredLevel: 12, nameSv: "Myrkanalen" }
];

export const BASE_XP_PER_CATCH = 22;
export const FIRST_CATCH_BONUS = 40;
export const RARE_CATCH_BONUS = 28;

export function getXpToNext(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return XP_TO_NEXT_BY_LEVEL[clamped - 1] ?? 0;
}

export function createDefaultProgressionState(): ProgressionState {
  return {
    level: 1,
    xp: 0,
    xpToNext: getXpToNext(1)
  };
}

export function createDefaultUnlockState(): UnlockState {
  return {
    unlockedWaters: [...START_UNLOCKED_WATERS]
  };
}

export function clampProgressionState(state: Partial<ProgressionState> | undefined): ProgressionState {
  const defaults = createDefaultProgressionState();
  if (!state) {
    return defaults;
  }

  const level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(state.level ?? defaults.level)));
  const xpToNext = level >= MAX_LEVEL ? 0 : getXpToNext(level);
  const xp = Math.max(0, Math.floor(state.xp ?? defaults.xp));
  return {
    level,
    xp: xpToNext > 0 ? Math.min(xp, xpToNext) : 0,
    xpToNext
  };
}

export function normalizeUnlockState(state: Partial<UnlockState> | undefined): UnlockState {
  const merged = new Set<WaterId>(START_UNLOCKED_WATERS);
  for (const waterId of state?.unlockedWaters ?? []) {
    merged.add(waterId);
  }

  return {
    unlockedWaters: Array.from(merged)
  };
}

export function calculateCatchXpReward(input: {
  pointsAwarded: number;
  isFirstCatch: boolean;
  isRareCatch: boolean;
}): XpRewardBreakdown {
  const base = BASE_XP_PER_CATCH + Math.max(0, Math.round(input.pointsAwarded * 0.08));
  const firstCatchBonus = input.isFirstCatch ? FIRST_CATCH_BONUS : 0;
  const rareBonus = input.isRareCatch ? RARE_CATCH_BONUS : 0;
  return {
    base,
    firstCatchBonus,
    rareBonus,
    total: base + firstCatchBonus + rareBonus
  };
}

export function getNextUnlock(level: number, unlockedWaters: WaterId[]): UnlockRule | null {
  const unlocked = new Set(unlockedWaters);
  return UNLOCK_RULES.find((rule) => !unlocked.has(rule.waterId) && level < rule.requiredLevel) ?? null;
}

export function getUnlockRuleForWater(waterId: WaterId): UnlockRule | null {
  return UNLOCK_RULES.find((rule) => rule.waterId === waterId) ?? null;
}

export function getLevelModifiers(level: number): LevelModifiers {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, level));
  const steps = clamped - 1;
  return {
    catchChanceBonus: Math.min(0.08, steps * 0.004),
    castStabilityBonus: Math.min(0.12, steps * 0.006)
  };
}
