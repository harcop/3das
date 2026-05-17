import type { RenderMode } from "../types";

export type MeshVisualStyle = Pick<
  { wireframe?: boolean; transparent?: boolean; opacity?: number; flatShading?: boolean },
  "wireframe" | "transparent" | "opacity" | "flatShading"
>;

/** Standard material extras used by JSX procedural/primitive meshes (not imported GLBs). */
export function meshVisualForRenderMode(renderMode: RenderMode): MeshVisualStyle {
  switch (renderMode) {
    case "Wireframe":
      return { wireframe: true, transparent: false, opacity: 1, flatShading: false };
    case "Texture":
      return { wireframe: false, transparent: false, opacity: 1, flatShading: true };
    case "X-Ray":
      return { wireframe: false, transparent: true, opacity: 0.36, flatShading: false };
    default:
      return { wireframe: false, transparent: false, opacity: 1, flatShading: false };
  }
}
