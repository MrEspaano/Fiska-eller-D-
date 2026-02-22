import Phaser from "phaser";
import type { Point } from "../types";
import {
  computeMoveVectorFromInputs,
  shouldConsumeMenuToggle,
  type MobileDirections
} from "./mobileInput";

export class InputSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<string, Phaser.Input.Keyboard.Key>;
  private actionSpace: Phaser.Input.Keyboard.Key;
  private actionE: Phaser.Input.Keyboard.Key;
  private menuEscape: Phaser.Input.Keyboard.Key;
  private readonly mobileDirections: MobileDirections = { up: false, down: false, left: false, right: false };
  private actionPressed = false;
  private menuPressed = false;

  constructor(scene: Phaser.Scene, private readonly root: HTMLElement) {
    this.cursors = scene.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys);
    this.wasd = scene.input.keyboard?.addKeys("W,S,A,D") as Record<string, Phaser.Input.Keyboard.Key>;
    this.actionSpace = scene.input.keyboard?.addKey("SPACE") as Phaser.Input.Keyboard.Key;
    this.actionE = scene.input.keyboard?.addKey("E") as Phaser.Input.Keyboard.Key;
    this.menuEscape = scene.input.keyboard?.addKey("ESC") as Phaser.Input.Keyboard.Key;
    this.setupMobileControls();
  }

  getMoveVector(): Point {
    const keyboardX = (this.keyDown(this.cursors.right) || this.keyDown(this.wasd.D) ? 1 : 0)
      - (this.keyDown(this.cursors.left) || this.keyDown(this.wasd.A) ? 1 : 0);
    const keyboardY = (this.keyDown(this.cursors.down) || this.keyDown(this.wasd.S) ? 1 : 0)
      - (this.keyDown(this.cursors.up) || this.keyDown(this.wasd.W) ? 1 : 0);
    return computeMoveVectorFromInputs(keyboardX, keyboardY, this.mobileDirections);
  }

  consumeAction(): boolean {
    const keyboardAction = Phaser.Input.Keyboard.JustDown(this.actionSpace)
      || Phaser.Input.Keyboard.JustDown(this.actionE);
    if (keyboardAction || this.actionPressed) {
      this.actionPressed = false;
      return true;
    }
    return false;
  }

  consumeMenuToggle(): boolean {
    const keyboardToggle = Phaser.Input.Keyboard.JustDown(this.menuEscape);
    const toggle = shouldConsumeMenuToggle(keyboardToggle, this.menuPressed);
    if (toggle) {
      this.menuPressed = false;
    }
    return toggle;
  }

  private keyDown(key?: Phaser.Input.Keyboard.Key): boolean {
    return Boolean(key?.isDown);
  }

  private setupMobileControls(): void {
    this.root.querySelectorAll(".mobile-controls").forEach((el) => el.remove());
    const controls = document.createElement("div");
    controls.className = "mobile-controls";
    controls.innerHTML = `
      <div class="mobile-dpad">
        <div class="dpad-grid">
          <button class="dpad-btn up" type="button" aria-label="Upp">▲</button>
          <button class="dpad-btn right" type="button" aria-label="Höger">▶</button>
          <button class="dpad-btn left" type="button" aria-label="Vänster">◀</button>
          <button class="dpad-btn down" type="button" aria-label="Ner">▼</button>
        </div>
      </div>
      <div class="mobile-actions">
        <button class="menu-button" type="button" aria-label="Meny">Meny</button>
        <button class="action-button" type="button" aria-label="Interagera">A</button>
      </div>
    `;
    this.root.appendChild(controls);

    const upBtn = controls.querySelector(".dpad-btn.up") as HTMLButtonElement;
    const rightBtn = controls.querySelector(".dpad-btn.right") as HTMLButtonElement;
    const leftBtn = controls.querySelector(".dpad-btn.left") as HTMLButtonElement;
    const downBtn = controls.querySelector(".dpad-btn.down") as HTMLButtonElement;
    const menuBtn = controls.querySelector(".menu-button") as HTMLButtonElement;
    const actionBtn = controls.querySelector(".action-button") as HTMLButtonElement;

    this.attachHoldButton(upBtn, () => {
      this.mobileDirections.up = true;
    }, () => {
      this.mobileDirections.up = false;
    });
    this.attachHoldButton(rightBtn, () => {
      this.mobileDirections.right = true;
    }, () => {
      this.mobileDirections.right = false;
    });
    this.attachHoldButton(leftBtn, () => {
      this.mobileDirections.left = true;
    }, () => {
      this.mobileDirections.left = false;
    });
    this.attachHoldButton(downBtn, () => {
      this.mobileDirections.down = true;
    }, () => {
      this.mobileDirections.down = false;
    });

    menuBtn.addEventListener("pointerdown", () => {
      this.menuPressed = true;
    });

    actionBtn.addEventListener("pointerdown", () => {
      this.actionPressed = true;
    });
  }

  private attachHoldButton(
    button: HTMLButtonElement,
    onPress: () => void,
    onRelease: () => void
  ): void {
    button.addEventListener("pointerdown", (ev) => {
      onPress();
      button.setPointerCapture(ev.pointerId);
    });

    const release = () => onRelease();
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("lostpointercapture", release);
  }
}
