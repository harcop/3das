import {
  Box3,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type Material
} from "three";
import type { Bounds, RenderMode, Stats } from "./types";

export function bytesToSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function collectStats(object: Object3D): Stats {
  let vertices = 0;
  let polygons = 0;
  object.traverse((node) => {
    if (!(node instanceof Mesh) || !node.geometry) return;
    const position = node.geometry.getAttribute("position");
    if (position) vertices += position.count;
    if (node.geometry.index) polygons += Math.floor(node.geometry.index.count / 3);
    else if (position) polygons += Math.floor(position.count / 3);
  });
  return { polygons, vertices };
}

export function collectBounds(object: Object3D): Bounds {
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.75 || 1.5;
  return { center, size, radius };
}

function disposeMaterial(material: Material | Material[] | null | undefined) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((m) => m.dispose());
    return;
  }
  material.dispose();
}

export function disposeObject3D(root: Object3D) {
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    disposeMaterial(node.material);
    node.geometry?.dispose();
  });
}

const VIEWER_MATERIAL_TAG = "__viewerAppliedMaterial";

export function applyRenderMode(object: Object3D, mode: RenderMode) {
  object.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const prior = Array.isArray(node.material) ? node.material[0] : node.material;
    const base = prior instanceof MeshStandardMaterial ? prior : new MeshStandardMaterial({ color: "#8a9099" });
    const oldMats = Array.isArray(node.material) ? node.material : [node.material];
    oldMats.forEach((m) => {
      if (m && (m as Material & { userData?: Record<string, unknown> }).userData?.[VIEWER_MATERIAL_TAG]) {
        m.dispose();
      }
    });
    let nextMaterial: MeshBasicMaterial | MeshLambertMaterial | MeshStandardMaterial;
    if (mode === "Wireframe") {
      nextMaterial = new MeshBasicMaterial({ color: new Color("#b0b5bd"), wireframe: true });
    } else if (mode === "Texture") {
      nextMaterial = new MeshLambertMaterial({ color: base.color, map: base.map ?? null });
    } else if (mode === "X-Ray") {
      nextMaterial = new MeshStandardMaterial({
        color: base.color,
        transparent: true,
        opacity: 0.36,
        roughness: 0.75,
        metalness: 0.1
      });
    } else {
      nextMaterial = new MeshStandardMaterial({
        color: base.color,
        map: base.map ?? null,
        roughness: base.roughness ?? 0.7,
        metalness: base.metalness ?? 0.1
      });
    }
    nextMaterial.userData = { ...nextMaterial.userData, [VIEWER_MATERIAL_TAG]: true };
    node.material = nextMaterial;
    node.castShadow = true;
    node.receiveShadow = true;
  });
}
