"use client";

/* Viewer state currently resets loading/selection in effects when assets or filters change; a follow-up can derive selection to avoid setState-in-effect. */
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Canvas } from "@react-three/fiber";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ViewerSceneContent } from "./scene/viewer-scene";
import { BASE_ASSETS, PRIMITIVE_LABELS } from "./constants";
import { ViewerMobileLibrary, ViewerMobileProperties } from "./panels/mobile-panels";
import { ViewerOutlinerPanel, ViewerPropertiesPanel } from "./panels/viewer-panels";
import type { AssetItem, CameraMode, Format, PrimitiveKind, RenderMode, Stats } from "./types";

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
  const [assetError, setAssetError] = useState<string | null>(null);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps -- read the latest hover debounce id on unmount
      const timeoutId = hoverTimerRef.current;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    setShowSpinner(false);
    setAssetError(null);
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
    setAssetError(null);
    if (overBudget) window.alert("Warning: this model exceeds 2M polygons and may reduce frame rate.");
  }, []);

  const onAssetLoadError = useCallback((message: string) => {
    setAssetError(message);
    setLoading(false);
    setShowSpinner(false);
  }, []);

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
            <ViewerOutlinerPanel
              search={search}
              formatFilter={formatFilter}
              categoryFilter={categoryFilter}
              categories={categories}
              filteredAssets={filteredAssets}
              selectedAsset={selectedAsset}
              selectedId={selectedId}
              tooltipId={tooltipId}
              stats={stats}
              fileInputRef={fileInputRef}
              onSearchChange={setSearch}
              onFormatChange={setFormatFilter}
              onCategoryChange={setCategoryFilter}
              onSelectId={setSelectedId}
              onTooltipId={setTooltipId}
              onHoverTimerRef={hoverTimerRef}
              onImportFile={handleImport}
              onInsertPrimitiveCube={() => handleInsertPrimitive("cube")}
              onInsertPrimitiveSphere={() => handleInsertPrimitive("sphere")}
              onAppendClick={() => fileInputRef.current?.click()}
              onRequestViewReset={() => setResetSignal((v) => v + 1)}
            />
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
            {assetError && selectedAsset.source === "file" && (
              <div
                role="alert"
                className="absolute inset-x-0 top-0 z-40 border-b border-destructive/40 bg-destructive/15 px-2 py-1 text-[11px] text-foreground backdrop-blur-sm"
              >
                <span className="text-destructive">Import failed:</span> <span className="break-all opacity-95">{assetError}</span>
                <button
                  type="button"
                  className="float-right ml-2 rounded-sm border border-border bg-card px-1.5 py-0 hover:bg-muted"
                  onClick={() => setAssetError(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
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
              <ViewerSceneContent
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
                onAssetLoadError={onAssetLoadError}
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
            <ViewerPropertiesPanel
              rotation={rotation}
              zoom={zoom}
              renderMode={renderMode}
              cameraMode={cameraMode}
              environmentIntensity={environmentIntensity}
              showDirectLight={showDirectLight}
              showShadows={showShadows}
              showEnvironment={showEnvironment}
              showGrid={showGrid}
              stats={stats}
              selectedAsset={selectedAsset}
              onRotationAxisChange={(axis, value) =>
                setRotation((prev) => ({
                  ...prev,
                  [axis]: value
                }))
              }
              onZoomChange={setZoom}
              onRotationReset={() => setRotation({ x: 0, y: 0, z: 0 })}
              onInsertPrimitive={handleInsertPrimitive}
              onRenderMode={setRenderMode}
              onEnvironmentIntensityChange={setEnvironmentIntensity}
              onShowDirectLight={setShowDirectLight}
              onShowShadows={setShowShadows}
              onShowEnvironment={setShowEnvironment}
              onShowGrid={setShowGrid}
              onCameraMode={setCameraMode}
              onViewHome={() => setResetSignal((v) => v + 1)}
              onSaveSnapshot={saveSnapshot}
            />
          )}
        </aside>
      </div>

      <ViewerMobileLibrary
        open={mobileLibraryOpen}
        filteredAssets={filteredAssets}
        onClose={() => setMobileLibraryOpen(false)}
        onSelectAsset={setSelectedId}
      />

      <ViewerMobileProperties
        open={mobileControlsOpen}
        renderMode={renderMode}
        onClose={() => setMobileControlsOpen(false)}
        onRenderMode={setRenderMode}
      />
    </div>
  );
}
