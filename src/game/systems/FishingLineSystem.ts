import type { Point } from "../types";

export function getRoundedLineOrigin(point: Point): Point {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y)
  };
}
