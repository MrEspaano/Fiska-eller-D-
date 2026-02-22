import Phaser from "phaser";
import { getSpeciesById } from "../data/fish";
import {
  CAMPFIRES,
  DOCKS,
  HOUSE_LAYOUT,
  WORLD_H,
  WORLD_H_TILES,
  WORLD_NPCS,
  WORLD_W,
  WORLD_W_TILES,
  isPointInRect,
  pointFromTile
} from "../data/layout";
import { TILE_SIZE, WATER_BODIES, distance, pointInPolygon } from "../data/waters";
import { GameState } from "../GameState";
import {
  CAST_MS,
  FishingSystem,
  type FishingSessionEvent
} from "../systems/FishingSystem";
import { InputSystem } from "../systems/InputSystem";
import { PlayerSpriteSystem } from "../systems/PlayerSpriteSystem";
import { ShadowFishSystem } from "../systems/ShadowFishSystem";
import type { BoatState, DynamicCastZone, FacingDirection, FishingSession, NpcPlacement, Point, ShadowFish, WaterId } from "../types";
import { CatchScene } from "../ui/CatchScene";
import { FreezerPanel } from "../ui/FreezerPanel";
import { Hud } from "../ui/Hud";
import { SpawnValidationSystem } from "../systems/SpawnValidationSystem";
import { CastZoneSystem } from "../systems/CastZoneSystem";
import { BoatSystem } from "../systems/BoatSystem";
import { getRoundedLineOrigin } from "../systems/FishingLineSystem";
import { AudioSystem } from "../systems/AudioSystem";
import { MenuOverlay, type MenuMode } from "../ui/MenuOverlay";
import { shouldHandleWorldAction, shouldOpenWorldPauseMenu } from "../ui/menuGuards";

const PLAYER_SPEED = 180;
const CAMERA_TARGET_TILES_X = 18;
const CAMERA_TARGET_TILES_Y = 10;

interface CampfireFlame {
  center: Point;
  glow: Phaser.GameObjects.Ellipse;
  flameOuter: Phaser.GameObjects.Ellipse;
  flameMid: Phaser.GameObjects.Ellipse;
  flameCore: Phaser.GameObjects.Ellipse;
  ember: Phaser.GameObjects.Ellipse;
  spark: Phaser.GameObjects.Rectangle;
  flickerOffset: number;
}

export class WorldScene extends Phaser.Scene {
  private player!: PlayerSpriteSystem;
  private inputSystem!: InputSystem;
  private hud!: Hud;
  private catchOverlay!: CatchScene;
  private freezerPanel!: FreezerPanel;
  private menu!: MenuOverlay;
  private audio!: AudioSystem;
  private menuOpen = false;
  private menuMode: MenuMode = "boot";

  private fishingSystem = new FishingSystem();
  private shadows = new ShadowFishSystem();
  private spawnValidation = new SpawnValidationSystem();
  private castZoneSystem = new CastZoneSystem();
  private boatSystem = new BoatSystem();

  private state!: GameState;

  private message = "Utforska världen och hitta bra kastplatser.";
  private facing: FacingDirection = "down";

  private shadowGraphics!: Phaser.GameObjects.Graphics;
  private castZoneGraphics!: Phaser.GameObjects.Graphics;
  private fishingVfxGraphics!: Phaser.GameObjects.Graphics;
  private boatGraphics!: Phaser.GameObjects.Graphics;
  private boatFrontGraphics!: Phaser.GameObjects.Graphics;
  private houseDoorGlow!: Phaser.GameObjects.Rectangle;
  private campfireFlames: CampfireFlame[] = [];

  private baseGroundLayer!: Phaser.GameObjects.Layer;
  private shorelineLayer!: Phaser.GameObjects.Layer;
  private decorLayer!: Phaser.GameObjects.Layer;
  private entityLayer!: Phaser.GameObjects.Layer;

  private waterPolygons: Phaser.Geom.Polygon[] = [];
  private waterTileMask = new Set<string>();
  private pathTiles = new Set<string>();

  private readonly terrainTextureKeys = {
    grass: Array.from({ length: 8 }, (_, idx) => `tile-grass-${idx}`),
    road: Array.from({ length: 6 }, (_, idx) => `tile-road-${idx}`),
    shore: Array.from({ length: 4 }, (_, idx) => `tile-shore-${idx}`),
    water: Array.from({ length: 4 }, (_, idx) => `tile-water-${idx}`),
    dock: Array.from({ length: 4 }, (_, idx) => `tile-dock-${idx}`)
  };

  private dynamicCastZone: DynamicCastZone = {
    waterId: "lake",
    center: { x: 0, y: 0 },
    radius: 30,
    visible: false,
    autoCenter: { x: 0, y: 0 },
    aimCenter: null,
    isAiming: false
  };
  private manualAimPoint: Point | null = null;
  private isCastZoneArmed = false;

  private activeFishing: FishingSession | null = null;

  private boatState: BoatState = this.boatSystem.createInitialState();
  private boatPositions: Record<WaterId, Point> = {
    lake: this.boatSystem.getBoatSpawn("lake"),
    river: this.boatSystem.getBoatSpawn("river")
  };

  constructor() {
    super("WorldScene");
  }

  create(): void {
    this.state = this.registry.get("gameState") as GameState;
    this.audio = this.registry.get("audioSystem") as AudioSystem;
    this.audio.applySettings(this.state.state.settings);
    const root = document.getElementById("app");
    if (!root) {
      throw new Error("#app saknas");
    }

    this.createRenderLayers();
    this.ensureTileTextures();
    this.drawDetailedWorld();

    this.player = new PlayerSpriteSystem(this, 8 * TILE_SIZE, 12 * TILE_SIZE, 12);

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.container, true, 0.18, 0.18, 0, 0);
    const zoomByWidth = this.cameras.main.width / (TILE_SIZE * CAMERA_TARGET_TILES_X);
    const zoomByHeight = this.cameras.main.height / (TILE_SIZE * CAMERA_TARGET_TILES_Y);
    this.cameras.main.setZoom(Math.min(zoomByWidth, zoomByHeight));
    this.cameras.main.setRoundPixels(true);

    this.inputSystem = new InputSystem(this, root);
    this.hud = new Hud(root);
    this.catchOverlay = new CatchScene(root);
    this.freezerPanel = new FreezerPanel(root, {
      onDepositAll: () => {
        this.message = this.state.depositAllToFreezer();
        this.freezerPanel.render(this.state.state.inventory, this.state.state.freezer);
      },
      onCookFresh: (speciesId) => {
        this.message = this.state.cook(speciesId, "fresh", Date.now());
        this.freezerPanel.render(this.state.state.inventory, this.state.state.freezer);
      },
      onCookFrozen: (speciesId) => {
        this.message = this.state.cook(speciesId, "freezer", Date.now());
        this.freezerPanel.render(this.state.state.inventory, this.state.state.freezer);
      },
      onClose: () => this.freezerPanel.hide()
    });

    this.menu = new MenuOverlay(root, {
      onStartOrResume: () => {
        this.registry.set("hasStartedGame", true);
        this.audio.unlock();
        this.audio.startMusic();
        this.audio.playSfx("ui_confirm");
        this.message = "Lycka till där ute.";
        this.closeMenu();
      },
      onExitToMenu: () => {
        this.registry.set("hasStartedGame", false);
        this.audio.playSfx("ui_back");
        this.audio.stopMusic();
        this.catchOverlay.hide();
        this.freezerPanel.hide();
        this.resetFishingSession();
        this.openMenu("boot", "Tillbaka i startmenyn.");
      },
      onClose: () => {
        if (this.menuMode === "pause") {
          this.audio.playSfx("ui_back");
          this.closeMenu();
        }
      },
      onSoundOnChange: (value) => {
        this.state.setSoundOn(value);
        this.audio.setEnabled(value);
      },
      onMusicVolumeChange: (value) => {
        this.state.setMusicVolume(value);
        this.audio.setMusicVolume(this.state.state.settings.musicVolume);
      },
      onSfxVolumeChange: (value) => {
        this.state.setSfxVolume(value);
        this.audio.setSfxVolume(this.state.state.settings.sfxVolume);
      },
      getSettings: () => this.state.state.settings,
      onNavigate: () => this.audio.playSfx("ui_move"),
      onConfirm: () => this.audio.playSfx("ui_confirm"),
      onBack: () => this.audio.playSfx("ui_back")
    });

    this.shadowGraphics = this.add.graphics();
    this.castZoneGraphics = this.add.graphics();
    this.fishingVfxGraphics = this.add.graphics();
    this.boatGraphics = this.add.graphics();
    this.boatFrontGraphics = this.add.graphics();
    this.castZoneGraphics.setDepth(22);
    this.shadowGraphics.setDepth(6);
    this.fishingVfxGraphics.setDepth(23);
    this.boatGraphics.setDepth(9);
    this.boatFrontGraphics.setDepth(13);

    this.shadows.initialize(this.time.now);

    this.events.on("resume", () => {
      this.message = this.state.lastMessage;
      this.resetFishingSession();
    });

    const hasStartedGame = Boolean(this.registry.get("hasStartedGame"));
    if (hasStartedGame) {
      this.audio.startMusic();
      this.closeMenu();
    } else {
      this.audio.stopMusic();
      this.openMenu("boot", "Startmeny öppen.");
    }

    this.events.once("shutdown", () => {
      this.menu.destroy();
    });
    this.events.once("destroy", () => {
      this.menu.destroy();
    });
  }

  update(_: number, delta: number): void {
    const now = Date.now();

    if (
      shouldOpenWorldPauseMenu(
        this.menuOpen,
        this.catchOverlay.isOpen(),
        this.freezerPanel.isOpen(),
        this.inputSystem.consumeMenuToggle()
      )
    ) {
      this.openMenu("pause", "Pausmeny öppen.");
      return;
    }

    if (this.menuOpen) {
      this.player.setMode(this.boatState.onBoat ? "boat_sit" : "idle");
      this.player.update(delta);
      this.updateCampfires(now);
      this.drawShadows();
      this.drawBoats();
      this.drawCastZone(now);
      this.drawFishingVfx(now);
      this.updateDoorGlow(now);
      this.cameras.main.setScroll(Math.round(this.cameras.main.scrollX), Math.round(this.cameras.main.scrollY));
      this.hud.render(this.state.state, this.message, this.state.state.buffState);
      return;
    }

    this.state.tick(now);
    this.shadows.update(delta, this.time.now);

    const move = this.inputSystem.getMoveVector();
    const isMoving = Math.abs(move.x) > 0.1 || Math.abs(move.y) > 0.1;

    if (isMoving && !this.isMovementLocked()) {
      this.updateFacing(move);

      if (this.boatState.onBoat && this.boatState.currentWaterId) {
        this.boatState.position = this.boatSystem.moveBoat(
          this.boatState.position,
          this.boatState.currentWaterId,
          move.x,
          move.y,
          delta,
          165
        );
        this.boatPositions[this.boatState.currentWaterId] = { ...this.boatState.position };
        this.player.setPosition(this.boatState.position.x, this.boatState.position.y + 1);
      } else {
        this.tryMove(move.x, move.y, delta);
      }
    }

    this.refreshDynamicCastZone();
    this.tickFishingSession(now);
    this.updatePlayerAnimation(isMoving, delta);
    this.updateCampfires(now);

    this.drawShadows();
    this.drawBoats();
    this.drawCastZone(now);
    this.drawFishingVfx(now);
    this.updateDoorGlow(now);
    this.cameras.main.setScroll(Math.round(this.cameras.main.scrollX), Math.round(this.cameras.main.scrollY));

    if (
      shouldHandleWorldAction(
        this.menuOpen,
        this.catchOverlay.isOpen(),
        this.freezerPanel.isOpen(),
        this.inputSystem.consumeAction()
      )
    ) {
      this.handleAction(now);
    }

    this.hud.render(this.state.state, this.message, this.state.state.buffState);
  }

  private drawDetailedWorld(): void {
    this.addToLayer(this.baseGroundLayer, this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x476a43));
    this.drawGrassLayer();
    this.drawWaterLayer();
    this.drawPathLayer();
    this.drawDocks();
    this.drawNatureProps();
    this.drawHouse();
    this.drawCampfires();
    this.drawNpcs();
  }

  private createRenderLayers(): void {
    this.baseGroundLayer = this.add.layer().setDepth(-40);
    this.shorelineLayer = this.add.layer().setDepth(-30);
    this.decorLayer = this.add.layer().setDepth(-20);
    this.entityLayer = this.add.layer().setDepth(-10);
  }

  private addToLayer<T extends Phaser.GameObjects.GameObject>(layer: Phaser.GameObjects.Layer, object: T): T {
    layer.add(object);
    return object;
  }

  private ensureTileTextures(): void {
    if (this.textures.exists(this.terrainTextureKeys.grass[0])) {
      return;
    }

    for (let i = 0; i < this.terrainTextureKeys.grass.length; i += 1) {
      this.createGrassTexture(this.terrainTextureKeys.grass[i], i);
    }
    for (let i = 0; i < this.terrainTextureKeys.road.length; i += 1) {
      this.createRoadTexture(this.terrainTextureKeys.road[i], i);
    }
    for (let i = 0; i < this.terrainTextureKeys.shore.length; i += 1) {
      this.createShoreTexture(this.terrainTextureKeys.shore[i], i);
    }
    for (let i = 0; i < this.terrainTextureKeys.water.length; i += 1) {
      this.createWaterTexture(this.terrainTextureKeys.water[i], i);
    }
    for (let i = 0; i < this.terrainTextureKeys.dock.length; i += 1) {
      this.createDockTexture(this.terrainTextureKeys.dock[i], i);
    }
  }

  private createGrassTexture(key: string, variant: number): void {
    this.createTileTexture(key, (g) => {
      const rand = this.seededNoise(1100 + variant * 31);
      const basePalette = [0x587a49, 0x5f834f, 0x547446, 0x638856, 0x4f6f42, 0x688d58];
      const shadePalette = [0x6f965f, 0x46653b, 0x7aa265];
      const pebblePalette = [0x7e8f70, 0x8d9a76];

      g.fillStyle(basePalette[variant % basePalette.length], 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      for (let i = 0; i < 30; i += 1) {
        const color = shadePalette[i % shadePalette.length];
        const w = rand() > 0.72 ? 2 : 1;
        const h = rand() > 0.8 ? 2 : 1;
        g.fillStyle(color, 0.45 + rand() * 0.3);
        g.fillRect(Math.floor(rand() * 31), Math.floor(rand() * 31), w, h);
      }

      for (let i = 0; i < 4; i += 1) {
        const x = 3 + Math.floor(rand() * 24);
        const y = 4 + Math.floor(rand() * 24);
        g.fillStyle(0x7ea867, 0.7);
        g.fillRect(x, y, 1, 4);
        g.fillRect(x + 1, y + 1, 1, 2);
      }

      for (let i = 0; i < 3; i += 1) {
        g.fillStyle(pebblePalette[i % pebblePalette.length], 0.55);
        g.fillRect(2 + Math.floor(rand() * 27), 2 + Math.floor(rand() * 27), 1 + (i % 2), 1);
      }
    });
  }

  private createRoadTexture(key: string, variant: number): void {
    this.createTileTexture(key, (g) => {
      const rand = this.seededNoise(2100 + variant * 43);
      const basePalette = [0xc4b07b, 0xbeaa74, 0xbca772, 0xcbb884];
      g.fillStyle(basePalette[variant % basePalette.length], 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      for (let i = 0; i < 22; i += 1) {
        const color = i % 2 === 0 ? 0xaa915f : 0xd5c28d;
        g.fillStyle(color, 0.4 + rand() * 0.35);
        const w = rand() > 0.6 ? 2 : 1;
        g.fillRect(Math.floor(rand() * 31), Math.floor(rand() * 31), w, 1);
      }

      for (let i = 0; i < 4; i += 1) {
        g.fillStyle(0x8f7850, 0.62);
        g.fillRect(2 + Math.floor(rand() * 28), 3 + Math.floor(rand() * 26), 1, 1);
      }
    });
  }

  private createShoreTexture(key: string, variant: number): void {
    this.createTileTexture(key, (g) => {
      const rand = this.seededNoise(3100 + variant * 29);
      const sand = [0xc8b67e, 0xd2c28e, 0xbeab74, 0xd8c994][variant % 4];
      g.fillStyle(sand, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      for (let y = 20; y < TILE_SIZE; y += 2) {
        g.fillStyle(0x9f8b61, 0.2 + ((y - 20) / 14) * 0.25);
        g.fillRect(0, y, TILE_SIZE, 1);
      }

      for (let i = 0; i < 16; i += 1) {
        g.fillStyle(i % 2 === 0 ? 0xa28d62 : 0xe1d4ab, 0.3 + rand() * 0.28);
        g.fillRect(Math.floor(rand() * 31), Math.floor(rand() * 31), 1, 1);
      }
    });
  }

  private createWaterTexture(key: string, variant: number): void {
    this.createTileTexture(key, (g) => {
      const rand = this.seededNoise(4100 + variant * 17);
      const water = [0x5b8f98, 0x548892, 0x5f939c, 0x567f89][variant % 4];
      g.fillStyle(water, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      for (let i = 0; i < 20; i += 1) {
        const color = i % 2 === 0 ? 0x71a8b3 : 0x3d6670;
        g.fillStyle(color, 0.24 + rand() * 0.3);
        const w = rand() > 0.6 ? 3 : 2;
        g.fillRect(Math.floor(rand() * 28), Math.floor(rand() * 28), w, 1);
      }

      for (let i = 0; i < 5; i += 1) {
        g.fillStyle(0x80b6c2, 0.3);
        g.fillRect(2 + Math.floor(rand() * 27), 2 + Math.floor(rand() * 27), 1, 1);
      }
    });
  }

  private createDockTexture(key: string, variant: number): void {
    this.createTileTexture(key, (g) => {
      const rand = this.seededNoise(5100 + variant * 13);
      const wood = [0xb79c68, 0xae9564, 0xbea877, 0xa58859][variant % 4];
      g.fillStyle(wood, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      for (let y = 3; y < TILE_SIZE; y += 6) {
        g.fillStyle(0x8f7750, 0.6);
        g.fillRect(0, y, TILE_SIZE, 1);
      }

      for (let i = 0; i < 8; i += 1) {
        g.fillStyle(0x786242, 0.75);
        g.fillRect(2 + Math.floor(rand() * 27), 2 + Math.floor(rand() * 27), 1, 1);
      }
    });
  }

  private createTileTexture(key: string, painter: (graphics: Phaser.GameObjects.Graphics) => void): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    painter(g);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  private seededNoise(seed: number): () => number {
    let v = (seed ^ 0x9e3779b9) >>> 0;
    return () => {
      v = (v * 1664525 + 1013904223) >>> 0;
      return v / 0xffffffff;
    };
  }

  private placeTile(layer: Phaser.GameObjects.Layer, textureKey: string, tx: number, ty: number, alpha = 1): void {
    this.addToLayer(
      layer,
      this.add.image(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2, textureKey).setAlpha(alpha)
    );
  }

  private drawGrassLayer(): void {
    for (let y = 0; y < WORLD_H_TILES; y += 1) {
      for (let x = 0; x < WORLD_W_TILES; x += 1) {
        const idx = (x * 19 + y * 31 + x * y * 5) % this.terrainTextureKeys.grass.length;
        this.placeTile(this.baseGroundLayer, this.terrainTextureKeys.grass[idx], x, y);
      }
    }
  }

  private drawPathLayer(): void {
    this.pathTiles.clear();

    for (let y = 7; y <= 17; y += 1) {
      for (let x = 4; x <= 5; x += 1) {
        this.pathTiles.add(`${x},${y}`);
      }
    }

    for (let x = 5; x <= 25; x += 1) {
      this.pathTiles.add(`${x},17`);
      this.pathTiles.add(`${x},18`);
    }

    for (let x = 25; x <= 45; x += 1) {
      this.pathTiles.add(`${x},14`);
      this.pathTiles.add(`${x},15`);
    }

    const filteredPathTiles = new Set<string>();
    for (const key of this.pathTiles) {
      const [tx, ty] = key.split(",").map((v) => Number(v));
      if (this.isWaterTile(tx, ty)) {
        continue;
      }
      filteredPathTiles.add(key);
    }
    this.pathTiles = filteredPathTiles;

    for (const key of this.pathTiles) {
      const [tx, ty] = key.split(",").map((v) => Number(v));
      const idx = (tx * 7 + ty * 13 + tx * ty) % this.terrainTextureKeys.road.length;
      this.placeTile(this.shorelineLayer, this.terrainTextureKeys.road[idx], tx, ty);
    }
  }

  private drawWaterLayer(): void {
    this.waterPolygons = [];
    for (const water of WATER_BODIES) {
      this.waterPolygons.push(new Phaser.Geom.Polygon(water.polygon.map((p) => new Phaser.Geom.Point(p.x, p.y))));
    }

    this.waterTileMask.clear();
    for (let y = 0; y < WORLD_H_TILES; y += 1) {
      for (let x = 0; x < WORLD_W_TILES; x += 1) {
        const center = { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
        const water = WATER_BODIES.find((w) => pointInPolygon(center, w.polygon));
        if (!water) {
          continue;
        }

        this.waterTileMask.add(`${x},${y}`);
        const idx = (x * 11 + y * 17 + x * y) % this.terrainTextureKeys.water.length;
        this.placeTile(this.shorelineLayer, this.terrainTextureKeys.water[idx], x, y);

        const deepZone = water.zoneDefs.find((z) => z.id === "deep_center" || z.id === "river_run");
        if (deepZone && pointInPolygon(center, deepZone.polygon)) {
          this.addToLayer(
            this.shorelineLayer,
            this.add.rectangle(center.x, center.y, TILE_SIZE, TILE_SIZE, 0x2d535b, 0.42)
          );
        }

        const reedZone = water.zoneDefs.find((z) => z.id === "reed_edge");
        if (reedZone && pointInPolygon(center, reedZone.polygon)) {
          this.addToLayer(
            this.shorelineLayer,
            this.add.rectangle(center.x, center.y, TILE_SIZE, TILE_SIZE, 0x678160, 0.12)
          );
        }
      }
    }

    for (let y = 0; y < WORLD_H_TILES; y += 1) {
      for (let x = 0; x < WORLD_W_TILES; x += 1) {
        if (this.isWaterTile(x, y)) {
          this.drawWaterTileEdge(x, y);
          continue;
        }

        if (this.hasAdjacentWater(x, y)) {
          const idx = (x * 5 + y * 7 + x * y) % this.terrainTextureKeys.shore.length;
          this.placeTile(this.shorelineLayer, this.terrainTextureKeys.shore[idx], x, y, 0.75);
        }
      }
    }
  }

  private drawWaterTileEdge(tx: number, ty: number): void {
    const px = tx * TILE_SIZE;
    const py = ty * TILE_SIZE;

    if (!this.isWaterTile(tx, ty - 1)) {
      this.addToLayer(this.shorelineLayer, this.add.rectangle(px + 16, py + 2, TILE_SIZE - 2, 3, 0x79b3be, 0.55));
    }
    if (!this.isWaterTile(tx + 1, ty)) {
      this.addToLayer(this.shorelineLayer, this.add.rectangle(px + 30, py + 16, 3, TILE_SIZE - 3, 0x2f5862, 0.62));
    }
    if (!this.isWaterTile(tx, ty + 1)) {
      this.addToLayer(this.shorelineLayer, this.add.rectangle(px + 16, py + 30, TILE_SIZE - 2, 3, 0x2f5862, 0.62));
    }
    if (!this.isWaterTile(tx - 1, ty)) {
      this.addToLayer(this.shorelineLayer, this.add.rectangle(px + 2, py + 16, 3, TILE_SIZE - 3, 0x79b3be, 0.4));
    }
  }

  private isWaterTile(tx: number, ty: number): boolean {
    return this.waterTileMask.has(`${tx},${ty}`);
  }

  private hasAdjacentWater(tx: number, ty: number): boolean {
    return this.isWaterTile(tx + 1, ty)
      || this.isWaterTile(tx - 1, ty)
      || this.isWaterTile(tx, ty + 1)
      || this.isWaterTile(tx, ty - 1)
      || this.isWaterTile(tx + 1, ty + 1)
      || this.isWaterTile(tx + 1, ty - 1)
      || this.isWaterTile(tx - 1, ty + 1)
      || this.isWaterTile(tx - 1, ty - 1);
  }

  private drawDocks(): void {
    for (const dock of DOCKS) {
      const tileXStart = Math.floor(dock.rect.x / TILE_SIZE);
      const tileXEnd = Math.floor((dock.rect.x + dock.rect.width - 1) / TILE_SIZE);
      const tileYStart = Math.floor(dock.rect.y / TILE_SIZE);
      const tileYEnd = Math.floor((dock.rect.y + dock.rect.height - 1) / TILE_SIZE);

      for (let ty = tileYStart; ty <= tileYEnd; ty += 1) {
        for (let tx = tileXStart; tx <= tileXEnd; tx += 1) {
          const idx = (tx * 3 + ty * 9 + tx * ty) % this.terrainTextureKeys.dock.length;
          this.placeTile(this.shorelineLayer, this.terrainTextureKeys.dock[idx], tx, ty);
          this.addToLayer(
            this.decorLayer,
            this.add.rectangle(tx * TILE_SIZE + 8 + ((tx + ty) % 2) * 12, ty * TILE_SIZE + 9, 2, 2, 0x635238, 0.8)
          );
        }
      }

      const cx = dock.rect.x + dock.rect.width / 2;
      const py = dock.rect.y + dock.rect.height + 5;
      this.addToLayer(this.decorLayer, this.add.rectangle(cx, py, 6, 24, 0x5f4e37));
      this.addToLayer(this.decorLayer, this.add.rectangle(cx - 22, py, 6, 24, 0x5f4e37));
      this.addToLayer(this.decorLayer, this.add.rectangle(cx + 22, py, 6, 24, 0x5f4e37));

      this.addToLayer(this.decorLayer, this.add.ellipse(dock.boardPoint.x, dock.boardPoint.y + 6, 28, 9, 0x1c2427, 0.24));
      this.addToLayer(this.decorLayer, this.add.circle(dock.boardPoint.x, dock.boardPoint.y, 5, 0xe3cc79, 0.65));
      this.addToLayer(this.decorLayer, this.add.circle(dock.boardPoint.x, dock.boardPoint.y, 2, 0xf1e3b0, 0.8));
    }
  }

  private drawNatureProps(): void {
    for (let i = 0; i < 410; i += 1) {
      const tx = 1 + ((i * 11 + 7) % (WORLD_W_TILES - 2));
      const ty = 1 + ((i * 17 + 5) % (WORLD_H_TILES - 2));
      const key = `${tx},${ty}`;
      const point = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };

      if (this.pathTiles.has(key) || isPointInRect(point, HOUSE_LAYOUT.bounds) || isPointInRect(point, HOUSE_LAYOUT.doorTrigger)) {
        continue;
      }

      if (DOCKS.some((d) => isPointInRect(point, d.rect))) {
        continue;
      }

      if (this.isWaterTile(tx, ty) || this.hasAdjacentWater(tx, ty)) {
        continue;
      }

      const mode = i % 13;
      if (mode === 0 || mode === 1) {
        this.drawFlowerPatch(point);
      } else if (mode === 2 || mode === 3 || mode === 4) {
        this.drawBush(point);
      } else if (mode === 5) {
        this.drawRock(point);
      } else if (mode === 6) {
        this.drawReedLikeGrass(point);
      } else if (mode === 7) {
        this.drawFencePost(point);
      } else if (mode === 8) {
        this.drawTwig(point);
      } else if (mode === 9 || mode === 10) {
        this.drawSmallTree(point);
      } else if (mode === 11) {
        this.drawLargeTree(point);
      }
    }

    this.drawSign(pointFromTile(14, 11));
  }

  private drawFlowerPatch(point: Point): void {
    this.addToLayer(this.decorLayer, this.add.ellipse(point.x + 1, point.y + 8, 12, 5, 0x243026, 0.26));
    this.addToLayer(this.decorLayer, this.add.circle(point.x, point.y, 5, 0xd06f67, 0.88));
    this.addToLayer(this.decorLayer, this.add.circle(point.x + 5, point.y + 1, 4, 0xdb7a70, 0.8));
    this.addToLayer(this.decorLayer, this.add.circle(point.x - 4, point.y + 2, 3, 0xbe5f5a, 0.8));
    this.addToLayer(this.decorLayer, this.add.rectangle(point.x, point.y + 6, 4, 2, 0x3a5b35, 0.6));
  }

  private drawBush(point: Point): void {
    this.addToLayer(this.decorLayer, this.add.ellipse(point.x + 1, point.y + 10, 24, 9, 0x1e2a20, 0.32));
    this.addToLayer(this.entityLayer, this.add.circle(point.x, point.y + 1, 12, 0x3f6138));
    this.addToLayer(this.entityLayer, this.add.circle(point.x - 6, point.y + 3, 7, 0x527d47));
    this.addToLayer(this.entityLayer, this.add.circle(point.x + 7, point.y + 4, 6, 0x36592f));
    this.addToLayer(this.entityLayer, this.add.circle(point.x + 2, point.y - 4, 5, 0x4a7442, 0.9));
  }

  private drawRock(point: Point): void {
    this.addToLayer(this.decorLayer, this.add.ellipse(point.x + 1, point.y + 4, 12, 5, 0x20262b, 0.24));
    this.addToLayer(this.decorLayer, this.add.ellipse(point.x, point.y + 1, 10, 7, 0x69635b));
    this.addToLayer(this.decorLayer, this.add.ellipse(point.x - 2, point.y, 4, 2, 0x8f8679, 0.7));
  }

  private drawReedLikeGrass(point: Point): void {
    this.addToLayer(this.decorLayer, this.add.rectangle(point.x - 2, point.y + 2, 2, 8, 0x45693f));
    this.addToLayer(this.decorLayer, this.add.rectangle(point.x + 2, point.y + 1, 2, 9, 0x4b7343));
    this.addToLayer(this.decorLayer, this.add.rectangle(point.x + 5, point.y + 2, 2, 7, 0x3e6038));
  }

  private drawFencePost(point: Point): void {
    this.addToLayer(this.decorLayer, this.add.rectangle(point.x, point.y, 6, 10, 0x836648));
    this.addToLayer(this.decorLayer, this.add.rectangle(point.x, point.y - 4, 8, 2, 0xa3815a));
  }

  private drawTwig(point: Point): void {
    this.addToLayer(this.decorLayer, this.add.rectangle(point.x - 2, point.y + 2, 7, 2, 0x6f583b, 0.7));
    this.addToLayer(this.decorLayer, this.add.rectangle(point.x + 2, point.y, 4, 1, 0x856948, 0.68));
  }

  private drawSmallTree(point: Point): void {
    this.addToLayer(this.decorLayer, this.add.ellipse(point.x + 1, point.y + 12, 30, 10, 0x212b22, 0.3));
    this.addToLayer(this.entityLayer, this.add.rectangle(point.x, point.y + 9, 8, 14, 0x684a34));
    this.addToLayer(this.entityLayer, this.add.rectangle(point.x, point.y + 5, 10, 4, 0x77553b));
    this.addToLayer(this.entityLayer, this.add.circle(point.x, point.y - 4, 14, 0x3b6135));
    this.addToLayer(this.entityLayer, this.add.circle(point.x - 8, point.y - 1, 9, 0x4c7443));
    this.addToLayer(this.entityLayer, this.add.circle(point.x + 8, point.y, 8, 0x355a30));
    this.addToLayer(this.entityLayer, this.add.circle(point.x + 1, point.y - 9, 6, 0x4a7442, 0.85));
  }

  private drawLargeTree(point: Point): void {
    // Big canopy tree spanning multiple tiles for scale variation.
    this.addToLayer(this.decorLayer, this.add.ellipse(point.x + 2, point.y + 16, 46, 14, 0x1c251f, 0.34));

    this.addToLayer(this.entityLayer, this.add.rectangle(point.x, point.y + 14, 11, 19, 0x6b4d36));
    this.addToLayer(this.entityLayer, this.add.rectangle(point.x, point.y + 7, 15, 5, 0x7e5a3f));

    this.addToLayer(this.entityLayer, this.add.circle(point.x, point.y - 10, 18, 0x365c32));
    this.addToLayer(this.entityLayer, this.add.circle(point.x - 13, point.y - 6, 13, 0x47733f));
    this.addToLayer(this.entityLayer, this.add.circle(point.x + 14, point.y - 5, 12, 0x2f512d));
    this.addToLayer(this.entityLayer, this.add.circle(point.x - 3, point.y - 20, 11, 0x436d3d));
    this.addToLayer(this.entityLayer, this.add.circle(point.x + 8, point.y - 17, 9, 0x3c6437));

    this.addToLayer(this.entityLayer, this.add.circle(point.x - 6, point.y - 12, 5, 0x58854d, 0.75));
    this.addToLayer(this.entityLayer, this.add.circle(point.x + 10, point.y - 11, 4, 0x58854d, 0.7));
  }

  private drawSign(point: Point): void {
    this.addToLayer(this.decorLayer, this.add.rectangle(point.x + 1, point.y + 12, 26, 8, 0x1f2429, 0.24));
    this.addToLayer(this.entityLayer, this.add.rectangle(point.x, point.y, 24, 26, 0x7e7667));
    this.addToLayer(this.entityLayer, this.add.rectangle(point.x, point.y - 8, 20, 8, 0x8d836f));
    this.addToLayer(this.entityLayer, this.add.rectangle(point.x, point.y + 5, 10, 4, 0xc9b97f));
  }

  private drawHouse(): void {
    const bounds = HOUSE_LAYOUT.bounds;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2 + 6;

    this.add.rectangle(centerX + 10, centerY + 40, bounds.width + 44, 26, 0x1f2528, 0.3).setDepth(-5);
    this.add.rectangle(centerX, centerY + 12, bounds.width + 20, bounds.height + 8, 0x4f372c).setDepth(-4);
    this.add.rectangle(centerX, bounds.y + 54, bounds.width + 26, 94, 0x5a3c2f).setDepth(-3);

    for (let i = 0; i < 18; i += 1) {
      const plankY = bounds.y + 10 + i * 5;
      this.add.rectangle(centerX, plankY, bounds.width + 20, 2, i % 2 === 0 ? 0x6a4536 : 0x5f3f33).setDepth(-2);
    }

    this.add.rectangle(centerX, bounds.y + 28, bounds.width + 34, 42, 0x6f4638).setDepth(-1);
    for (let i = 0; i < 18; i += 1) {
      const tx = centerX - (bounds.width + 26) / 2 + i * 12;
      this.add.rectangle(tx, bounds.y + 28, 10, 28, i % 2 === 0 ? 0x7e5241 : 0x644133).setDepth(0);
    }

    const leftWindowX = bounds.x + 50;
    const rightWindowX = bounds.x + bounds.width - 50;
    const windowY = bounds.y + bounds.height - 34;
    this.add.rectangle(leftWindowX, windowY, 26, 24, 0x95acb8).setDepth(1);
    this.add.rectangle(rightWindowX, windowY, 26, 24, 0x95acb8).setDepth(1);
    this.add.rectangle(leftWindowX, windowY - 7, 20, 5, 0xd8e6ef, 0.58).setDepth(2);
    this.add.rectangle(rightWindowX, windowY - 7, 20, 5, 0xd8e6ef, 0.58).setDepth(2);
    this.add.rectangle(leftWindowX, windowY, 2, 24, 0x5a4d4b).setDepth(2);
    this.add.rectangle(rightWindowX, windowY, 2, 24, 0x5a4d4b).setDepth(2);
    this.add.rectangle(leftWindowX, windowY, 26, 2, 0x5a4d4b).setDepth(2);
    this.add.rectangle(rightWindowX, windowY, 26, 2, 0x5a4d4b).setDepth(2);

    this.add.rectangle(HOUSE_LAYOUT.doorPosition.x, HOUSE_LAYOUT.doorPosition.y + 22, 28, 34, 0x311d17).setDepth(3);
    this.add.rectangle(HOUSE_LAYOUT.doorPosition.x, HOUSE_LAYOUT.doorPosition.y + 14, 20, 4, 0xd2b85c).setDepth(4);
    this.add.circle(HOUSE_LAYOUT.doorPosition.x + 8, HOUSE_LAYOUT.doorPosition.y + 22, 2, 0xc8ad6e).setDepth(4);
    this.add.rectangle(HOUSE_LAYOUT.doorPosition.x, HOUSE_LAYOUT.doorPosition.y + 42, 54, 10, 0x8f7a57).setDepth(3);
    this.add.rectangle(HOUSE_LAYOUT.doorPosition.x, HOUSE_LAYOUT.doorPosition.y + 52, 62, 9, 0x715f41).setDepth(3);

    this.add.rectangle(bounds.x + bounds.width - 28, bounds.y + 14, 22, 40, 0x3d302f).setDepth(3);
    this.add.rectangle(bounds.x + bounds.width - 28, bounds.y - 8, 14, 16, 0x6a5857).setDepth(4);

    const trigger = HOUSE_LAYOUT.doorTrigger;
    this.houseDoorGlow = this.add.rectangle(
      trigger.x + trigger.width / 2,
      trigger.y + trigger.height / 2,
      trigger.width,
      trigger.height,
      0xd2b85c,
      0.2
    ).setDepth(7);
  }

  private drawCampfires(): void {
    this.campfireFlames = [];

    for (const fire of CAMPFIRES) {
      this.add.circle(fire.x, fire.y, 14, 0x4b4f52).setDepth(-1);
      this.add.circle(fire.x - 5, fire.y + 4, 4, 0x2f302e).setDepth(0);
      this.add.circle(fire.x + 5, fire.y + 4, 4, 0x2f302e).setDepth(0);
      this.add.rectangle(fire.x, fire.y + 2, 14, 3, 0x5e412d).setDepth(0);

      const glow = this.add.ellipse(fire.x, fire.y + 1, 22, 12, 0xbf5d2d, 0.28).setDepth(0);
      const flameOuter = this.add.ellipse(fire.x, fire.y - 1, 10, 13, 0xd16a33, 0.92).setDepth(1);
      const flameMid = this.add.ellipse(fire.x, fire.y, 7, 9, 0xe69c44, 0.95).setDepth(2);
      const flameCore = this.add.ellipse(fire.x, fire.y + 1, 4, 5, 0xf3d56f, 0.95).setDepth(3);
      const ember = this.add.ellipse(fire.x + 2, fire.y + 5, 7, 4, 0xc5572c, 0.8).setDepth(1);
      const spark = this.add.rectangle(fire.x, fire.y - 7, 1, 2, 0xf5d884, 0).setDepth(3);

      this.campfireFlames.push({
        center: fire,
        glow,
        flameOuter,
        flameMid,
        flameCore,
        ember,
        spark,
        flickerOffset: Math.random() * Math.PI * 2
      });
    }
  }

  private updateCampfires(now: number): void {
    for (const flame of this.campfireFlames) {
      const phase = now * 0.011 + flame.flickerOffset;
      const wobble = Math.sin(phase);
      const pulse = (Math.sin(phase * 1.6) + 1) * 0.5;
      const drift = Math.sin(phase * 0.7) * 1.4;

      flame.glow.setScale(1 + pulse * 0.14, 1 + pulse * 0.08);
      flame.glow.setAlpha(0.24 + pulse * 0.18);

      flame.flameOuter.setPosition(flame.center.x + wobble * 1.2, flame.center.y - 1 - pulse * 1.5);
      flame.flameOuter.setDisplaySize(9 + pulse * 3, 12 + pulse * 4);
      flame.flameOuter.setAlpha(0.8 + pulse * 0.18);

      flame.flameMid.setPosition(flame.center.x + wobble * 0.8, flame.center.y - pulse);
      flame.flameMid.setDisplaySize(6 + pulse * 2, 8 + pulse * 3);
      flame.flameMid.setAlpha(0.82 + pulse * 0.16);

      flame.flameCore.setPosition(flame.center.x + wobble * 0.4, flame.center.y + 1 - pulse * 0.7);
      flame.flameCore.setDisplaySize(3 + pulse * 1.2, 4 + pulse * 1.6);
      flame.flameCore.setAlpha(0.86 + pulse * 0.12);

      flame.ember.setPosition(flame.center.x + 2 + wobble * 0.6, flame.center.y + 5);
      flame.ember.setAlpha(0.6 + pulse * 0.28);

      flame.spark.setPosition(flame.center.x + drift, flame.center.y - 6 - (pulse * 8));
      flame.spark.setAlpha(0.08 + pulse * 0.32);
    }
  }

  private drawNpcs(): void {
    for (const npc of WORLD_NPCS) {
      const safeNpc = this.spawnValidation.validateNpcPlacement(npc, [HOUSE_LAYOUT.bounds]);
      this.drawNpc(safeNpc);
    }
  }

  private drawNpc(npc: NpcPlacement): void {
    const palette = [
      { hat: 0xa74d4a, body: 0x3d6ca3 },
      { hat: 0xc9672c, body: 0x547d42 },
      { hat: 0x6e4fa7, body: 0xa35a52 },
      { hat: 0x3f5863, body: 0x8a7547 },
      { hat: 0xb2353b, body: 0x3f3f4f }
    ][npc.variant % 5];

    const c = this.add.container(npc.x, npc.y).setDepth(5);
    c.add(this.add.ellipse(0, 10, 14, 5, 0x1f2528, 0.35));
    c.add(this.add.rectangle(0, 2, 11, 10, palette.body));
    c.add(this.add.rectangle(0, -7, 10, 9, 0xf0d5bc));
    c.add(this.add.rectangle(0, -12, 12, 4, palette.hat));

    const eyeOffset = npc.facing === "left" ? -2 : npc.facing === "right" ? 2 : 0;
    c.add(this.add.rectangle(-2 + eyeOffset, -7, 2, 2, 0x101010));
    c.add(this.add.rectangle(2 + eyeOffset, -7, 2, 2, 0x101010));
  }

  private drawShadows(): void {
    this.shadowGraphics.clear();
    this.shadowGraphics.fillStyle(0x2f3d49, 0.52);

    for (const shadow of this.shadows.getAll()) {
      this.drawFishShadow(shadow);
    }
  }

  private drawFishShadow(shadow: ShadowFish): void {
    const width = shadow.shape === "slim" ? shadow.lengthPx * 0.28 : shadow.shape === "wide" ? shadow.lengthPx * 0.45 : shadow.lengthPx * 0.36;
    const halfL = shadow.lengthPx / 2;
    const bodyHeading = shadow.heading + Math.sin(shadow.wobblePhase) * 0.08;
    const tailSwing = Math.sin(shadow.wobblePhase * 1.9) * 0.34;

    const bodyLocal = [
      { x: -halfL * 0.78, y: -width * 0.28 },
      { x: -halfL * 0.15, y: -width * 0.58 },
      { x: halfL * 0.58, y: -width * 0.32 },
      { x: halfL * 0.86, y: 0 },
      { x: halfL * 0.58, y: width * 0.32 },
      { x: -halfL * 0.15, y: width * 0.58 },
      { x: -halfL * 0.78, y: width * 0.28 }
    ];

    const rotatedBody = bodyLocal.map((p0) => rotateAndTranslate(p0, bodyHeading, shadow.position));
    this.shadowGraphics.fillPoints(rotatedBody, true);

    const tail = [
      { x: -halfL * 0.82, y: 0 },
      { x: -halfL * 1.18, y: -width * (0.46 + tailSwing * 0.25) },
      { x: -halfL * 1.18, y: width * (0.46 - tailSwing * 0.25) }
    ].map((p0) => rotateAndTranslate(p0, bodyHeading + tailSwing * 0.36, shadow.position));

    this.shadowGraphics.fillStyle(0x334553, 0.56);
    this.shadowGraphics.fillPoints(tail, true);

    const dorsal = [
      { x: -halfL * 0.04, y: -width * 0.44 },
      { x: halfL * 0.2, y: -width * 1.06 },
      { x: halfL * 0.33, y: -width * 0.34 }
    ].map((p0) => rotateAndTranslate(p0, bodyHeading, shadow.position));

    this.shadowGraphics.fillStyle(0x2a3a46, 0.6);
    this.shadowGraphics.fillPoints(dorsal, true);
    this.shadowGraphics.fillStyle(0x2f3d49, 0.52);
  }

  private drawBoats(): void {
    this.boatGraphics.clear();
    this.boatFrontGraphics.clear();

    for (const dock of DOCKS) {
      const pos = this.boatPositions[dock.waterId];
      const highlight = this.boatState.onBoat && this.boatState.currentWaterId === dock.waterId;
      this.drawBoatShape(pos, highlight);
    }
  }

  private drawBoatShape(pos: Point, active: boolean): void {
    const hullColor = active ? 0x704538 : 0x623c31;
    this.boatGraphics.fillStyle(0x1f2831, 0.35);
    this.boatGraphics.fillEllipse(Math.round(pos.x), Math.round(pos.y + 13), 34, 10);

    this.boatGraphics.fillStyle(hullColor, 1);
    this.boatGraphics.fillRoundedRect(Math.round(pos.x - 16), Math.round(pos.y - 8), 32, 16, 6);

    this.boatGraphics.fillStyle(0x9e7648, 0.95);
    this.boatGraphics.fillRect(Math.round(pos.x - 12), Math.round(pos.y - 2), 24, 4);

    this.boatGraphics.fillStyle(active ? 0xd2b85c : 0xc96f42, 0.95);
    this.boatGraphics.fillRect(Math.round(pos.x - 2), Math.round(pos.y - 10), 4, 4);
    this.boatGraphics.fillStyle(0xc7aa78, 0.8);
    this.boatGraphics.fillRect(Math.round(pos.x - 8), Math.round(pos.y - 6), 16, 2);
    this.boatGraphics.fillStyle(0x2f241d, 0.35);
    this.boatGraphics.fillRect(Math.round(pos.x - 12), Math.round(pos.y + 2), 24, 5);

    this.boatGraphics.lineStyle(2, 0x3f2a24, 0.9);
    this.boatGraphics.strokeRoundedRect(Math.round(pos.x - 16), Math.round(pos.y - 8), 32, 16, 6);

    this.boatFrontGraphics.fillStyle(0x473127, 0.95);
    this.boatFrontGraphics.fillRoundedRect(Math.round(pos.x - 17), Math.round(pos.y + 4), 34, 7, 2);
    this.boatFrontGraphics.fillStyle(0x7f5d3e, 0.75);
    this.boatFrontGraphics.fillRect(Math.round(pos.x - 11), Math.round(pos.y + 5), 22, 2);
    this.boatFrontGraphics.lineStyle(1, 0x2d1e1a, 0.8);
    this.boatFrontGraphics.strokeRoundedRect(Math.round(pos.x - 17), Math.round(pos.y + 4), 34, 7, 2);
  }

  private drawCastZone(now: number): void {
    this.castZoneGraphics.clear();
    if (!this.isCastZoneArmed || !this.dynamicCastZone.visible || Boolean(this.activeFishing)) {
      return;
    }

    const pulse = 0.25 + (Math.sin(now * 0.006) + 1) * 0.1;
    const r = this.dynamicCastZone.radius;

    if (this.dynamicCastZone.autoCenter) {
      const a = this.dynamicCastZone.autoCenter;
      this.castZoneGraphics.fillStyle(0xd2b85c, 0.13);
      this.castZoneGraphics.fillEllipse(a.x, a.y, r * 2.1, r * 1.4);
      this.castZoneGraphics.lineStyle(1, 0xe7d7a5, 0.42);
      this.castZoneGraphics.strokeEllipse(a.x, a.y, r * 2.2, r * 1.45);
    }

    const c = this.dynamicCastZone.center;
    this.castZoneGraphics.fillStyle(0xd2b85c, pulse);
    this.castZoneGraphics.fillEllipse(c.x, c.y, r * 2.4, r * 1.6);

    this.castZoneGraphics.lineStyle(2, 0xf0d98a, 0.9);
    this.castZoneGraphics.strokeEllipse(c.x, c.y, r * 2.5, r * 1.7);

    this.castZoneGraphics.lineStyle(2, 0xffffff, 0.38);
    this.castZoneGraphics.strokeEllipse(c.x, c.y, r * 1.3, r * 0.9);

    if (this.dynamicCastZone.isAiming) {
      const rodTip = getRoundedLineOrigin(this.player.getRodTipWorldPoint());
      this.castZoneGraphics.lineStyle(2, 0xf8f2d0, 0.8);
      this.castZoneGraphics.beginPath();
      this.castZoneGraphics.moveTo(rodTip.x, rodTip.y);
      this.castZoneGraphics.lineTo(c.x, c.y);
      this.castZoneGraphics.strokePath();
    }
  }

  private drawFishingVfx(now: number): void {
    this.fishingVfxGraphics.clear();
    if (!this.activeFishing || this.activeFishing.phase === "idle") {
      return;
    }

    const castPoint = this.activeFishing.castPoint;
    const lineOrigin = getRoundedLineOrigin(this.player.getRodTipWorldPoint());
    let bobberPoint = castPoint;

    if (this.activeFishing.phase === "casting") {
      const t = Phaser.Math.Clamp((now - this.activeFishing.startedAt) / CAST_MS, 0, 1);
      bobberPoint = {
        x: Phaser.Math.Linear(lineOrigin.x, castPoint.x, t),
        y: Phaser.Math.Linear(lineOrigin.y, castPoint.y, t)
      };
    }

    this.fishingVfxGraphics.lineStyle(2, 0xb7c8d0, 0.7);
    this.fishingVfxGraphics.beginPath();
    this.fishingVfxGraphics.moveTo(lineOrigin.x, lineOrigin.y);
    this.fishingVfxGraphics.lineTo(bobberPoint.x, bobberPoint.y);
    this.fishingVfxGraphics.strokePath();

    const isBiting = this.activeFishing.phase === "bite_window";
    const bobberColor = isBiting ? 0xd24f4f : 0xf0f0f0;
    this.fishingVfxGraphics.fillStyle(bobberColor, 1);
    this.fishingVfxGraphics.fillCircle(bobberPoint.x, bobberPoint.y, 5);
    this.fishingVfxGraphics.fillStyle(0xcf3f3f, 0.95);
    this.fishingVfxGraphics.fillRect(bobberPoint.x - 3, bobberPoint.y - 6, 6, 3);

    if (this.activeFishing.phase === "waiting" || this.activeFishing.phase === "bite_window") {
      const r1 = 8 + (Math.sin(now * 0.01) + 1) * 4;
      const r2 = 15 + (Math.cos(now * 0.012) + 1) * 3;
      this.fishingVfxGraphics.lineStyle(2, 0xd8eaf0, 0.45);
      this.fishingVfxGraphics.strokeCircle(castPoint.x, castPoint.y, r1);
      this.fishingVfxGraphics.strokeCircle(castPoint.x, castPoint.y, r2);
    }

    if (isBiting) {
      this.fishingVfxGraphics.lineStyle(3, 0xf6d47f, 0.9);
      this.fishingVfxGraphics.strokeCircle(castPoint.x, castPoint.y, 11);
      this.fishingVfxGraphics.beginPath();
      this.fishingVfxGraphics.moveTo(castPoint.x - 12, castPoint.y);
      this.fishingVfxGraphics.lineTo(castPoint.x + 12, castPoint.y);
      this.fishingVfxGraphics.moveTo(castPoint.x, castPoint.y - 12);
      this.fishingVfxGraphics.lineTo(castPoint.x, castPoint.y + 12);
      this.fishingVfxGraphics.strokePath();
    }
  }

  private updateDoorGlow(now: number): void {
    const playerPoint = { x: this.player.x, y: this.player.y };
    const pulse = 0.1 + (Math.sin(now * 0.008) + 1) * 0.16;

    if (isPointInRect(playerPoint, HOUSE_LAYOUT.doorTrigger)) {
      this.houseDoorGlow.setAlpha(0.55 + pulse * 0.2);
      return;
    }

    if (distance(playerPoint, HOUSE_LAYOUT.doorPosition) < 90) {
      this.houseDoorGlow.setAlpha(0.24 + pulse * 0.2);
      return;
    }

    this.houseDoorGlow.setAlpha(0.12);
  }

  private tryMove(dx: number, dy: number, delta: number): void {
    const nx = this.player.x + dx * PLAYER_SPEED * (delta / 1000);
    const ny = this.player.y + dy * PLAYER_SPEED * (delta / 1000);
    const next = { x: nx, y: ny };

    if (nx < 18 || nx > WORLD_W - 18 || ny < 18 || ny > WORLD_H - 18) {
      return;
    }

    const blockedByWater = this.waterPolygons.some((poly) => Phaser.Geom.Polygon.Contains(poly, nx, ny));
    if (blockedByWater && !this.isPointOnDock(next)) {
      return;
    }

    if (isPointInRect(next, HOUSE_LAYOUT.bounds)) {
      return;
    }

    this.player.setPosition(Math.round(nx), Math.round(ny));
  }

  private isPointOnDock(point: Point): boolean {
    return DOCKS.some((dock) => {
      const margin = 12;
      return point.x >= dock.rect.x - margin
        && point.x <= dock.rect.x + dock.rect.width + margin
        && point.y >= dock.rect.y - margin
        && point.y <= dock.rect.y + dock.rect.height + margin;
    });
  }

  private updateFacing(move: Point): void {
    if (Math.abs(move.x) > Math.abs(move.y)) {
      this.facing = move.x >= 0 ? "right" : "left";
    } else {
      this.facing = move.y >= 0 ? "down" : "up";
    }
    this.player.setFacing(this.facing);
  }

  private isMovementLocked(): boolean {
    return Boolean(this.activeFishing?.lockedMovement);
  }

  private refreshDynamicCastZone(): void {
    const sourcePoint = this.boatState.onBoat ? this.boatState.position : { x: this.player.x, y: this.player.y };

    const pointer = this.input.activePointer;
    const pointerInCanvas = pointer
      && pointer.x >= 0
      && pointer.x <= this.scale.width
      && pointer.y >= 0
      && pointer.y <= this.scale.height;
    if (pointerInCanvas && !this.inputSystem.isTouchingVirtualControls()) {
      this.manualAimPoint = { x: pointer.worldX, y: pointer.worldY };
    }

    this.dynamicCastZone = this.castZoneSystem.compute(sourcePoint, this.manualAimPoint);
    if (!this.dynamicCastZone.visible) {
      this.isCastZoneArmed = false;
      this.manualAimPoint = null;
    }
  }

  private getActiveCastPoint(): Point | null {
    if (!this.dynamicCastZone.visible || !this.isCastZoneArmed) {
      return null;
    }
    return this.dynamicCastZone.center;
  }

  private handleAction(now: number): void {
    if (this.activeFishing && this.activeFishing.phase !== "idle") {
      if (this.activeFishing.phase !== "bite_window") {
        return;
      }

      const hooked = this.fishingSystem.tryHook(this.activeFishing, now);
      this.activeFishing = hooked.session;
      if (!hooked.accepted) {
        this.message = "Du missade hugget.";
        return;
      }

      const result = this.fishingSystem.resolveSession(this.activeFishing, {
        now,
        buffState: this.state.state.buffState
      });

      if (result.consumedShadowId) {
        this.shadows.consumeShadow(result.consumedShadowId, this.time.now);
      }

      this.state.applyFishingResult(result);
      this.message = result.message;
      if (result.success && result.fishId) {
        const species = getSpeciesById(result.fishId);
        this.catchOverlay.showCatch(result.fishId, result.pointsAwarded, species?.rarity === "rare");
      }

      this.activeFishing = this.fishingSystem.startCooldown(this.activeFishing, now);
      return;
    }

    const playerPoint = this.getPlayerInteractionPoint();

    if (this.boatState.onBoat && this.boatState.currentWaterId) {
      const disembark = this.boatSystem.tryDisembark(this.boatState.position, this.boatState.currentWaterId, [HOUSE_LAYOUT.bounds]);
      if (disembark.disembarked && disembark.playerPoint) {
        this.boatState.onBoat = false;
        this.boatState.currentWaterId = null;
        this.player.setPosition(disembark.playerPoint.x, disembark.playerPoint.y);
        this.isCastZoneArmed = false;
        this.message = "Du gick av båten.";
        return;
      }
    }

    if (!this.boatState.onBoat) {
      const board = this.boatSystem.boardIfNearDock(playerPoint);
      if (board.boarded && board.waterId && board.boatPosition) {
        this.boatState.onBoat = true;
        this.boatState.currentWaterId = board.waterId;
        this.boatState.position = board.boatPosition;
        this.boatPositions[board.waterId] = { ...board.boatPosition };
        this.player.setPosition(board.boatPosition.x, board.boatPosition.y + 1);
        this.isCastZoneArmed = false;
        this.message = "Du gick ombord båten.";
        return;
      }
    }

    if (!this.boatState.onBoat && isPointInRect(playerPoint, HOUSE_LAYOUT.doorTrigger)) {
      this.isCastZoneArmed = false;
      this.resetFishingSession();
      this.scene.start("CabinScene");
      return;
    }

    if (!this.boatState.onBoat && distance(playerPoint, HOUSE_LAYOUT.doorPosition) < 92) {
      this.message = "Ställ dig vid dörren och tryck Interagera för att gå in.";
      return;
    }

    if (!this.boatState.onBoat) {
      for (const fire of CAMPFIRES) {
        if (distance(playerPoint, fire) < 44) {
          this.isCastZoneArmed = false;
          this.freezerPanel.show(this.state.state.inventory, this.state.state.freezer);
          this.message = "Lägereld: stek färsk eller fryst fisk.";
          return;
        }
      }
    }

    if (!this.state.canFish()) {
      this.isCastZoneArmed = false;
      this.message = "Du är fullastad. Gå till stugan och lägg fisk i frysen.";
      return;
    }

    if (!this.dynamicCastZone.visible) {
      this.isCastZoneArmed = false;
      this.message = "Gå närmare vattenkanten för att kasta.";
      return;
    }

    if (!this.isCastZoneArmed) {
      this.isCastZoneArmed = true;
      this.message = "Kastläge aktivt. Sikta och tryck igen för att kasta.";
      return;
    }

    const castPoint = this.getActiveCastPoint();
    if (!castPoint) {
      this.message = "Ogiltig kastpunkt.";
      return;
    }

    const attempt = this.fishingSystem.buildAttempt(castPoint);
    if (!attempt) {
      this.message = "Ogiltig kastpunkt.";
      return;
    }

    const nearbyShadow = this.shadows.findNearby(castPoint, TILE_SIZE * 2);
    this.activeFishing = this.fishingSystem.startSession(
      attempt,
      now,
      nearbyShadow?.id,
      nearbyShadow?.speciesId
    );
    this.isCastZoneArmed = false;
    this.message = "Kastar...";
  }

  private tickFishingSession(now: number): void {
    if (!this.activeFishing) {
      return;
    }

    const update = this.fishingSystem.updateSession(this.activeFishing, now);
    this.activeFishing = update.session;

    if (update.event) {
      this.applyFishingEventMessage(update.event);
    }

    if (this.activeFishing.phase === "idle") {
      this.resetFishingSession();
    }
  }

  private applyFishingEventMessage(event: FishingSessionEvent): void {
    if (event === "waiting") {
      this.message = "Väntar på napp...";
      return;
    }

    if (event === "bite_started") {
      this.message = "NAPPADE! TRYCK NU!";
      return;
    }

    if (event === "bite_missed") {
      this.message = "Du missade hugget.";
    }
  }

  private updatePlayerAnimation(isMoving: boolean, delta: number): void {
    if (this.activeFishing) {
      if (this.activeFishing.phase === "casting") {
        this.player.setMode("fish_cast");
      } else if (this.activeFishing.phase === "waiting" || this.activeFishing.phase === "bite_window") {
        this.player.setMode("fish_wait");
      } else if (this.activeFishing.phase === "cooldown" || this.activeFishing.phase === "resolve") {
        this.player.setMode("fish_reel");
      }
    } else if (this.boatState.onBoat) {
      this.player.setMode("boat_sit");
    } else {
      this.player.setMode(isMoving ? "walk" : "idle");
    }

    this.player.update(delta);
  }

  private openMenu(mode: MenuMode, message: string): void {
    this.menuMode = mode;
    this.menuOpen = true;
    this.isCastZoneArmed = false;
    this.message = message;
    this.menu.show(mode);
  }

  private closeMenu(): void {
    this.menuOpen = false;
    this.menu.hide();
  }

  private resetFishingSession(): void {
    this.activeFishing = null;
    this.isCastZoneArmed = false;
    this.fishingVfxGraphics.clear();
  }

  private getPlayerInteractionPoint(): Point {
    return {
      x: this.player.x,
      y: this.player.y + 18
    };
  }
}

function rotateAndTranslate(p: Point, angle: number, origin: Point): Point {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: origin.x + p.x * c - p.y * s,
    y: origin.y + p.x * s + p.y * c
  };
}
