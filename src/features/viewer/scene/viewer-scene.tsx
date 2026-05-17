"use client";

import { Suspense, useCallback, useEffect, useRef } from "react";
import { ThreeEvent, useThree } from "@react-three/fiber";
import { Environment, GizmoHelper, GizmoViewport, Grid, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Group, MathUtils, Object3D, Vector3 } from "three";
import type { AssetItem, Bounds, RenderMode, Stats } from "../types";
import { ViewerAssetErrorBoundary } from "../viewer-asset-error-boundary";
import { collectBounds, collectStats } from "../scene-utils";
import { ImportedModel, PrimitiveShapeModel, ProceduralModel } from "./viewer-models";

export function ViewerSceneContent({
  asset,
  renderMode,
  rotation,
  zoom,
  showGrid,
  showEnvironment,
  environmentIntensity,
  showDirectLight,
  showShadows,
  resetSignal,
  onCanvasReady,
  onModelReady,
  onAssetLoadError
}: {
  asset: AssetItem;
  renderMode: RenderMode;
  rotation: { x: number; y: number; z: number };
  zoom: number;
  showGrid: boolean;
  showEnvironment: boolean;
  environmentIntensity: number;
  showDirectLight: boolean;
  showShadows: boolean;
  resetSignal: number;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  onModelReady: (stats: Stats, polygonsOverBudget: boolean) => void;
  onAssetLoadError: (message: string) => void;
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const groupRef = useRef<Group>(null);
  const boundsRef = useRef<Bounds>({ center: new Vector3(), size: new Vector3(1, 1, 1), radius: 2 });

  const positionCamera = useCallback(() => {
    const radius = boundsRef.current.radius;
    const distance = Math.max(2, radius * 2.7 * zoom);
    camera.position.set(distance, distance * 0.75, distance);
    controlsRef.current?.target.set(0, boundsRef.current.size.y * 0.35, 0);
    controlsRef.current?.update();
  }, [camera, zoom]);

  useEffect(() => {
    onCanvasReady(gl.domElement);
  }, [gl, onCanvasReady]);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.set(
      MathUtils.degToRad(rotation.x),
      MathUtils.degToRad(rotation.y),
      MathUtils.degToRad(rotation.z)
    );
  }, [rotation]);

  useEffect(() => {
    positionCamera();
  }, [positionCamera, resetSignal]);

  const handleReady = useCallback(
    (object: Object3D) => {
      const stats = collectStats(object);
      const bounds = collectBounds(object);
      object.position.sub(bounds.center);
      object.position.y = bounds.size.y * 0.5;
      boundsRef.current = bounds;
      positionCamera();
      onModelReady(stats, stats.polygons > 2_000_000);
    },
    [onModelReady, positionCamera]
  );

  return (
    <>
      <color attach="background" args={["#404040"]} />
      <ambientLight intensity={0.3 + environmentIntensity * 0.85} />
      {showDirectLight && <directionalLight position={[6, 7, 2]} intensity={1.2} castShadow={showShadows} />}
      {showEnvironment && <Environment preset="city" environmentIntensity={environmentIntensity} />}

      <group ref={groupRef}>
        <group
          onDoubleClick={(event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            controlsRef.current?.target.copy(event.point);
            controlsRef.current?.update();
          }}
        >
          {asset.source === "procedural" && asset.proceduralKind ? (
            <ProceduralModel kind={asset.proceduralKind} renderMode={renderMode} onReady={handleReady} />
          ) : asset.source === "primitive" && asset.primitiveKind ? (
            <PrimitiveShapeModel kind={asset.primitiveKind} renderMode={renderMode} onReady={handleReady} />
          ) : (
            <Suspense fallback={null}>
              <ViewerAssetErrorBoundary key={asset.id} onError={onAssetLoadError}>
                <ImportedModel asset={asset} renderMode={renderMode} onReady={handleReady} />
              </ViewerAssetErrorBoundary>
            </Suspense>
          )}
        </group>
      </group>

      {showGrid && (
        <Grid
          args={[30, 30]}
          sectionColor="#5c5c5c"
          cellColor="#4a4a4a"
          fadeDistance={22}
          fadeStrength={1.65}
          infiniteGrid
        />
      )}
      <OrbitControls ref={controlsRef} enableDamping />
      <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
        <GizmoViewport axisColors={["#c75454", "#6b9fd4", "#6eb572"]} labelColor="#c8c8c8" />
      </GizmoHelper>
    </>
  );
}
