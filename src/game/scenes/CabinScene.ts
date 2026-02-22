import Phaser from "phaser";
import {
  CABIN_COLLISION_ZONES,
  CABIN_H,
  CABIN_H_TILES,
  CABIN_INTERACTION_ZONES,
  CABIN_W,
  CABIN_W_TILES,
  isPointInRect,
  pointFromTile
} from "../data/layout";
import { TILE_SIZE } from "../data/waters";
import { GameState } from "../GameState";
import { AudioSystem } from "../systems/AudioSystem";
import { InputSystem } from "../systems/InputSystem";
import { PlayerSpriteSystem } from "../systems/PlayerSpriteSystem";
import { FreezerPanel } from "../ui/FreezerPanel";
import { Hud } from "../ui/Hud";
import { MenuOverlay, type MenuMode } from "../ui/MenuOverlay";
import { shouldOpenCabinPauseMenu } from "../ui/menuGuards";

const CAMERA_TARGET_TILES_X = 18;
const CAMERA_TARGET_TILES_Y = 10;

export class CabinScene extends Phaser.Scene {
  private player!: PlayerSpriteSystem;
  private state!: GameState;
  private audio!: AudioSystem;
  private inputSystem!: InputSystem;
  private panel!: FreezerPanel;
  private hud!: Hud;
  private menu!: MenuOverlay;
  private menuOpen = false;
  private menuMode: MenuMode = "boot";
  private message = "Stugan: lägg fisk i frysen eller laga mat.";

  private freezerHint!: Phaser.GameObjects.Rectangle;
  private stoveHint!: Phaser.GameObjects.Rectangle;
  private exitHint!: Phaser.GameObjects.Rectangle;
  private exitLabel!: Phaser.GameObjects.Text;

  constructor() {
    super("CabinScene");
  }

  create(): void {
    this.state = this.registry.get("gameState") as GameState;
    this.audio = this.registry.get("audioSystem") as AudioSystem;
    this.audio.applySettings(this.state.state.settings);

    const root = document.getElementById("app");
    if (!root) {
      throw new Error("#app saknas");
    }

    this.drawInteriorDetailed();

    const exitCenter = {
      x: CABIN_INTERACTION_ZONES.exit.x + CABIN_INTERACTION_ZONES.exit.width / 2,
      y: CABIN_INTERACTION_ZONES.exit.y + 12
    };
    this.player = new PlayerSpriteSystem(this, exitCenter.x, exitCenter.y, 20);

    this.cameras.main.setBounds(0, 0, CABIN_W, CABIN_H);
    this.cameras.main.startFollow(this.player.container, true, 0.18, 0.18, 0, 0);
    const zoomByWidth = this.cameras.main.width / (TILE_SIZE * CAMERA_TARGET_TILES_X);
    const zoomByHeight = this.cameras.main.height / (TILE_SIZE * CAMERA_TARGET_TILES_Y);
    this.cameras.main.setZoom(Math.min(zoomByWidth, zoomByHeight));
    this.cameras.main.setRoundPixels(true);

    this.inputSystem = new InputSystem(this, root);
    this.panel = new FreezerPanel(root, {
      onDepositAll: () => {
        this.message = this.state.depositAllToFreezer();
        this.panel.render(this.state.state.inventory, this.state.state.freezer);
      },
      onCookFresh: (speciesId) => {
        this.message = this.state.cook(speciesId, "fresh", Date.now());
        this.panel.render(this.state.state.inventory, this.state.state.freezer);
      },
      onCookFrozen: (speciesId) => {
        this.message = this.state.cook(speciesId, "freezer", Date.now());
        this.panel.render(this.state.state.inventory, this.state.state.freezer);
      },
      onClose: () => this.panel.hide()
    });

    this.hud = new Hud(root);

    this.menu = new MenuOverlay(root, {
      onStartOrResume: () => {
        this.registry.set("hasStartedGame", true);
        this.audio.unlock();
        this.audio.startMusic();
        this.audio.playSfx("ui_confirm");
        this.message = "Tillbaka i stugan.";
        this.closeMenu();
      },
      onExitToMenu: () => {
        this.registry.set("hasStartedGame", false);
        this.audio.playSfx("ui_back");
        this.audio.stopMusic();
        this.panel.hide();
        this.openMenu("boot", "Startmeny öppen.");
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

    if (Boolean(this.registry.get("hasStartedGame"))) {
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

    if (shouldOpenCabinPauseMenu(this.menuOpen, this.panel.isOpen(), this.inputSystem.consumeMenuToggle())) {
      this.openMenu("pause", "Pausmeny öppen.");
      return;
    }

    if (this.menuOpen) {
      this.player.setMode("idle");
      this.player.update(delta);
      this.cameras.main.setScroll(Math.round(this.cameras.main.scrollX), Math.round(this.cameras.main.scrollY));
      this.hud.render(this.state.state, this.message, this.state.state.buffState);
      return;
    }

    this.state.tick(now);

    const move = this.inputSystem.getMoveVector();
    const isMoving = Math.abs(move.x) > 0.1 || Math.abs(move.y) > 0.1;

    if (isMoving && !this.panel.isOpen()) {
      const nx = this.player.x + move.x * 150 * (delta / 1000);
      const ny = this.player.y + move.y * 150 * (delta / 1000);
      if (this.canMoveTo(nx, ny)) {
        this.player.setPosition(nx, ny);
      }
    }

    this.player.setMode(isMoving && !this.panel.isOpen() ? "walk" : "idle");
    this.player.update(delta);
    this.cameras.main.setScroll(Math.round(this.cameras.main.scrollX), Math.round(this.cameras.main.scrollY));

    this.updateZoneHints(delta);

    if (!this.panel.isOpen() && this.inputSystem.consumeAction()) {
      const p = { x: this.player.x, y: this.player.y };
      if (isPointInRect(p, CABIN_INTERACTION_ZONES.exit)) {
        this.scene.start("WorldScene");
        return;
      }

      if (isPointInRect(p, CABIN_INTERACTION_ZONES.freezer) || isPointInRect(p, CABIN_INTERACTION_ZONES.stove)) {
        this.panel.show(this.state.state.inventory, this.state.state.freezer);
        this.message = "Hantera frys och matlagning.";
      } else {
        this.message = "Gå till frysen, spisen eller dörren för att interagera.";
      }
    }

    this.hud.render(this.state.state, this.message, this.state.state.buffState);
  }

  private canMoveTo(x: number, y: number): boolean {
    const point = { x, y };

    if (x < 18 || x > CABIN_W - 18 || y < 18 || y > CABIN_H - 18) {
      return false;
    }

    for (const rect of CABIN_COLLISION_ZONES.furnitureBlocks) {
      if (isPointInRect(point, rect)) {
        return false;
      }
    }

    return true;
  }

  private drawInteriorDetailed(): void {
    this.add.rectangle(CABIN_W / 2, CABIN_H / 2, CABIN_W, CABIN_H, 0x4b3c2f).setDepth(-14);

    const floorPalette = [0x5b4737, 0x64503d, 0x594434, 0x6b5641, 0x614c39, 0x584332, 0x6f5944];
    for (let y = 0; y < CABIN_H_TILES; y += 1) {
      for (let x = 0; x < CABIN_W_TILES; x += 1) {
        const idx = (x * 7 + y * 11 + x * y + y) % floorPalette.length;
        this.add.rectangle(x * TILE_SIZE + 16, y * TILE_SIZE + 16, TILE_SIZE, TILE_SIZE, floorPalette[idx]).setDepth(-13);

        if ((x + y) % 5 === 0) {
          this.add.rectangle(x * TILE_SIZE + 8, y * TILE_SIZE + 24, 3, 1, 0x453327, 0.4).setDepth(-12);
        }
        if ((x * 3 + y) % 7 === 0) {
          this.add.rectangle(x * TILE_SIZE + 23, y * TILE_SIZE + 10, 2, 2, 0x7a6148, 0.3).setDepth(-12);
        }
      }
    }

    this.add.rectangle(CABIN_W / 2, 14, CABIN_W, 28, 0x3c3027).setDepth(-11);
    this.add.rectangle(CABIN_W / 2, CABIN_H - 14, CABIN_W, 28, 0x3c3027).setDepth(-11);
    this.add.rectangle(14, CABIN_H / 2, 28, CABIN_H, 0x3c3027).setDepth(-11);
    this.add.rectangle(CABIN_W - 14, CABIN_H / 2, 28, CABIN_H, 0x3c3027).setDepth(-11);

    this.drawFreezerArea();
    this.drawStoveArea();
    this.drawDiningArea();
    this.drawBedAndStorage();
    this.drawDecor();
    this.drawExitDoorArea();

    const freezer = CABIN_INTERACTION_ZONES.freezer;
    const stove = CABIN_INTERACTION_ZONES.stove;
    const exit = CABIN_INTERACTION_ZONES.exit;

    this.freezerHint = this.add.rectangle(freezer.x + freezer.width / 2, freezer.y + freezer.height / 2, freezer.width, freezer.height, 0x86a7bb, 0.13).setDepth(18);
    this.stoveHint = this.add.rectangle(stove.x + stove.width / 2, stove.y + stove.height / 2, stove.width, stove.height, 0xc06d4b, 0.13).setDepth(18);
    this.exitHint = this.add.rectangle(exit.x + exit.width / 2, exit.y + exit.height / 2, exit.width, exit.height, 0xd2b85c, 0.2).setDepth(18);

    this.exitLabel = this.add.text(exit.x + exit.width / 2 - 18, exit.y - 18, "EXIT", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#e6e1d3"
    }).setDepth(19);
  }

  private drawFreezerArea(): void {
    const c = pointFromTile(5, 4);
    this.add.rectangle(c.x, c.y, 110, 64, 0x6f8c9a).setDepth(2);
    this.add.rectangle(c.x, c.y - 18, 106, 14, 0x9ab9c8).setDepth(3);
    this.add.rectangle(c.x - 26, c.y + 4, 20, 12, 0x27343c).setDepth(4);
    this.add.rectangle(c.x + 20, c.y + 4, 20, 12, 0x27343c).setDepth(4);
    this.add.rectangle(c.x, c.y + 22, 102, 2, 0x4f6471, 0.8).setDepth(4);
    this.add.rectangle(c.x, c.y + 34, 116, 8, 0x3b3028).setDepth(1);
  }

  private drawStoveArea(): void {
    const c = pointFromTile(23, 4);
    this.add.rectangle(c.x, c.y, 112, 66, 0x4d5258).setDepth(2);
    this.add.rectangle(c.x, c.y - 16, 102, 11, 0x7d8389).setDepth(3);
    this.add.circle(c.x - 24, c.y + 4, 9, 0x202328).setDepth(4);
    this.add.circle(c.x + 24, c.y + 4, 9, 0x202328).setDepth(4);
    this.add.rectangle(c.x, c.y + 22, 98, 12, 0x383d42).setDepth(3);
    this.add.rectangle(c.x, c.y + 22, 24, 6, 0x5f656b).setDepth(4);
    this.add.rectangle(c.x, c.y + 35, 116, 8, 0x3b3028).setDepth(1);
  }

  private drawDiningArea(): void {
    const c = pointFromTile(17, 10);
    this.add.rectangle(c.x, c.y, 124, 76, 0x7d5e43).setDepth(2);
    this.add.rectangle(c.x, c.y - 37, 124, 8, 0x634a34).setDepth(3);

    this.add.rectangle(c.x - 70, c.y, 16, 50, 0x5f4a35).setDepth(1);
    this.add.rectangle(c.x + 70, c.y, 16, 50, 0x5f4a35).setDepth(1);
    this.add.rectangle(c.x - 42, c.y + 50, 16, 20, 0x6a4f3a).setDepth(1);
    this.add.rectangle(c.x + 42, c.y + 50, 16, 20, 0x6a4f3a).setDepth(1);

    this.add.rectangle(c.x, c.y + 56, 190, 44, 0x8a6547, 0.66).setDepth(0);
  }

  private drawBedAndStorage(): void {
    const bed = pointFromTile(5, 11);
    this.add.rectangle(bed.x, bed.y, 118, 76, 0x8f7d68).setDepth(2);
    this.add.rectangle(bed.x, bed.y - 24, 102, 24, 0xbbd0e2).setDepth(3);
    this.add.rectangle(bed.x, bed.y + 18, 106, 30, 0xa34848).setDepth(3);
    this.add.rectangle(bed.x - 36, bed.y - 24, 26, 10, 0xdbe7f0).setDepth(4);
    this.add.rectangle(bed.x + 2, bed.y - 24, 26, 10, 0xdbe7f0).setDepth(4);

    const shelf = pointFromTile(25, 12);
    this.add.rectangle(shelf.x, shelf.y, 112, 72, 0x6a4d37).setDepth(2);
    this.add.rectangle(shelf.x, shelf.y - 18, 100, 8, 0x4f3928).setDepth(3);
    this.add.rectangle(shelf.x, shelf.y + 2, 100, 8, 0x4f3928).setDepth(3);
    this.add.rectangle(shelf.x, shelf.y + 22, 100, 8, 0x4f3928).setDepth(3);

    this.add.circle(shelf.x - 34, shelf.y - 18, 5, 0x7da884).setDepth(4);
    this.add.circle(shelf.x - 4, shelf.y - 18, 5, 0xb39b6f).setDepth(4);
    this.add.circle(shelf.x + 30, shelf.y - 18, 5, 0x8e6ea5).setDepth(4);
    this.add.rectangle(shelf.x + 40, shelf.y + 2, 8, 12, 0x7f5e3f).setDepth(4);
  }

  private drawDecor(): void {
    for (let x = 4; x < CABIN_W_TILES - 3; x += 3) {
      const px = x * TILE_SIZE + TILE_SIZE / 2;
      this.add.rectangle(px, 34, 12, 6, 0x7f684d).setDepth(4);
      this.add.circle(px, 41, 4, 0xe0c270).setDepth(5);
    }

    const rug = pointFromTile(15, 15);
    this.add.rectangle(rug.x, rug.y, 220, 62, 0x6f4c3d).setDepth(0);
    this.add.rectangle(rug.x, rug.y, 206, 48, 0x9e6f58).setDepth(1);
    this.add.rectangle(rug.x, rug.y, 164, 22, 0xb7846d, 0.45).setDepth(2);

    for (let i = 0; i < 10; i += 1) {
      const cx = 64 + i * 76;
      this.add.rectangle(cx, CABIN_H - 20, 18, 8, 0x3f2f25).setDepth(2);
    }
  }

  private drawExitDoorArea(): void {
    const exit = CABIN_INTERACTION_ZONES.exit;
    const cx = exit.x + exit.width / 2;

    this.add.rectangle(cx, exit.y + 12, 88, 34, 0x2f241c).setDepth(10);
    this.add.rectangle(cx, exit.y + 2, 64, 10, 0xd2b85c).setDepth(11);
    this.add.rectangle(cx, exit.y + 22, 96, 8, 0x8a734f).setDepth(11);
    this.add.rectangle(cx, exit.y + 28, 102, 8, 0x6f5b3f).setDepth(11);
  }

  private updateZoneHints(delta: number): void {
    const p = { x: this.player.x, y: this.player.y };
    this.freezerHint.setAlpha(isPointInRect(p, CABIN_INTERACTION_ZONES.freezer) ? 0.35 : 0.13);
    this.stoveHint.setAlpha(isPointInRect(p, CABIN_INTERACTION_ZONES.stove) ? 0.35 : 0.13);

    const nearExit = isPointInRect(p, CABIN_INTERACTION_ZONES.exit);
    const pulse = 0.2 + (Math.sin(this.time.now * 0.01) + 1) * 0.15;
    this.exitHint.setAlpha(nearExit ? 0.45 + pulse : 0.2 + pulse * 0.3);

    const bob = Math.sin(this.time.now * 0.01) * 0.8;
    this.exitLabel.setY(CABIN_INTERACTION_ZONES.exit.y - 18 + bob * 0.2 * (delta / 16.6));
  }

  private openMenu(mode: MenuMode, message: string): void {
    this.menuMode = mode;
    this.menuOpen = true;
    this.message = message;
    this.menu.show(mode);
  }

  private closeMenu(): void {
    this.menuOpen = false;
    this.menu.hide();
  }
}
