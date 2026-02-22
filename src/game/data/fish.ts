import type { FishSpecies, WaterId, ZoneId } from "../types";

const Z = (weights: Partial<Record<ZoneId, number>>) => weights;
const W = (...ids: WaterId[]) => ids;

export const FISH_SPECIES: FishSpecies[] = [
  {
    id: "gadda",
    nameSv: "Gädda",
    points: 120,
    rarity: "uncommon",
    allowedWaters: W("lake", "river"),
    zoneWeights: Z({ reed_edge: 7, general: 3 }),
    visualProfile: { baseColor: "#6e8b5d", patternColor: "#405239", finColor: "#566b4b", bodyType: "slim" }
  },
  {
    id: "abborre",
    nameSv: "Abborre",
    points: 90,
    rarity: "common",
    allowedWaters: W("lake", "river"),
    zoneWeights: Z({ reed_edge: 4, general: 8, river_run: 3 }),
    visualProfile: { baseColor: "#9fbb6a", patternColor: "#43513b", finColor: "#d07b3b", bodyType: "normal" }
  },
  {
    id: "gos",
    nameSv: "Gös",
    points: 140,
    rarity: "uncommon",
    allowedWaters: W("lake", "river"),
    zoneWeights: Z({ deep_center: 9, general: 2 }),
    visualProfile: { baseColor: "#9ca686", patternColor: "#50553f", finColor: "#87906f", bodyType: "slim" }
  },
  {
    id: "oring",
    nameSv: "Öring",
    points: 180,
    rarity: "rare",
    allowedWaters: W("lake", "river"),
    zoneWeights: Z({ river_run: 7, general: 2 }),
    visualProfile: { baseColor: "#b08f71", patternColor: "#432f2c", finColor: "#8c6b53", bodyType: "normal" }
  },
  {
    id: "lax",
    nameSv: "Lax",
    points: 220,
    rarity: "rare",
    allowedWaters: W("lake", "river"),
    zoneWeights: Z({ river_run: 6, deep_center: 3 }),
    visualProfile: { baseColor: "#a8adb2", patternColor: "#6f7c82", finColor: "#8f969a", bodyType: "slim" }
  },
  {
    id: "regnbage",
    nameSv: "Regnbåge",
    points: 210,
    rarity: "rare",
    allowedWaters: W("lake", "river"),
    zoneWeights: Z({ river_run: 6, general: 3 }),
    visualProfile: { baseColor: "#a7b3bd", patternColor: "#d37f87", finColor: "#8e9aa3", bodyType: "normal" }
  },
  {
    id: "mort",
    nameSv: "Mört",
    points: 60,
    rarity: "common",
    allowedWaters: W("lake", "river"),
    zoneWeights: Z({ general: 8, reed_edge: 4 }),
    visualProfile: { baseColor: "#b3b5af", patternColor: "#7f847f", finColor: "#c06f5a", bodyType: "normal" }
  },
  {
    id: "braxen",
    nameSv: "Braxen",
    points: 75,
    rarity: "common",
    allowedWaters: W("lake"),
    zoneWeights: Z({ general: 6, deep_center: 4 }),
    visualProfile: { baseColor: "#9c9579", patternColor: "#706a51", finColor: "#877f66", bodyType: "wide" }
  },
  {
    id: "sik",
    nameSv: "Sik",
    points: 130,
    rarity: "uncommon",
    allowedWaters: W("lake"),
    zoneWeights: Z({ deep_center: 6, general: 2 }),
    visualProfile: { baseColor: "#c5c7c3", patternColor: "#7f888a", finColor: "#a2a7a4", bodyType: "slim" }
  },
  {
    id: "harr",
    nameSv: "Harr",
    points: 150,
    rarity: "uncommon",
    allowedWaters: W("river"),
    zoneWeights: Z({ river_run: 7, general: 2 }),
    visualProfile: { baseColor: "#9fa193", patternColor: "#595b52", finColor: "#7b6d84", bodyType: "normal" }
  },
  {
    id: "sarv",
    nameSv: "Sarv",
    points: 70,
    rarity: "common",
    allowedWaters: W("lake", "river"),
    zoneWeights: Z({ reed_edge: 7, general: 4 }),
    visualProfile: { baseColor: "#b59f72", patternColor: "#71624a", finColor: "#c06d4b", bodyType: "normal" }
  },
  {
    id: "id",
    nameSv: "Id",
    points: 95,
    rarity: "uncommon",
    allowedWaters: W("river", "lake"),
    zoneWeights: Z({ general: 5, river_run: 4 }),
    visualProfile: { baseColor: "#9fa8a1", patternColor: "#5f6a64", finColor: "#89938d", bodyType: "normal" }
  }
];

export function getSpeciesById(id: string): FishSpecies | undefined {
  return FISH_SPECIES.find((f) => f.id === id);
}
