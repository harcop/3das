import { BoxGeometry, BufferAttribute, BufferGeometry, Mesh } from "three";
import { describe, expect, it } from "vitest";
import { bytesToSize, collectBounds, collectStats } from "./scene-utils";

function meshTriangleList(unsharedTriangles: number) {
  const position = new Float32Array(unsharedTriangles * 9);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  return new Mesh(geometry);
}

function meshIndexed(triangleCount: number) {
  const vertexCount = triangleCount + 2;
  const position = new Float32Array(vertexCount * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));

  const indexArray = new Uint32Array(triangleCount * 3);
  for (let i = 0; i < triangleCount * 3; i++) {
    indexArray[i] = Math.min(vertexCount - 1, i % vertexCount);
  }
  geometry.setIndex(Array.from(indexArray));
  return new Mesh(geometry);
}

describe("scene-utils", () => {
  it("bytesToSize renders human-readable units", () => {
    expect(bytesToSize(512)).toBe("512 B");
    expect(bytesToSize(2048)).toBe("2.0 KB");
    expect(bytesToSize(3 * 1024 * 1024)).toBe("3.00 MB");
  });

  it("collectStats derives triangles from non-indexed meshes", () => {
    expect(collectStats(meshTriangleList(2))).toEqual({ polygons: 2, vertices: 6 });
  });

  it("collectStats derives triangles from index buffers", () => {
    const mesh = meshIndexed(4);
    expect(collectStats(mesh)).toEqual({
      polygons: 4,
      vertices: mesh.geometry.getAttribute("position").count
    });
  });

  it("collectBounds respects mesh bounds", () => {
    const mesh = new Mesh(new BoxGeometry(2, 4, 2));
    const bounds = collectBounds(mesh);
    expect(bounds.size.y).toBeCloseTo(4);
    expect(bounds.radius).toBeGreaterThan(1);
  });
});
