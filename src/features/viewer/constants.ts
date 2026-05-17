import type { AssetItem, PrimitiveKind } from "./types";

export const BASE_ASSETS: AssetItem[] = [
  {
    id: "transport-proxy",
    name: "Transport Prototype",
    category: "Transport",
    format: ".glb",
    sizeBytes: 680_000,
    source: "procedural",
    proceduralKind: "transport"
  },
  {
    id: "gear-assembly",
    name: "Gear Assembly",
    category: "Mechanical",
    format: ".obj",
    sizeBytes: 410_000,
    source: "procedural",
    proceduralKind: "mechanical"
  },
  {
    id: "tower-block",
    name: "Tower Block",
    category: "Architecture",
    format: ".fbx",
    sizeBytes: 820_000,
    source: "procedural",
    proceduralKind: "architecture"
  }
];

export const PRIMITIVE_KINDS: PrimitiveKind[] = ["cube", "sphere", "cylinder", "cone", "torus", "plane"];

export const PRIMITIVE_LABELS: Record<PrimitiveKind, string> = {
  cube: "Cube",
  sphere: "Sphere",
  cylinder: "Cylinder",
  cone: "Cone",
  torus: "Torus",
  plane: "Plane"
};
