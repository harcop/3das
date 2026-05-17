"use client";

import type { ChangeEventHandler, MutableRefObject, RefObject } from "react";
import { MathUtils } from "three";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { bytesToSize } from "../scene-utils";
import type { AssetItem, CameraMode, Format, PrimitiveKind, RenderMode, Stats } from "../types";
import { PropertySection } from "../ui/property-section";
import { PRIMITIVE_KINDS, PRIMITIVE_LABELS } from "../constants";

const selectBaseClass =
  "h-7 min-w-0 flex-1 rounded-none border border-border bg-secondary px-1.5 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export type ViewerPropertiesPanelProps = {
  rotation: { x: number; y: number; z: number };
  zoom: number;
  renderMode: RenderMode;
  cameraMode: CameraMode;
  environmentIntensity: number;
  showDirectLight: boolean;
  showShadows: boolean;
  showEnvironment: boolean;
  showGrid: boolean;
  stats: Stats;
  selectedAsset: AssetItem;
  onRotationAxisChange: (axis: "x" | "y" | "z", value: number) => void;
  onZoomChange: (value: number) => void;
  onRotationReset: () => void;
  onInsertPrimitive: (kind: PrimitiveKind) => void;
  onRenderMode: (mode: RenderMode) => void;
  onEnvironmentIntensityChange: (value: number) => void;
  onShowDirectLight: (checked: boolean) => void;
  onShowShadows: (checked: boolean) => void;
  onShowEnvironment: (checked: boolean) => void;
  onShowGrid: (checked: boolean) => void;
  onCameraMode: (mode: CameraMode) => void;
  onViewHome: () => void;
  onSaveSnapshot: () => void;
};

export function ViewerPropertiesPanel(props: ViewerPropertiesPanelProps) {
  const {
    rotation,
    zoom,
    renderMode,
    cameraMode,
    environmentIntensity,
    showDirectLight,
    showShadows,
    showEnvironment,
    showGrid,
    stats,
    selectedAsset,
    onRotationAxisChange,
    onZoomChange,
    onRotationReset,
    onInsertPrimitive,
    onRenderMode,
    onEnvironmentIntensityChange,
    onShowDirectLight,
    onShowShadows,
    onShowEnvironment,
    onShowGrid,
    onCameraMode,
    onViewHome,
    onSaveSnapshot
  } = props;

  return (
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
                onRotationAxisChange(axis, MathUtils.euclideanModulo(Number(e.target.value), 360))
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
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="blender-range"
          />
        </div>
        <Button variant="outline" size="sm" className="h-7 w-full rounded-sm text-[11px] font-normal" onClick={onRotationReset}>
          Reset
        </Button>
      </PropertySection>

      <PropertySection title="Add mesh">
        <div className="grid grid-cols-2 gap-0.5">
          {PRIMITIVE_KINDS.map((kind) => (
            <Button key={kind} variant="outline" size="sm" className="h-7 rounded-sm text-[11px] font-normal" onClick={() => onInsertPrimitive(kind)}>
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
              onClick={() => onRenderMode(mode)}
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
            onChange={(e) => onEnvironmentIntensityChange(Number(e.target.value))}
            className="blender-range"
          />
        </div>
        <label className="flex h-6 items-center gap-2 blender-editor-label">
          <input type="checkbox" className="size-3 rounded-none border border-border accent-[var(--ring)]" checked={showDirectLight} onChange={(e) => onShowDirectLight(e.target.checked)} />
          Sun
        </label>
        <label className="flex h-6 items-center gap-2 blender-editor-label">
          <input type="checkbox" className="size-3 rounded-none border border-border accent-[var(--ring)]" checked={showShadows} onChange={(e) => onShowShadows(e.target.checked)} />
          Shadows
        </label>
        <label className="flex h-6 items-center gap-2 blender-editor-label">
          <input type="checkbox" className="size-3 rounded-none border border-border accent-[var(--ring)]" checked={showEnvironment} onChange={(e) => onShowEnvironment(e.target.checked)} />
          HDRI
        </label>
        <label className="flex h-6 items-center gap-2 blender-editor-label">
          <input type="checkbox" className="size-3 rounded-none border border-border accent-[var(--ring)]" checked={showGrid} onChange={(e) => onShowGrid(e.target.checked)} />
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
              onClick={() => onCameraMode(mode)}
            >
              {mode === "Perspective" ? "Persp" : "Ortho"}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-7 w-full rounded-sm text-[11px] font-normal" onClick={onViewHome}>
          View home
        </Button>
        <Button variant="outline" size="sm" className="h-7 w-full rounded-sm text-[11px] font-normal" onClick={onSaveSnapshot}>
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
  );
}

export type ViewerOutlinerPanelProps = {
  search: string;
  formatFilter: Format | "all";
  categoryFilter: string;
  categories: string[];
  filteredAssets: AssetItem[];
  selectedAsset: AssetItem;
  selectedId: string;
  tooltipId: string | null;
  stats: Stats;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onFormatChange: (value: Format | "all") => void;
  onCategoryChange: (value: string) => void;
  onSelectId: (id: string) => void;
  onTooltipId: (id: string | null) => void;
  onHoverTimerRef: MutableRefObject<number | null>;
  onImportFile: ChangeEventHandler<HTMLInputElement>;
  onInsertPrimitiveCube: () => void;
  onInsertPrimitiveSphere: () => void;
  onAppendClick: () => void;
  onRequestViewReset: () => void;
};

export function ViewerOutlinerPanel({
  search,
  formatFilter,
  categoryFilter,
  categories,
  filteredAssets,
  selectedAsset,
  selectedId,
  tooltipId,
  stats,
  fileInputRef,
  onSearchChange,
  onFormatChange,
  onCategoryChange,
  onSelectId,
  onTooltipId,
  onHoverTimerRef,
  onImportFile,
  onInsertPrimitiveCube,
  onInsertPrimitiveSphere,
  onAppendClick,
  onRequestViewReset
}: ViewerOutlinerPanelProps) {
  return (
    <>
      <div className="blender-panel-header">Outliner</div>
      <Input
        aria-label="Search assets"
        className="h-7 rounded-none border-0 border-b border-border bg-card text-[11px] shadow-none focus-visible:ring-0"
        placeholder="Search…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="flex gap-0 border-b border-border">
        <select
          aria-label="Filter formats"
          className={cn(selectBaseClass, "border-0 border-r")}
          value={formatFilter}
          onChange={(e) => onFormatChange(e.target.value as Format | "all")}
        >
          <option value="all">Format</option>
          <option value=".glb">.glb</option>
          <option value=".gltf">.gltf</option>
          <option value=".obj">.obj</option>
          <option value=".fbx">.fbx</option>
          <option value=".primitive">.primitive</option>
        </select>
        <select aria-label="Filter categories" className={cn(selectBaseClass, "border-0")} value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)}>
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
            onSelectId(filteredAssets[(index + 1) % filteredAssets.length].id);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onSelectId(filteredAssets[(index - 1 + filteredAssets.length) % filteredAssets.length].id);
          } else if (e.key === "Enter") {
            e.preventDefault();
            onRequestViewReset();
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
              onClick={() => onSelectId(asset.id)}
              onMouseEnter={() => {
                if (onHoverTimerRef.current != null) window.clearTimeout(onHoverTimerRef.current);
                onHoverTimerRef.current = window.setTimeout(() => onTooltipId(asset.id), 500);
              }}
              onMouseLeave={() => {
                if (onHoverTimerRef.current != null) window.clearTimeout(onHoverTimerRef.current);
                onTooltipId(null);
              }}
            >
              <span className="size-4 shrink-0 border border-border bg-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{asset.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{asset.format}</span>
              {tooltipId === asset.id && (
                <div className="absolute left-1 top-7 z-10 max-w-[min(90vw,260px)] border border-border bg-popover px-1.5 py-0.5 text-[10px] text-popover-foreground whitespace-normal leading-snug">
                  <span className="opacity-85">
                    {asset.category} · {asset.format} · {bytesToSize(asset.sizeBytes)}
                    {asset.id === selectedId ? ` · ${stats.polygons.toLocaleString()} tris` : ""}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <input ref={fileInputRef} type="file" className="hidden" accept=".glb,.gltf,.obj,.fbx" onChange={onImportFile} />
      <div className="grid grid-cols-2 gap-0.5 border-t border-border">
        <Button variant="outline" size="sm" className="h-7 rounded-none border-0 border-r border-border text-[11px] font-normal" onClick={onInsertPrimitiveCube}>
          + Cube
        </Button>
        <Button variant="outline" size="sm" className="h-7 rounded-none border-0 text-[11px] font-normal" onClick={onInsertPrimitiveSphere}>
          + Sphere
        </Button>
      </div>
      <Button
        aria-label="Import asset"
        variant="outline"
        size="sm"
        className="h-7 w-full rounded-none border-x-0 border-b-0 border-t border-border text-[11px] font-normal"
        onClick={onAppendClick}
      >
        Append…
      </Button>
    </>
  );
}
