import type { Point } from "../types";

export interface MobileDirections {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export function normalizeVector(x: number, y: number): Point {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

export function computeMoveVectorFromInputs(
  keyboardX: number,
  keyboardY: number,
  mobileDirections: MobileDirections
): Point {
  const mobileX = (mobileDirections.right ? 1 : 0) - (mobileDirections.left ? 1 : 0);
  const mobileY = (mobileDirections.down ? 1 : 0) - (mobileDirections.up ? 1 : 0);
  return normalizeVector(keyboardX + mobileX, keyboardY + mobileY);
}

export function shouldConsumeMenuToggle(keyboardToggle: boolean, menuPressed: boolean): boolean {
  return keyboardToggle || menuPressed;
}
