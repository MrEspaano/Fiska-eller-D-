import Phaser from "phaser";
import type { Point } from "../types";

export class InputSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<string, Phaser.Input.Keyboard.Key>;
  private actionSpace: Phaser.Input.Keyboard.Key;
  private actionE: Phaser.Input.Keyboard.Key;
  private menuEscape: Phaser.Input.Keyboard.Key;
  private readonly joystick = { active: false, center: { x: 0, y: 0 }, vector: { x: 0, y: 0 } };
  private actionPressed = false;

  constructor(scene: Phaser.Scene, private readonly root: HTMLElement) {
    this.cursors = scene.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys);
    this.wasd = scene.input.keyboard?.addKeys("W,S,A,D") as Record<string, Phaser.Input.Keyboard.Key>;
    this.actionSpace = scene.input.keyboard?.addKey("SPACE") as Phaser.Input.Keyboard.Key;
    this.actionE = scene.input.keyboard?.addKey("E") as Phaser.Input.Keyboard.Key;
    this.menuEscape = scene.input.keyboard?.addKey("ESC") as Phaser.Input.Keyboard.Key;
    this.setupMobileControls();
  }

  getMoveVector(): Point {
    const x = (this.keyDown(this.cursors.right) || this.keyDown(this.wasd.D) ? 1 : 0)
      - (this.keyDown(this.cursors.left) || this.keyDown(this.wasd.A) ? 1 : 0);
    const y = (this.keyDown(this.cursors.down) || this.keyDown(this.wasd.S) ? 1 : 0)
      - (this.keyDown(this.cursors.up) || this.keyDown(this.wasd.W) ? 1 : 0);

    const combinedX = x + this.joystick.vector.x;
    const combinedY = y + this.joystick.vector.y;
    const len = Math.hypot(combinedX, combinedY) || 1;
    return { x: combinedX / len, y: combinedY / len };
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
    return Phaser.Input.Keyboard.JustDown(this.menuEscape);
  }

  private keyDown(key?: Phaser.Input.Keyboard.Key): boolean {
    return Boolean(key?.isDown);
  }

  private setupMobileControls(): void {
    this.root.querySelectorAll(".mobile-controls").forEach((el) => el.remove());
    const controls = document.createElement("div");
    controls.className = "mobile-controls";
    controls.innerHTML = `
      <div class="joystick"></div>
      <button class="action-button" type="button">A</button>
    `;
    this.root.appendChild(controls);

    const joystickEl = controls.querySelector(".joystick") as HTMLDivElement;
    const actionBtn = controls.querySelector(".action-button") as HTMLButtonElement;

    joystickEl.addEventListener("pointerdown", (ev) => {
      this.joystick.active = true;
      const rect = joystickEl.getBoundingClientRect();
      this.joystick.center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.updateJoystick(ev.clientX, ev.clientY, rect.width / 2);
      joystickEl.setPointerCapture(ev.pointerId);
    });

    joystickEl.addEventListener("pointermove", (ev) => {
      if (!this.joystick.active) {
        return;
      }
      const rect = joystickEl.getBoundingClientRect();
      this.updateJoystick(ev.clientX, ev.clientY, rect.width / 2);
    });

    joystickEl.addEventListener("pointerup", () => {
      this.joystick.active = false;
      this.joystick.vector = { x: 0, y: 0 };
    });

    actionBtn.addEventListener("pointerdown", () => {
      this.actionPressed = true;
    });
  }

  private updateJoystick(x: number, y: number, radius: number): void {
    const dx = x - this.joystick.center.x;
    const dy = y - this.joystick.center.y;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(radius, len);
    this.joystick.vector = {
      x: (dx / len) * (clamped / radius),
      y: (dy / len) * (clamped / radius)
    };
  }
}
