import type { Vector3 } from "three";

export type RenderMode = "Solid" | "Wireframe" | "Texture" | "X-Ray";
export type CameraMode = "Perspective" | "Orthographic";
export type Format = ".glb" | ".gltf" | ".obj" | ".fbx" | ".primitive";
export type PrimitiveKind = "cube" | "sphere" | "cylinder" | "cone" | "torus" | "plane";

export type AssetItem = {
  id: string;
  name: string;
  category: string;
  format: Format;
  sizeBytes: number;
  source: "procedural" | "file" | "primitive";
  proceduralKind?: "transport" | "mechanical" | "architecture";
  primitiveKind?: PrimitiveKind;
  fileUrl?: string;
};

export type Stats = { polygons: number; vertices: number };
export type Bounds = { center: Vector3; size: Vector3; radius: number };
