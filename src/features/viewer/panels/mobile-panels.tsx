"use client";

import type { PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import type { RenderMode } from "../types";

type MobileDrawerProps = PropsWithChildren<{
  title: string;
  onClose: () => void;
}>;

function BottomDrawer({ title, onClose, children }: MobileDrawerProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-50 border-t border-border bg-card md:hidden">
      <div className="flex h-7 items-center justify-between border-b border-border px-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase">{title}</span>
        <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </div>
  );
}

export function ViewerMobileLibrary({
  open,
  filteredAssets,
  onClose,
  onSelectAsset
}: {
  open: boolean;
  filteredAssets: { id: string; name: string; format: string }[];
  onClose: () => void;
  onSelectAsset: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <BottomDrawer title="Outliner" onClose={onClose}>
      <div className="max-h-[48vh] overflow-y-auto">
        {filteredAssets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className="flex h-7 w-full items-center gap-2 border-b border-border px-2 text-left text-[11px] hover:bg-muted/40"
            onClick={() => {
              onSelectAsset(asset.id);
              onClose();
            }}
          >
            <span className="size-4 shrink-0 border border-border bg-muted" />
            <span className="min-w-0 flex-1 truncate">{asset.name}</span>
            <span className="shrink-0 text-muted-foreground">{asset.format}</span>
          </button>
        ))}
      </div>
    </BottomDrawer>
  );
}

export function ViewerMobileProperties({
  open,
  renderMode,
  onClose,
  onRenderMode
}: {
  open: boolean;
  renderMode: RenderMode;
  onClose: () => void;
  onRenderMode: (mode: RenderMode) => void;
}) {
  if (!open) return null;
  const modes = ["Solid", "Wireframe", "Texture", "X-Ray"] as const;
  return (
    <BottomDrawer title="Properties" onClose={onClose}>
      <div className="grid grid-cols-2 gap-0.5 p-2">
        {modes.map((mode) => (
          <Button
            key={mode}
            variant="outline"
            size="sm"
            className={`h-8 rounded-sm text-[11px] font-normal ${renderMode === mode ? "border-primary bg-primary/25" : ""}`}
            onClick={() => {
              onRenderMode(mode);
            }}
          >
            {mode}
          </Button>
        ))}
      </div>
    </BottomDrawer>
  );
}
