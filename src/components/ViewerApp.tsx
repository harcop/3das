"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Canvas, ThreeEvent, useLoader, useThree } from "@react-three/fiber";
import { Environment, GizmoHelper, GizmoViewport, Grid, OrbitControls } from "@react-three/drei";
import {
  Box3,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RenderMode = "Solid" | "Wireframe" | "Texture" | "X-Ray";
type CameraMode = "Perspective" | "Orthographic";
type Format = ".glb" | ".gltf" | ".obj" | ".fbx";

type AssetItem = {
  id: string;
  name: string;
  category: string;
  format: Format;
  sizeBytes: number;
  source: "procedural" | "file";
  proceduralKind?: "transport" | "mechanical" | "architecture";
  fileUrl?: string;
};

type Stats = { polygons: number; vertices: number };
type Bounds = { center: Vector3; size: Vector3; radius: number };

const BASE_ASSETS: AssetItem[] = [
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

function bytesToSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function collectStats(object: Object3D): Stats {
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

function collectBounds(object: Object3D): Bounds {
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.75 || 1.5;
  return { center, size, radius };
}

function applyRenderMode(object: Object3D, mode: RenderMode) {
  object.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const prior = Array.isArray(node.material) ? node.material[0] : node.material;
    const base = prior instanceof MeshStandardMaterial ? prior : new MeshStandardMaterial({ color: "#b7c7f5" });
    let nextMaterial: MeshBasicMaterial | MeshLambertMaterial | MeshStandardMaterial;
    if (mode === "Wireframe") {
      nextMaterial = new MeshBasicMaterial({ color: new Color("#90d8ff"), wireframe: true });
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
    node.material = nextMaterial;
    node.castShadow = true;
    node.receiveShadow = true;
  });
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
  useEffect(() => {
    if (ref.current) onReady(ref.current);
  }, [kind, renderMode, onReady]);

  const style =
    renderMode === "Wireframe"
      ? { wireframe: true, transparent: false, opacity: 1, flatShading: false }
      : renderMode === "Texture"
        ? { wireframe: false, transparent: false, opacity: 1, flatShading: true }
        : renderMode === "X-Ray"
          ? { wireframe: false, transparent: true, opacity: 0.36, flatShading: false }
          : { wireframe: false, transparent: false, opacity: 1, flatShading: false };

  const color = kind === "transport" ? "#6dc7ff" : kind === "mechanical" ? "#8aff90" : "#f6d67f";

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
              <meshStandardMaterial color="#1f2430" {...style} />
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
            <meshStandardMaterial color="#64748b" {...style} />
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
            <meshStandardMaterial color="#8b5e3c" {...style} />
          </mesh>
        </group>
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
  return <primitive object={object} />;
}

function OBJModel({ asset, renderMode, onReady }: { asset: AssetItem; renderMode: RenderMode; onReady: (obj: Object3D) => void }) {
  const obj = useLoader(OBJLoader, asset.fileUrl!) as Object3D;
  const object = useMemo(() => obj.clone(true), [obj]);
  useEffect(() => {
    applyRenderMode(object, renderMode);
    onReady(object);
  }, [object, renderMode, onReady]);
  return <primitive object={object} />;
}

function FBXModel({ asset, renderMode, onReady }: { asset: AssetItem; renderMode: RenderMode; onReady: (obj: Object3D) => void }) {
  const fbx = useLoader(FBXLoader, asset.fileUrl!) as Object3D;
  const object = useMemo(() => fbx.clone(true), [fbx]);
  useEffect(() => {
    applyRenderMode(object, renderMode);
    onReady(object);
  }, [object, renderMode, onReady]);
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
      <color attach="background" args={["#232831"]} />
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
          sectionColor="#1e3a8a"
          cellColor="#1f2937"
          fadeDistance={24}
          fadeStrength={1.8}
          infiniteGrid
        />
      )}
      <OrbitControls ref={controlsRef} enableDamping />
      <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
        <GizmoViewport axisColors={["#ff4d4f", "#4fd1ff", "#45d26b"]} labelColor="#dbeafe" />
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

  useEffect(() => {
    const onFullChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullChange);
    return () => document.removeEventListener("fullscreenchange", onFullChange);
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

  const triggerFullscreen = useCallback(() => {
    if (!viewportRef.current) return;
    if (!document.fullscreenElement) viewportRef.current.requestFullscreen();
    else document.exitFullscreen();
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

  return (
    <div className="dark h-screen w-screen bg-background text-foreground">
      <div className="flex h-full w-full overflow-hidden">
        <aside className={`${leftCollapsed ? "w-0 p-0 opacity-0" : "w-[220px] p-3 opacity-100"} hidden border-r border-border bg-card transition-all duration-200 md:flex md:flex-col`}>
          {!leftCollapsed && (
            <>
              <Input
                aria-label="Search assets"
                className="mb-2 h-8"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="mb-2 flex gap-2">
                <select aria-label="Filter formats" className="w-1/2 rounded border border-slate-700 bg-slate-900/80 px-1 py-1 text-xs" value={formatFilter} onChange={(e) => setFormatFilter(e.target.value as Format | "all")}>
                  <option value="all">All formats</option>
                  <option value=".glb">.glb</option>
                  <option value=".gltf">.gltf</option>
                  <option value=".obj">.obj</option>
                  <option value=".fbx">.fbx</option>
                </select>
                <select aria-label="Filter categories" className="w-1/2 rounded border border-slate-700 bg-slate-900/80 px-1 py-1 text-xs" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All categories</option>
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
                className="flex-1 space-y-2 overflow-y-auto"
                onKeyDown={(e) => {
                  if (!filteredAssets.length) return;
                  const index = filteredAssets.findIndex((item) => item.id === selectedAsset.id);
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
                        "relative w-full rounded border p-2 text-left transition-colors",
                        active
                          ? "border-ring bg-accent"
                          : "border-border bg-muted/40 hover:bg-muted/70"
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
                      <div className="mb-1 h-12 rounded border border-border bg-muted/80" />
                      <p className="truncate text-sm font-medium">{asset.name}</p>
                      <div className="mt-1">
                        <Badge variant="secondary">{asset.category}</Badge>
                      </div>
                      {tooltipId === asset.id && (
                        <div className="absolute left-2 top-2 rounded bg-slate-950/95 px-2 py-1 text-[10px]">
                          {stats.polygons.toLocaleString()} polys - {bytesToSize(asset.sizeBytes)} - {asset.format}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept=".glb,.gltf,.obj,.fbx" onChange={handleImport} />
              <Button aria-label="Import asset" className="mt-2 w-full" onClick={() => fileInputRef.current?.click()}>
                + Import Asset
              </Button>
            </>
          )}
        </aside>

        <main ref={viewportRef} className="relative flex-1">
          <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-3 py-2 text-xs backdrop-blur-sm">
            <div className="flex gap-3">
              <Badge variant="default">Mode: {renderMode}</Badge>
              <Badge variant="default">Camera: {cameraMode}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setLeftCollapsed((v) => !v)}>Library</Button>
              <Button variant="secondary" size="sm" onClick={() => setRightCollapsed((v) => !v)}>Controls</Button>
              <Button variant="secondary" size="sm" onClick={triggerFullscreen}>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</Button>
            </div>
          </div>

          <Canvas
            key={`${selectedAsset.id}-${cameraMode}`}
            shadows={showShadows}
            dpr={[1, 2]}
            camera={cameraMode === "Perspective" ? { position: [5, 3.8, 5], fov: 50 } : { position: [5, 3.8, 5], zoom: 85 }}
            orthographic={cameraMode === "Orthographic"}
            onCreated={({ gl }) => (canvasRef.current = gl.domElement)}
            onPointerMissed={(event) => {
              if ((event as unknown as PointerEvent).detail === 2) setResetSignal((v) => v + 1);
            }}
            aria-label="3D asset viewport"
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
              onCanvasReady={(canvas) => (canvasRef.current = canvas)}
              onModelReady={(nextStats, overBudget) => {
                setStats(nextStats);
                setLoading(false);
                setShowSpinner(false);
                if (overBudget) window.alert("Warning: this model exceeds 2M polygons and may reduce frame rate.");
              }}
            />
          </Canvas>

          {showSpinner && loading && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-background/75">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
            </div>
          )}

          {!isFullscreen && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border bg-card/90 px-4 py-1 text-sm">
              {selectedAsset.name}
            </div>
          )}

          <div className="absolute bottom-3 left-3 z-40 flex gap-2 md:hidden">
                <Button variant="secondary" size="sm" className="rounded-full" onClick={() => setMobileLibraryOpen((v) => !v)}>Assets</Button>
                <Button size="sm" className="rounded-full" onClick={() => setMobileControlsOpen((v) => !v)}>Controls</Button>
          </div>
        </main>

        <aside className={`${rightCollapsed ? "w-0 p-0 opacity-0" : "w-[260px] p-3 opacity-100"} hidden border-l border-border bg-card transition-all duration-200 md:flex md:flex-col`}>
          {!rightCollapsed && (
            <div className="flex h-full flex-col gap-3 overflow-y-auto text-sm">
              <Card>
                <CardHeader className="pb-2"><CardTitle>Transform</CardTitle></CardHeader>
                <CardContent>
                {(["x", "y", "z"] as const).map((axis) => (
                  <label key={axis} className="mb-2 block text-xs">
                    {axis.toUpperCase()} Rotation ({Math.round(rotation[axis])}deg)
                    <input type="range" min={0} max={360} value={rotation[axis]} onChange={(e) => setRotation((prev) => ({ ...prev, [axis]: MathUtils.euclideanModulo(Number(e.target.value), 360) }))} className="w-full" />
                  </label>
                ))}
                <label className="block text-xs">
                  Distance ({zoom.toFixed(2)}x)
                  <input aria-label="Camera distance" type="range" min={0.5} max={5} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
                </label>
                <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={() => setRotation({ x: 0, y: 0, z: 0 })}>Reset Transform</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle>Render Mode</CardTitle></CardHeader>
                <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {(["Solid", "Wireframe", "Texture", "X-Ray"] as RenderMode[]).map((mode) => (
                    <Button key={mode} variant={renderMode === mode ? "default" : "secondary"} size="sm" onClick={() => setRenderMode(mode)}>
                      {mode}
                    </Button>
                  ))}
                </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle>Lighting</CardTitle></CardHeader>
                <CardContent>
                <label className="block text-xs">
                  Environment Intensity ({Math.round(environmentIntensity * 100)}%)
                  <input aria-label="Environment intensity" type="range" min={0} max={1} step={0.01} value={environmentIntensity} onChange={(e) => setEnvironmentIntensity(Number(e.target.value))} className="w-full" />
                </label>
                <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={showDirectLight} onChange={(e) => setShowDirectLight(e.target.checked)} />Direct Light</label>
                <label className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={showShadows} onChange={(e) => setShowShadows(e.target.checked)} />Shadows</label>
                <label className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={showEnvironment} onChange={(e) => setShowEnvironment(e.target.checked)} />HDRI Environment</label>
                <label className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />Grid Floor</label>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle>Camera</CardTitle></CardHeader>
                <CardContent>
                <div className="mb-2 flex gap-2">
                  {(["Perspective", "Orthographic"] as CameraMode[]).map((mode) => (
                    <Button key={mode} variant={cameraMode === mode ? "default" : "secondary"} size="sm" className="flex-1" onClick={() => setCameraMode(mode)}>
                      {mode}
                    </Button>
                  ))}
                </div>
                <Button variant="secondary" size="sm" className="mb-2 w-full" onClick={() => setResetSignal((v) => v + 1)}>Reset Camera</Button>
                <Button variant="secondary" size="sm" className="w-full" onClick={saveSnapshot}>Snapshot (PNG 2x)</Button>
                </CardContent>
              </Card>

              <Card className="mt-auto text-xs">
                <CardHeader className="pb-2"><CardTitle>Asset Metadata</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                <p>Polygons: {stats.polygons.toLocaleString()}</p>
                <p>Vertices: {stats.vertices.toLocaleString()}</p>
                <p>Format: {selectedAsset.format}</p>
                <p>File Size: {bytesToSize(selectedAsset.sizeBytes)}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </aside>
      </div>

      {mobileLibraryOpen && (
        <div className="absolute inset-x-0 bottom-0 z-50 max-h-[55vh] overflow-y-auto border-t border-border bg-card p-3 md:hidden">
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-sm">Assets</strong>
            <button className="text-xs" onClick={() => setMobileLibraryOpen(false)}>Close</button>
          </div>
          <div className="space-y-2">
            {filteredAssets.map((asset) => (
              <button key={asset.id} className="w-full rounded border border-slate-700 px-2 py-2 text-left text-sm" onClick={() => setSelectedId(asset.id)}>
                {asset.name} <span className="text-xs text-slate-400">({asset.format})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mobileControlsOpen && (
        <div className="absolute inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto border-t border-border bg-card p-3 md:hidden">
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-sm">Quick Controls</strong>
            <button className="text-xs" onClick={() => setMobileControlsOpen(false)}>Close</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(["Solid", "Wireframe", "Texture", "X-Ray"] as RenderMode[]).map((mode) => (
              <button key={mode} className={`rounded border px-2 py-2 ${renderMode === mode ? "border-ring bg-accent text-accent-foreground" : "border-border bg-muted/50"}`} onClick={() => setRenderMode(mode)}>
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
