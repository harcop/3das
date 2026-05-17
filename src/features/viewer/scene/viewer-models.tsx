"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import { DoubleSide } from "three";
import type { Group, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import type { AssetItem, PrimitiveKind, RenderMode } from "../types";
import { applyRenderMode, disposeObject3D } from "../scene-utils";
import { meshVisualForRenderMode } from "./render-mode-mesh-style";

export function ProceduralModel({
  kind,
  renderMode,
  onReady
}: {
  kind: NonNullable<AssetItem["proceduralKind"]>;
  renderMode: RenderMode;
  onReady: (root: Object3D) => void;
}) {
  const ref = useRef<Group>(null);
  /* Layout / bounds only depend on geometry kind, not shading mode (avoids redundant camera refits). */
  useEffect(() => {
    if (ref.current) onReady(ref.current);
  }, [kind, onReady]);

  const style = meshVisualForRenderMode(renderMode);
  const color = kind === "transport" ? "#7a8aa0" : kind === "mechanical" ? "#8a9588" : "#9a9080";

  return (
    <group ref={ref}>
      {kind === "transport" && (
        <group>
          <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
            <boxGeometry args={[2.2, 0.9, 1.2]} />
            <meshStandardMaterial color={color} {...style} />
          </mesh>
          {[
            [-0.8, 0.1, 0.7],
            [0.8, 0.1, 0.7],
            [-0.8, 0.1, -0.7],
            [0.8, 0.1, -0.7]
          ].map((pos, idx) => (
            <mesh key={idx} castShadow receiveShadow position={pos as [number, number, number]}>
              <cylinderGeometry args={[0.28, 0.28, 0.2, 24]} />
              <meshStandardMaterial color="#3d4249" {...style} />
            </mesh>
          ))}
        </group>
      )}
      {kind === "mechanical" && (
        <group>
          <mesh castShadow receiveShadow>
            <torusKnotGeometry args={[0.8, 0.22, 180, 24]} />
            <meshStandardMaterial color={color} {...style} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.8, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.5, 24]} />
            <meshStandardMaterial color="#5c646e" {...style} />
          </mesh>
        </group>
      )}
      {kind === "architecture" && (
        <group>
          <mesh castShadow receiveShadow position={[0, 0.8, 0]}>
            <boxGeometry args={[1.6, 1.8, 1.6]} />
            <meshStandardMaterial color={color} {...style} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 2.1, 0]}>
            <coneGeometry args={[0.92, 0.72, 8]} />
            <meshStandardMaterial color="#6b5c4c" {...style} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function PrimitiveShapeModel({
  kind,
  renderMode,
  onReady
}: {
  kind: PrimitiveKind;
  renderMode: RenderMode;
  onReady: (root: Object3D) => void;
}) {
  const ref = useRef<Group>(null);

  useEffect(() => {
    if (ref.current) onReady(ref.current);
  }, [kind, onReady]);

  const style = meshVisualForRenderMode(renderMode);
  const matColor = "#8e949d";

  return (
    <group ref={ref}>
      {kind === "cube" && (
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={matColor} {...style} />
        </mesh>
      )}
      {kind === "sphere" && (
        <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.6, 32, 24]} />
          <meshStandardMaterial color={matColor} {...style} />
        </mesh>
      )}
      {kind === "cylinder" && (
        <mesh castShadow receiveShadow position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 1.3, 32]} />
          <meshStandardMaterial color={matColor} {...style} />
        </mesh>
      )}
      {kind === "cone" && (
        <mesh castShadow receiveShadow position={[0, 0.7, 0]}>
          <coneGeometry args={[0.55, 1.4, 32]} />
          <meshStandardMaterial color={matColor} {...style} />
        </mesh>
      )}
      {kind === "torus" && (
        <mesh castShadow receiveShadow position={[0, 0.8, 0]}>
          <torusGeometry args={[0.6, 0.2, 24, 48]} />
          <meshStandardMaterial color={matColor} {...style} />
        </mesh>
      )}
      {kind === "plane" && (
        <mesh castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[2, 2]} />
          <meshStandardMaterial color={matColor} side={DoubleSide} {...style} />
        </mesh>
      )}
    </group>
  );
}

function GLTFModel({ asset, renderMode, onReady }: { asset: AssetItem; renderMode: RenderMode; onReady: (obj: Object3D) => void }) {
  const gltf = useLoader(GLTFLoader, asset.fileUrl!) as { scene: Object3D };
  const object = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  useEffect(() => {
    applyRenderMode(object, renderMode);
    onReady(object);
  }, [object, renderMode, onReady]);
  useEffect(() => {
    return () => disposeObject3D(object);
  }, [object]);
  return <primitive object={object} />;
}

function OBJModel({ asset, renderMode, onReady }: { asset: AssetItem; renderMode: RenderMode; onReady: (obj: Object3D) => void }) {
  const obj = useLoader(OBJLoader, asset.fileUrl!) as Object3D;
  const object = useMemo(() => obj.clone(true), [obj]);
  useEffect(() => {
    applyRenderMode(object, renderMode);
    onReady(object);
  }, [object, renderMode, onReady]);
  useEffect(() => {
    return () => disposeObject3D(object);
  }, [object]);
  return <primitive object={object} />;
}

function FBXModel({ asset, renderMode, onReady }: { asset: AssetItem; renderMode: RenderMode; onReady: (obj: Object3D) => void }) {
  const fbx = useLoader(FBXLoader, asset.fileUrl!) as Object3D;
  const object = useMemo(() => fbx.clone(true), [fbx]);
  useEffect(() => {
    applyRenderMode(object, renderMode);
    onReady(object);
  }, [object, renderMode, onReady]);
  useEffect(() => {
    return () => disposeObject3D(object);
  }, [object]);
  return <primitive object={object} />;
}

export function ImportedModel({ asset, renderMode, onReady }: { asset: AssetItem; renderMode: RenderMode; onReady: (obj: Object3D) => void }) {
  if (!asset.fileUrl) return null;
  if (asset.format === ".obj") return <OBJModel asset={asset} renderMode={renderMode} onReady={onReady} />;
  if (asset.format === ".fbx") return <FBXModel asset={asset} renderMode={renderMode} onReady={onReady} />;
  return <GLTFModel asset={asset} renderMode={renderMode} onReady={onReady} />;
}