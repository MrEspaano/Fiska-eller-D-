import Phaser from "phaser";
import type { FacingDirection, Point } from "../types";

export type PlayerAnimMode = "idle" | "walk" | "fish_cast" | "fish_wait" | "fish_reel" | "boat_sit";

const BODY_BOTTOM_Y = 24;

export interface RodTipTransform {
  containerX: number;
  containerY: number;
  containerScaleX: number;
  rodX: number;
  rodY: number;
  rodWidth: number;
  rodRotation: number;
  rodVisible: boolean;
  fallbackX: number;
  fallbackY: number;
}

export function computeRodTipWorldPoint(transform: RodTipTransform): Point {
  if (!transform.rodVisible) {
    return {
      x: Math.round(transform.containerX + transform.fallbackX * transform.containerScaleX),
      y: Math.round(transform.containerY + transform.fallbackY)
    };
  }

  const localTipX = transform.rodX + transform.rodWidth / 2;
  const localTipY = transform.rodY;
  const rx = localTipX - transform.rodX;
  const ry = localTipY - transform.rodY;

  const cos = Math.cos(transform.rodRotation);
  const sin = Math.sin(transform.rodRotation);
  const rotatedX = transform.rodX + rx * cos - ry * sin;
  const rotatedY = transform.rodY + rx * sin + ry * cos;

  return {
    x: Math.round(transform.containerX + rotatedX * transform.containerScaleX),
    y: Math.round(transform.containerY + rotatedY)
  };
}

export class PlayerSpriteSystem {
  readonly container: Phaser.GameObjects.Container;

  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly bootsL: Phaser.GameObjects.Rectangle;
  private readonly bootsR: Phaser.GameObjects.Rectangle;
  private readonly legsL: Phaser.GameObjects.Rectangle;
  private readonly legsR: Phaser.GameObjects.Rectangle;
  private readonly torso: Phaser.GameObjects.Rectangle;
  private readonly jacketHighlight: Phaser.GameObjects.Rectangle;
  private readonly armL: Phaser.GameObjects.Rectangle;
  private readonly armR: Phaser.GameObjects.Rectangle;
  private readonly head: Phaser.GameObjects.Rectangle;
  private readonly hair: Phaser.GameObjects.Rectangle;
  private readonly hatMain: Phaser.GameObjects.Rectangle;
  private readonly hatBrim: Phaser.GameObjects.Rectangle;
  private readonly eyeL: Phaser.GameObjects.Rectangle;
  private readonly eyeR: Phaser.GameObjects.Rectangle;
  private readonly rod: Phaser.GameObjects.Rectangle;
  private readonly reel: Phaser.GameObjects.Rectangle;

  private timer = 0;
  private mode: PlayerAnimMode = "idle";
  private facing: FacingDirection = "down";

  constructor(scene: Phaser.Scene, x: number, y: number, depth = 8) {
    this.container = scene.add.container(Math.round(x), Math.round(y));
    this.container.setDepth(depth);

    this.shadow = scene.add.ellipse(0, BODY_BOTTOM_Y, 30, 10, 0x1d2528, 0.44);

    this.bootsL = scene.add.rectangle(-7, 20, 8, 5, 0x2a2422);
    this.bootsR = scene.add.rectangle(7, 20, 8, 5, 0x2a2422);
    this.legsL = scene.add.rectangle(-7, 15, 8, 10, 0x4a3f3a);
    this.legsR = scene.add.rectangle(7, 15, 8, 10, 0x4a3f3a);

    this.torso = scene.add.rectangle(0, 4, 24, 20, 0xb6423f);
    this.jacketHighlight = scene.add.rectangle(0, -2, 20, 4, 0xd46a55, 0.9);

    this.armL = scene.add.rectangle(-16, 4, 6, 16, 0xf2d4b9);
    this.armR = scene.add.rectangle(16, 4, 6, 16, 0xf2d4b9);

    this.head = scene.add.rectangle(0, -12, 18, 16, 0xf4dcc5);
    this.hair = scene.add.rectangle(0, -19, 18, 6, 0x7b4e2f);
    this.hatMain = scene.add.rectangle(0, -24, 20, 6, 0xb83e3b);
    this.hatBrim = scene.add.rectangle(0, -20, 24, 2, 0x8f2f2d);

    this.eyeL = scene.add.rectangle(-4, -11, 2, 2, 0x121212);
    this.eyeR = scene.add.rectangle(4, -11, 2, 2, 0x121212);

    this.rod = scene.add.rectangle(22, -5, 26, 3, 0x6f5236);
    this.rod.setVisible(false);
    this.reel = scene.add.rectangle(11, -5, 4, 4, 0x35322f);
    this.reel.setVisible(false);

    this.container.add([
      this.shadow,
      this.bootsL,
      this.bootsR,
      this.legsL,
      this.legsR,
      this.torso,
      this.jacketHighlight,
      this.armL,
      this.armR,
      this.head,
      this.hair,
      this.hatMain,
      this.hatBrim,
      this.eyeL,
      this.eyeR,
      this.rod,
      this.reel
    ]);

    this.applyFacing();
    this.applyModePose();
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(Math.round(x), Math.round(y));
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  getRodTipWorldPoint(): Point {
    return computeRodTipWorldPoint({
      containerX: this.container.x,
      containerY: this.container.y,
      containerScaleX: this.container.scaleX,
      rodX: this.rod.x,
      rodY: this.rod.y,
      rodWidth: this.rod.width,
      rodRotation: this.rod.rotation,
      rodVisible: this.rod.visible,
      fallbackX: this.armR.x + 8,
      fallbackY: this.armR.y - 2
    });
  }

  setFacing(facing: FacingDirection): void {
    if (this.facing === facing) {
      return;
    }
    this.facing = facing;
    this.applyFacing();
  }

  setMode(mode: PlayerAnimMode): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.applyModePose();
  }

  update(deltaMs: number): void {
    this.timer += deltaMs;

    if (this.mode === "walk") {
      const step = Math.sin(this.timer * 0.032);
      const lift = Math.round(step * 2);
      const arm = Math.round(step * 2);

      this.legsL.y = 15 + lift;
      this.legsR.y = 15 - lift;
      this.bootsL.y = 20 + lift;
      this.bootsR.y = 20 - lift;
      this.armL.y = 4 - arm;
      this.armR.y = 4 + arm;
      return;
    }

    if (this.mode === "fish_wait") {
      const sway = Math.sin(this.timer * 0.01);
      this.armR.rotation = 0.42 + sway * 0.07;
      this.rod.rotation = 0.22 + sway * 0.05;
      this.reel.rotation = this.rod.rotation;
      return;
    }

    if (this.mode === "fish_reel") {
      const pull = Math.sin(this.timer * 0.046);
      this.armR.y = 1 + Math.round(pull * 3);
      this.armR.rotation = -0.2 + pull * 0.16;
      this.rod.rotation = -0.28 + pull * 0.1;
      this.reel.rotation = this.rod.rotation;
      return;
    }

    if (this.mode === "fish_cast") {
      const t = Math.min(1, (this.timer % 500) / 500);
      this.armR.rotation = -0.7 + t * 1.35;
      this.rod.rotation = -0.62 + t * 1.08;
      this.reel.rotation = this.rod.rotation;
      return;
    }

    if (this.mode === "boat_sit") {
      const bob = Math.round(Math.sin(this.timer * 0.009) * 1);
      this.torso.y = 1 + bob;
      this.jacketHighlight.y = -4 + bob;
      this.armL.y = 2 + bob;
      this.armR.y = 2 + bob;
      this.head.y = -13 + bob;
      this.hair.y = -20 + bob;
      this.hatMain.y = -25 + bob;
      this.hatBrim.y = -21 + bob;
      this.eyeL.y = -12 + bob;
      this.eyeR.y = -12 + bob;
      return;
    }

    const idleBreath = Math.round(Math.sin(this.timer * 0.007) * 1);
    this.torso.y = 4 + idleBreath;
    this.armL.y = 4 + idleBreath;
    this.armR.y = 4 + idleBreath;
    this.head.y = -12 + idleBreath;
    this.hair.y = -19 + idleBreath;
    this.hatMain.y = -24 + idleBreath;
    this.hatBrim.y = -20 + idleBreath;
    this.eyeL.y = -11 + idleBreath;
    this.eyeR.y = -11 + idleBreath;
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private applyFacing(): void {
    this.eyeL.setVisible(this.facing !== "up");
    this.eyeR.setVisible(this.facing !== "up");

    if (this.facing === "left") {
      this.container.scaleX = -1;
    } else {
      this.container.scaleX = 1;
    }

    if (this.facing === "up") {
      this.hair.setVisible(false);
      this.torso.fillColor = 0x9f3430;
      this.jacketHighlight.fillColor = 0xbf4f45;
      return;
    }

    this.hair.setVisible(true);
    this.torso.fillColor = 0xb6423f;
    this.jacketHighlight.fillColor = 0xd46a55;
  }

  private applyModePose(): void {
    this.timer = 0;
    this.legsL.rotation = 0;
    this.legsR.rotation = 0;
    this.armL.rotation = 0;
    this.armR.rotation = 0;
    this.rod.rotation = 0;
    this.reel.rotation = 0;

    this.legsL.y = 15;
    this.legsR.y = 15;
    this.bootsL.y = 20;
    this.bootsR.y = 20;
    this.armL.x = -16;
    this.armR.x = 16;
    this.armL.y = 4;
    this.armR.y = 4;
    this.armL.setSize(6, 16);
    this.armR.setSize(6, 16);
    this.torso.setSize(24, 20);
    this.jacketHighlight.setSize(20, 4);
    this.torso.y = 4;
    this.head.y = -12;
    this.hair.y = -19;
    this.hatMain.y = -24;
    this.hatBrim.y = -20;
    this.eyeL.y = -11;
    this.eyeR.y = -11;

    if (this.mode.startsWith("fish_")) {
      this.shadow.setVisible(true);
      this.legsL.setVisible(true);
      this.legsR.setVisible(true);
      this.bootsL.setVisible(true);
      this.bootsR.setVisible(true);
      this.rod.setVisible(true);
      this.reel.setVisible(true);
      this.armR.rotation = 0.28;
      this.rod.rotation = 0.18;
      this.reel.rotation = 0.18;
      return;
    }

    if (this.mode === "boat_sit") {
      this.shadow.setVisible(false);
      this.legsL.setVisible(false);
      this.legsR.setVisible(false);
      this.bootsL.setVisible(false);
      this.bootsR.setVisible(false);
      this.rod.setVisible(false);
      this.reel.setVisible(false);

      // Boat pose: only upper body should be visible above the boat rim.
      this.torso.setSize(22, 10);
      this.jacketHighlight.setSize(18, 3);
      this.torso.y = 1;
      this.jacketHighlight.y = -4;

      this.armL.setSize(5, 9);
      this.armR.setSize(5, 9);
      this.armL.x = -12;
      this.armR.x = 12;
      this.armL.y = 2;
      this.armR.y = 2;

      this.head.y = -13;
      this.hair.y = -20;
      this.hatMain.y = -25;
      this.hatBrim.y = -21;
      this.eyeL.y = -12;
      this.eyeR.y = -12;
      return;
    }

    this.shadow.setVisible(true);
    this.legsL.setVisible(true);
    this.legsR.setVisible(true);
    this.bootsL.setVisible(true);
    this.bootsR.setVisible(true);
    this.rod.setVisible(false);
    this.reel.setVisible(false);
  }
}
