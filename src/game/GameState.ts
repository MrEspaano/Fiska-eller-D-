import type { FishingResult, SaveState } from "./types";
import { BuffSystem } from "./systems/BuffSystem";
import { CatchLimitSystem } from "./systems/CatchLimitSystem";
import { CookingSystem, type CookSource } from "./systems/CookingSystem";
import { FreezerSystem } from "./systems/FreezerSystem";
import { SaveSystem } from "./systems/SaveSystem";

export class GameState {
  readonly saveSystem = new SaveSystem();
  readonly buffSystem = new BuffSystem();
  readonly catchLimitSystem = new CatchLimitSystem();
  readonly freezerSystem = new FreezerSystem();
  readonly cookingSystem = new CookingSystem();
  state: SaveState;
  lastMessage = "Välkommen till sjön.";

  constructor() {
    this.state = this.saveSystem.load();
  }

  persist(): void {
    this.saveSystem.save(this.state);
  }

  canFish(): boolean {
    return this.catchLimitSystem.canCatch(this.state.inventory);
  }

  applyFishingResult(result: FishingResult): void {
    this.lastMessage = result.message;
    if (!result.success || !result.fishId) {
      this.persist();
      return;
    }

    this.state.score += result.pointsAwarded;
    this.state.inventory.carriedCount += 1;
    this.state.inventory.carriedBySpecies[result.fishId] = (this.state.inventory.carriedBySpecies[result.fishId] ?? 0) + 1;

    const log = this.state.speciesLog[result.fishId] ?? { discovered: false, maxPoints: 0, count: 0 };
    this.state.speciesLog[result.fishId] = {
      discovered: true,
      maxPoints: Math.max(log.maxPoints, result.pointsAwarded),
      count: log.count + 1
    };

    if (!this.canFish()) {
      this.lastMessage = "Du bär 15 fiskar. Gå till stugan och lägg i frysen.";
    }

    this.persist();
  }

  depositAllToFreezer(): string {
    const res = this.freezerSystem.depositAll(this.state.inventory, this.state.freezer);
    this.state.inventory = res.inventory;
    this.state.freezer = res.freezer;
    this.persist();

    if (res.moved === 0) {
      this.lastMessage = "Du har ingen fisk att lägga in.";
    } else {
      this.lastMessage = `${res.moved} fisk(ar) lades i frysen.`;
    }
    return this.lastMessage;
  }

  cook(speciesId: string, source: CookSource, now: number): string {
    const res = this.cookingSystem.cook(speciesId, source, this.state.inventory, this.state.freezer, this.state.buffState, now);
    this.state.inventory = res.inventory;
    this.state.freezer = res.freezer;
    this.state.buffState = res.buffState;
    this.lastMessage = res.message;
    this.persist();
    return res.message;
  }

  tick(now: number): void {
    const normalized = this.buffSystem.normalize(this.state.buffState, now);
    if (normalized.stacks !== this.state.buffState.stacks || normalized.expiresAt !== this.state.buffState.expiresAt) {
      this.state.buffState = normalized;
      this.persist();
    }
  }

  currentBuffStacks(now: number): number {
    return this.buffSystem.getActiveStacks(this.state.buffState, now);
  }

  setSoundOn(soundOn: boolean): void {
    this.state.settings.soundOn = soundOn;
    this.persist();
  }

  setMusicVolume(musicVolume: number): void {
    this.state.settings.musicVolume = Math.max(0, Math.min(100, Math.round(musicVolume / 5) * 5));
    this.persist();
  }

  setSfxVolume(sfxVolume: number): void {
    this.state.settings.sfxVolume = Math.max(0, Math.min(100, Math.round(sfxVolume / 5) * 5));
    this.persist();
  }
}
