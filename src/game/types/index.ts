export type WaterId = "lake" | "river" | "skogstjarn" | "klippsjon" | "myrkanal";

export type ZoneId = "reed_edge" | "general" | "deep_center" | "river_run";

export type FacingDirection = "up" | "down" | "left" | "right";

export type FishingPhase = "idle" | "casting" | "waiting" | "bite_window" | "resolve" | "cooldown";

export type ShadowFishShape = "slim" | "normal" | "wide";

export interface Point {
  x: number;
  y: number;
}

export interface RectZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HouseLayout {
  bounds: RectZone;
  doorTrigger: RectZone;
  doorPosition: Point;
}

export interface UnlockGateLayout {
  waterId: WaterId;
  lockedArea: RectZone;
  barrier: RectZone;
  signPosition: Point;
  markerPosition: Point;
}

export interface InteractionZones {
  freezer: RectZone;
  stove: RectZone;
  exit: RectZone;
}

export interface CabinCollisionLayout {
  furnitureBlocks: RectZone[];
}

export interface DynamicCastZone {
  waterId: WaterId;
  center: Point;
  radius: number;
  visible: boolean;
  autoCenter?: Point;
  aimCenter?: Point | null;
  isAiming?: boolean;
}

export interface DockPlacement {
  waterId: WaterId;
  rect: RectZone;
  boatSpawn: Point;
  boardPoint: Point;
}

export interface BoatState {
  onBoat: boolean;
  position: Point;
  currentWaterId: WaterId | null;
}

export interface NpcPlacement {
  id: string;
  x: number;
  y: number;
  facing: FacingDirection;
  variant: number;
}

export interface FishVisualProfile {
  baseColor: string;
  patternColor: string;
  finColor: string;
  bodyType: ShadowFishShape;
}

export interface FishSpecies {
  id: string;
  nameSv: string;
  points: number;
  rarity: "common" | "uncommon" | "rare";
  allowedWaters: WaterId[];
  zoneWeights: Partial<Record<ZoneId, number>>;
  visualProfile: FishVisualProfile;
}

export interface ZoneDefinition {
  id: ZoneId;
  polygon: Point[];
}

export interface WaterBody {
  id: WaterId;
  kind: "lake" | "river";
  polygon: Point[];
  zoneDefs: ZoneDefinition[];
  fishableAreas: Point[];
}

export interface ShadowFish {
  id: string;
  speciesId: string;
  waterId: WaterId;
  position: Point;
  patrolPath: Point[];
  pathIndex: number;
  ttl: number;
  size: 0.8 | 1 | 1.2;
  heading: number;
  wobblePhase: number;
  shape: ShadowFishShape;
  lengthPx: number;
}

export interface FishingAttempt {
  waterId: WaterId;
  zoneId: ZoneId;
  castPoint: Point;
  nearShadowId?: string;
}

export interface FishingSession {
  phase: FishingPhase;
  castPoint: Point;
  attempt: FishingAttempt;
  startedAt: number;
  castEndsAt: number;
  waitUntil: number;
  biteUntil: number;
  cooldownUntil: number;
  nearShadowId?: string;
  nearShadowSpeciesId?: string;
  lockedMovement: boolean;
}

export interface FishingResult {
  success: boolean;
  fishId?: string;
  pointsAwarded: number;
  message: string;
  consumedShadowId?: string;
}

export interface InventoryState {
  carriedCount: number;
  carriedBySpecies: Record<string, number>;
}

export interface FreezerState {
  bySpecies: Record<string, number>;
}

export interface BuffState {
  stacks: number;
  expiresAt: number;
}

export interface SpeciesLogEntry {
  discovered: boolean;
  maxPoints: number;
  count: number;
}

export interface ProgressionState {
  level: number;
  xp: number;
  xpToNext: number;
}

export interface UnlockRule {
  waterId: WaterId;
  requiredLevel: number;
  nameSv: string;
}

export interface XpRewardBreakdown {
  base: number;
  firstCatchBonus: number;
  rareBonus: number;
  total: number;
}

export interface UnlockState {
  unlockedWaters: WaterId[];
  newlyUnlocked?: WaterId[];
}

export interface LevelModifiers {
  catchChanceBonus: number;
  castStabilityBonus: number;
}

export interface SaveState {
  score: number;
  speciesLog: Record<string, SpeciesLogEntry>;
  freezer: FreezerState;
  inventory: InventoryState;
  progression: ProgressionState;
  unlocks: UnlockState;
  settings: {
    soundOn: boolean;
    musicVolume: number;
    sfxVolume: number;
  };
  buffState: BuffState;
}
