"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Canvas, ThreeEvent, useLoader, useThree } from "@react-three/fiber";
import { Environment, GizmoHelper, GizmoViewport, Grid, OrbitControls } from "@react-three/drei";
import { Group, MathUtils, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BASE_ASSETS, PRIMITIVE_KINDS, PRIMITIVE_LABELS } from "@/components/viewer/constants";
import { applyRenderMode, bytesToSize, collectBounds, collectStats, disposeObject3D } from "@/components/viewer/scene-utils";
import type { AssetItem, Bounds, CameraMode, Format, PrimitiveKind, RenderMode, Stats } from "@/components/viewer/types";

function PropertySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border">
      <div className="blender-panel-header">{title}</div>
      <div className="space-y-2 px-2 py-1.5">{children}</div>
    </div>
  );
}


function ProceduralModel({
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

  const style =
    renderMode === "Wireframe"
      ? { wireframe: true, transparent: false, opacity: 1, flatShading: false }
      : renderMode === "Texture"
        ? { wireframe: false, transparent: false, opacity: 1, flatShading: true }
        : renderMode === "X-Ray"
          ? { wireframe: false, transparent: true, opacity: 0.36, flatShading: false }
          : { wireframe: false, transparent: false, opacity: 1, flatShading: false };

  const color = kind === "transport" ? "#7a8aa0" : kind === "mechanical" ? "#8a9588" : "#9a9080";

  return (
    <group ref={ref}>
      {kind === "transport" && (
        <group>
          <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
            <boxGeometry args={[2.2, 0.9, 1.2]} />
            <meshStandardMaterial color={color} {...style} />
          </mesh>
          {[[-0.8, 0.1, 0.7], [0.8, 0.1, 0.7], [-0.8, 0.1, -0.7], [0.8, 0.1, -0.7]].map((pos, idx) => (
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

function PrimitiveShapeModel({
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

  const style =
    renderMode === "Wireframe"
      ? { wireframe: true, transparent: false, opacity: 1, flatShading: false }
      : renderMode === "Texture"
        ? { wireframe: false, transparent: false, opacity: 1, flatShading: true }
        : renderMode === "X-Ray"
          ? { wireframe: false, transparent: true, opacity: 0.36, flatShading: false }
          : { wireframe: false, transparent: false, opacity: 1, flatShading: false };

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
          <meshStandardMaterial color={matColor} side={2} {...style} />
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

function ImportedModel({ asset, renderMode, onReady }: { asset: AssetItem; renderMode: RenderMode; onReady: (obj: Object3D) => void }) {
  if (!asset.fileUrl) return null;
  if (asset.format === ".obj") return <OBJModel asset={asset} renderMode={renderMode} onReady={onReady} />;
  if (asset.format === ".fbx") return <FBXModel asset={asset} renderMode={renderMode} onReady={onReady} />;
  return <GLTFModel asset={asset} renderMode={renderMode} onReady={onReady} />;
}

function SceneContent({
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
  onModelReady
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
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
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
              <ImportedModel asset={asset} renderMode={renderMode} onReady={handleReady} />
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

export function ViewerApp() {
  const [assets, setAssets] = useState<AssetItem[]>(BASE_ASSETS);
  const [selectedId, setSelectedId] = useState(BASE_ASSETS[0].id);
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<Format | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>("Solid");
  const [cameraMode, setCameraMode] = useState<CameraMode>("Perspective");
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showEnvironment, setShowEnvironment] = useState(true);
  const [environmentIntensity, setEnvironmentIntensity] = useState(0.7);
  const [showDirectLight, setShowDirectLight] = useState(true);
  const [showShadows, setShowShadows] = useState(true);
  const [stats, setStats] = useState<Stats>({ polygons: 0, vertices: 0 });
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedAsset = assets.find((a) => a.id === selectedId) ?? assets[0];
  const categories = useMemo(() => Array.from(new Set(assets.map((a) => a.category))), [assets]);

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) => {
        const byName = asset.name.toLowerCase().includes(search.toLowerCase().trim());
        const byFormat = formatFilter === "all" || asset.format === formatFilter;
        const byCategory = categoryFilter === "all" || asset.category === categoryFilter;
        return byName && byFormat && byCategory;
      }),
    [assets, search, formatFilter, categoryFilter]
  );

  const trackedBlobUrls = useRef<Set<string>>(new Set());
  useEffect(() => {
    const next = new Set(assets.filter((a) => a.fileUrl?.startsWith("blob:")).map((a) => a.fileUrl as string));
    trackedBlobUrls.current.forEach((url) => {
      if (!next.has(url)) URL.revokeObjectURL(url);
    });
    trackedBlobUrls.current = next;
  }, [assets]);

  useEffect(() => {
    if (!filteredAssets.length) return;
    if (!filteredAssets.some((a) => a.id === selectedId)) {
      setSelectedId(filteredAssets[0].id);
    }
  }, [filteredAssets, selectedId]);

  useEffect(() => {
    const onFullChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullChange);
    return () => document.removeEventListener("fullscreenchange", onFullChange);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current != null) window.clearTimeout(hoverTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    setShowSpinner(false);
    const timer = window.setTimeout(() => setShowSpinner(true), 300);
    return () => window.clearTimeout(timer);
  }, [selectedAsset.id]);

  const handleImport = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}` as Format;
    if (![".glb", ".gltf", ".obj", ".fbx"].includes(ext)) return;
    const item: AssetItem = {
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      category: "Imported",
      format: ext,
      sizeBytes: file.size,
      source: "file",
      fileUrl: URL.createObjectURL(file)
    };
    setAssets((prev) => [item, ...prev]);
    setSelectedId(item.id);
    event.target.value = "";
  }, []);

  const handleInsertPrimitive = useCallback((kind: PrimitiveKind) => {
    const item: AssetItem = {
      id: `primitive-${kind}-${Date.now()}`,
      name: `${PRIMITIVE_LABELS[kind]} ${assets.filter((a) => a.source === "primitive" && a.primitiveKind === kind).length + 1}`,
      category: "Primitive",
      format: ".primitive",
      sizeBytes: 0,
      source: "primitive",
      primitiveKind: kind
    };
    setAssets((prev) => [item, ...prev]);
    setSelectedId(item.id);
  }, [assets]);

  const triggerFullscreen = useCallback(() => {
    if (!viewportRef.current) return;
    if (!document.fullscreenElement) void viewportRef.current.requestFullscreen?.().catch(() => undefined);
    else void document.exitFullscreen?.().catch(() => undefined);
  }, []);

  const saveSnapshot = useCallback(() => {
    if (!canvasRef.current) return;
    const source = canvasRef.current;
    const target = document.createElement("canvas");
    target.width = source.width * 2;
    target.height = source.height * 2;
    const ctx = target.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(source, 0, 0, target.width, target.height);
    const link = document.createElement("a");
    link.download = `${selectedAsset.name.replace(/\.[^/.]+$/, "") || "snapshot"}-2x.png`;
    link.href = target.toDataURL("image/png");
    link.click();
  }, [selectedAsset.name]);

  const onCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const onModelReady = useCallback((nextStats: Stats, overBudget: boolean) => {
    setStats(nextStats);
    setLoading(false);
    setShowSpinner(false);
    if (overBudget) window.alert("Warning: this model exceeds 2M polygons and may reduce frame rate.");
  }, []);

  const selectClass =
    "h-7 min-w-0 flex-1 rounded-none border border-border bg-secondary px-1.5 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-[11px] text-foreground select-none">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "hidden shrink-0 flex-col border-r border-border bg-card md:flex",
            leftCollapsed ? "w-0 overflow-hidden border-0 opacity-0" : "w-[220px] opacity-100"
          )}
        >
          {!leftCollapsed && (
            <>
              <div className="blender-panel-header">Outliner</div>
              <Input
                aria-label="Search assets"
                className="h-7 rounded-none border-0 border-b border-border bg-card text-[11px] shadow-none focus-visible:ring-0"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex gap-0 border-b border-border">
                <select aria-label="Filter formats" className={cn(selectClass, "border-0 border-r")} value={formatFilter} onChange={(e) => setFormatFilter(e.target.value as Format | "all")}>
                  <option value="all">Format</option>
                  <option value=".glb">.glb</option>
                  <option value=".gltf">.gltf</option>
                  <option value=".obj">.obj</option>
                  <option value=".fbx">.fbx</option>
                  <option value=".primitive">.primitive</option>
                </select>
                <select aria-label="Filter categories" className={cn(selectClass, "border-0")} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">Category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div
                role="listbox"
                tabIndex={0}
                className="min-h-0 flex-1 overflow-y-auto"
                onKeyDown={(e) => {
                  if (!filteredAssets.length) return;
                  const index = Math.max(
                    0,
                    filteredAssets.findIndex((item) => item.id === selectedAsset.id)
                  );
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedId(filteredAssets[(index + 1) % filteredAssets.length].id);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedId(filteredAssets[(index - 1 + filteredAssets.length) % filteredAssets.length].id);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    setResetSignal((v) => v + 1);
                  }
                }}
              >
                {filteredAssets.map((asset) => {
                  const active = asset.id === selectedAsset.id;
                  return (
                    <button
                      key={asset.id}
                      role="option"
                      aria-selected={active}
                      className={cn(
                        "relative flex h-7 w-full items-center gap-1.5 border-b border-border px-1.5 text-left transition-colors hover:bg-muted/40",
                        active && "bg-[var(--blender-selection)]"
                      )}
                      onClick={() => setSelectedId(asset.id)}
                      onMouseEnter={() => {
                        if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
                        hoverTimerRef.current = window.setTimeout(() => setTooltipId(asset.id), 500);
                      }}
                      onMouseLeave={() => {
                        if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
                        setTooltipId(null);
                      }}
                    >
                      <span className="size-4 shrink-0 border border-border bg-muted" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{asset.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{asset.format}</span>
                      {tooltipId === asset.id && (
                        <div className="absolute left-1 top-7 z-10 whitespace-nowrap border border-border bg-popover px-1.5 py-0.5 text-[10px] text-popover-foreground">
                          {stats.polygons.toLocaleString()} tris · {bytesToSize(asset.sizeBytes)} · {asset.category}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept=".glb,.gltf,.obj,.fbx" onChange={handleImport} />
              <div className="grid grid-cols-2 gap-0.5 border-t border-border">
                <Button variant="outline" size="sm" className="h-7 rounded-none border-0 border-r border-border text-[11px] font-normal" onClick={() => handleInsertPrimitive("cube")}>
                  + Cube
                </Button>
                <Button variant="outline" size="sm" className="h-7 rounded-none border-0 text-[11px] font-normal" onClick={() => handleInsertPrimitive("sphere")}>
                  + Sphere
                </Button>
              </div>
              <Button
                aria-label="Import asset"
                variant="outline"
                size="sm"
                className="h-7 w-full rounded-none border-x-0 border-b-0 border-t border-border text-[11px] font-normal"
                onClick={() => fileInputRef.current?.click()}
              >
                Append…
              </Button>
            </>
          )}
        </aside>

        <main ref={viewportRef} className="relative flex min-w-0 flex-1 flex-col bg-[var(--blender-viewport)]">
          <div className="z-30 flex h-7 shrink-0 items-center justify-between border-b border-border bg-muted/50 px-1.5">
            <div className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">
              <span className="truncate text-foreground">{renderMode}</span>
              <span className="text-border">|</span>
              <span className="truncate">{cameraMode === "Perspective" ? "Persp" : "Ortho"}</span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button variant="outline" size="sm" className="h-6 rounded-sm px-2 text-[11px] font-normal" onClick={() => setLeftCollapsed((v) => !v)}>
                Outliner
              </Button>
              <Button variant="outline" size="sm" className="h-6 rounded-sm px-2 text-[11px] font-normal" onClick={() => setRightCollapsed((v) => !v)}>
                Properties
              </Button>
              <Button variant="outline" size="sm" className="h-6 rounded-sm px-2 text-[11px] font-normal" onClick={triggerFullscreen}>
                {isFullscreen ? "Exit" : "Max"}
              </Button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1">
            <Canvas
              key={selectedAsset.id}
              shadows={showShadows}
              dpr={[1, 2]}
              camera={cameraMode === "Perspective" ? { position: [5, 3.8, 5], fov: 50 } : { position: [5, 3.8, 5], zoom: 85 }}
              orthographic={cameraMode === "Orthographic"}
              onPointerMissed={(event) => {
                if ((event as unknown as PointerEvent).detail === 2) setResetSignal((v) => v + 1);
              }}
              aria-label="3D asset viewport"
              className="block h-full w-full"
            >
              <SceneContent
                asset={selectedAsset}
                renderMode={renderMode}
                rotation={rotation}
                zoom={zoom}
                showGrid={showGrid}
                showEnvironment={showEnvironment}
                environmentIntensity={environmentIntensity}
                showDirectLight={showDirectLight}
                showShadows={showShadows}
                resetSignal={resetSignal}
                onCanvasReady={onCanvasReady}
                onModelReady={onModelReady}
              />
            </Canvas>

            {showSpinner && loading && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-0.5 overflow-hidden bg-border">
                <div className="h-full w-full origin-left animate-pulse bg-muted-foreground/60" />
              </div>
            )}
          </div>

          {!isFullscreen && (
            <div className="flex h-6 shrink-0 items-center border-t border-border bg-card px-2 text-[11px] text-muted-foreground">
              <span className="truncate">{selectedAsset.name}</span>
            </div>
          )}

          <div className="absolute bottom-10 left-2 z-40 flex gap-1 md:hidden">
            <Button variant="outline" size="sm" className="h-7 rounded-sm text-[11px] font-normal" onClick={() => setMobileLibraryOpen((v) => !v)}>
              Outliner
            </Button>
            <Button variant="outline" size="sm" className="h-7 rounded-sm text-[11px] font-normal" onClick={() => setMobileControlsOpen((v) => !v)}>
              Props
            </Button>
          </div>
        </main>

        <aside
          className={cn(
            "hidden shrink-0 flex-col border-l border-border bg-card md:flex",
            rightCollapsed ? "w-0 overflow-hidden border-0 opacity-0" : "w-[260px] opacity-100"
          )}
        >
          {!rightCollapsed && (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="blender-panel-header">Properties</div>

              <PropertySection title="Transform">
                {(["x", "y", "z"] as const).map((axis) => (
                  <div key={axis}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="blender-editor-label">Rotation {axis.toUpperCase()}</span>
                      <span className="tabular-nums text-muted-foreground">{Math.round(rotation[axis])}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={rotation[axis]}
                      onChange={(e) =>
                        setRotation((prev) => ({
                          ...prev,
                          [axis]: MathUtils.euclideanModulo(Number(e.target.value), 360)
                        }))
                      }
                      className="blender-range"
                    />
                  </div>
                ))}
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="blender-editor-label">Clip / distance</span>
                    <span className="tabular-nums text-muted-foreground">{zoom.toFixed(2)}×</span>
                  </div>
                  <input
                    aria-label="Camera distance"
                    type="range"
                    min={0.5}
                    max={5}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="blender-range"
                  />
                </div>
                <Button variant="outline" size="sm" className="h-7 w-full rounded-sm text-[11px] font-normal" onClick={() => setRotation({ x: 0, y: 0, z: 0 })}>
                  Reset
                </Button>
              </PropertySection>

              <PropertySection title="Add mesh">
                <div className="grid grid-cols-2 gap-0.5">
                  {PRIMITIVE_KINDS.map((kind) => (
                    <Button
                      key={kind}
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-sm text-[11px] font-normal"
                      onClick={() => handleInsertPrimitive(kind)}
                    >
                      {PRIMITIVE_LABELS[kind]}
                    </Button>
                  ))}
                </div>
              </PropertySection>

              <PropertySection title="Viewport display">
                <div className="grid grid-cols-2 gap-0.5">
                  {(["Solid", "Wireframe", "Texture", "X-Ray"] as RenderMode[]).map((mode) => (
                    <Button
                      key={mode}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-7 rounded-sm text-[11px] font-normal",
                        renderMode === mode && "border-primary bg-primary/25 text-foreground"
                      )}
                      onClick={() => setRenderMode(mode)}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </PropertySection>

              <PropertySection title="Lighting">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="blender-editor-label">World</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(environmentIntensity * 100)}%</span>
                  </div>
                  <input
                    aria-label="Environment intensity"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={environmentIntensity}
                    onChange={(e) => setEnvironmentIntensity(Number(e.target.value))}
                    className="blender-range"
                  />
                </div>
                <label className="flex h-6 items-center gap-2 blender-editor-label">
                  <input type="checkbox" className="size-3 rounded-none border border-border accent-[var(--ring)]" checked={showDirectLight} onChange={(e) => setShowDirectLight(e.target.checked)} />
                  Sun
                </label>
                <label className="flex h-6 items-center gap-2 blender-editor-label">
                  <input type="checkbox" className="size-3 rounded-none border border-border accent-[var(--ring)]" checked={showShadows} onChange={(e) => setShowShadows(e.target.checked)} />
                  Shadows
                </label>
                <label className="flex h-6 items-center gap-2 blender-editor-label">
                  <input type="checkbox" className="size-3 rounded-none border border-border accent-[var(--ring)]" checked={showEnvironment} onChange={(e) => setShowEnvironment(e.target.checked)} />
                  HDRI
                </label>
                <label className="flex h-6 items-center gap-2 blender-editor-label">
                  <input type="checkbox" className="size-3 rounded-none border border-border accent-[var(--ring)]" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                  Grid
                </label>
              </PropertySection>

              <PropertySection title="View">
                <div className="grid grid-cols-2 gap-0.5">
                  {(["Perspective", "Orthographic"] as CameraMode[]).map((mode) => (
                    <Button
                      key={mode}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-7 rounded-sm text-[11px] font-normal",
                        cameraMode === mode && "border-primary bg-primary/25 text-foreground"
                      )}
                      onClick={() => setCameraMode(mode)}
                    >
                      {mode === "Perspective" ? "Persp" : "Ortho"}
                    </Button>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="h-7 w-full rounded-sm text-[11px] font-normal" onClick={() => setResetSignal((v) => v + 1)}>
                  View home
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-full rounded-sm text-[11px] font-normal" onClick={saveSnapshot}>
                  Save viewport (2× PNG)
                </Button>
              </PropertySection>

              <div className="mt-auto border-t border-border">
                <div className="blender-panel-header">Mesh data</div>
                <div className="space-y-0.5 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <span>Tris</span>
                    <span className="text-foreground">{stats.polygons.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Verts</span>
                    <span className="text-foreground">{stats.vertices.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Format</span>
                    <span className="text-foreground">{selectedAsset.format}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Size</span>
                    <span className="text-foreground">{bytesToSize(selectedAsset.sizeBytes)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {mobileLibraryOpen && (
        <div className="absolute inset-x-0 bottom-0 z-50 max-h-[55vh] overflow-y-auto border-t border-border bg-card md:hidden">
          <div className="flex h-7 items-center justify-between border-b border-border px-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Outliner</span>
            <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setMobileLibraryOpen(false)}>
              Close
            </button>
          </div>
          <div className="max-h-[48vh] overflow-y-auto">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="flex h-7 w-full items-center gap-2 border-b border-border px-2 text-left text-[11px] hover:bg-muted/40"
                onClick={() => {
                  setSelectedId(asset.id);
                  setMobileLibraryOpen(false);
                }}
              >
                <span className="size-4 shrink-0 border border-border bg-muted" />
                <span className="min-w-0 flex-1 truncate">{asset.name}</span>
                <span className="shrink-0 text-muted-foreground">{asset.format}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mobileControlsOpen && (
        <div className="absolute inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto border-t border-border bg-card md:hidden">
          <div className="flex h-7 items-center justify-between border-b border-border px-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Properties</span>
            <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setMobileControlsOpen(false)}>
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-0.5 p-2">
            {(["Solid", "Wireframe", "Texture", "X-Ray"] as RenderMode[]).map((mode) => (
              <Button
                key={mode}
                variant="outline"
                size="sm"
                className={cn("h-8 rounded-sm text-[11px] font-normal", renderMode === mode && "border-primary bg-primary/25")}
                onClick={() => setRenderMode(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
