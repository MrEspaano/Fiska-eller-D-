import { TILE_SIZE } from "./waters";
import type {
  CabinCollisionLayout,
  DockPlacement,
  HouseLayout,
  InteractionZones,
  NpcPlacement,
  Point,
  RectZone,
  UnlockGateLayout
} from "../types";

export const WORLD_W_TILES = 60;
export const WORLD_H_TILES = 40;
export const WORLD_W = WORLD_W_TILES * TILE_SIZE;
export const WORLD_H = WORLD_H_TILES * TILE_SIZE;

export const CABIN_W_TILES = 30;
export const CABIN_H_TILES = 20;
export const CABIN_W = CABIN_W_TILES * TILE_SIZE;
export const CABIN_H = CABIN_H_TILES * TILE_SIZE;

function rectFromTiles(tx: number, ty: number, wTiles: number, hTiles: number): RectZone {
  return {
    x: tx * TILE_SIZE,
    y: ty * TILE_SIZE,
    width: wTiles * TILE_SIZE,
    height: hTiles * TILE_SIZE
  };
}

export function pointFromTile(tx: number, ty: number): Point {
  return {
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2
  };
}

export function isPointInRect(point: Point, rect: RectZone): boolean {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
}

export const HOUSE_LAYOUT: HouseLayout = {
  bounds: rectFromTiles(2, 2, 6, 5),
  doorTrigger: rectFromTiles(4, 7, 2, 1),
  doorPosition: pointFromTile(5, 6)
};

export const CAMPFIRES: Point[] = [
  pointFromTile(26, 6),
  pointFromTile(51, 32)
];

export const DOCKS: DockPlacement[] = [
  {
    waterId: "lake",
    rect: rectFromTiles(19, 30, 4, 2),
    boatSpawn: pointFromTile(21, 29),
    boardPoint: pointFromTile(21, 32)
  },
  {
    waterId: "river",
    rect: rectFromTiles(43, 34, 3, 2),
    boatSpawn: pointFromTile(44, 33),
    boardPoint: pointFromTile(44, 37)
  }
];

export const WORLD_NPCS: NpcPlacement[] = [
  { id: "npc-fiskare", x: pointFromTile(23, 15).x, y: pointFromTile(23, 15).y, facing: "down", variant: 0 },
  { id: "npc-vandrare", x: pointFromTile(16, 22).x, y: pointFromTile(16, 22).y, facing: "left", variant: 1 },
  { id: "npc-guide", x: pointFromTile(11, 11).x, y: pointFromTile(11, 11).y, facing: "down", variant: 2 },
  { id: "npc-ungdom", x: pointFromTile(45, 10).x, y: pointFromTile(45, 10).y, facing: "right", variant: 3 },
  { id: "npc-brygga", x: pointFromTile(33, 33).x, y: pointFromTile(33, 33).y, facing: "up", variant: 4 }
];

export const UNLOCK_GATES: UnlockGateLayout[] = [
  {
    waterId: "skogstjarn",
    lockedArea: rectFromTiles(0, 23, 15, 17),
    barrier: rectFromTiles(14, 25, 1, 9),
    signPosition: pointFromTile(14, 29),
    markerPosition: pointFromTile(8, 31)
  },
  {
    waterId: "klippsjon",
    lockedArea: rectFromTiles(47, 0, 13, 14),
    barrier: rectFromTiles(46, 4, 1, 8),
    signPosition: pointFromTile(46, 8),
    markerPosition: pointFromTile(54, 6)
  },
  {
    waterId: "myrkanal",
    lockedArea: rectFromTiles(50, 22, 10, 18),
    barrier: rectFromTiles(49, 24, 1, 10),
    signPosition: pointFromTile(49, 29),
    markerPosition: pointFromTile(54, 31)
  }
];

export const CABIN_INTERACTION_ZONES: InteractionZones = {
  freezer: rectFromTiles(3, 3, 4, 3),
  stove: rectFromTiles(21, 3, 4, 3),
  exit: rectFromTiles(13, 18, 4, 2)
};

export const CABIN_COLLISION_ZONES: CabinCollisionLayout = {
  furnitureBlocks: [
    rectFromTiles(3, 3, 4, 2),
    rectFromTiles(21, 3, 4, 2),
    rectFromTiles(14, 8, 6, 3),
    rectFromTiles(3, 10, 4, 3),
    rectFromTiles(23, 10, 4, 3),
    rectFromTiles(8, 4, 6, 2),
    rectFromTiles(11, 14, 8, 2)
  ]
};
