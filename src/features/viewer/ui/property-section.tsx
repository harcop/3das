import type { ReactNode } from "react";

export function PropertySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border">
      <div className="blender-panel-header">{title}</div>
      <div className="space-y-2 px-2 py-1.5">{children}</div>
    </div>
  );
}
