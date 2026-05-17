"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onError: (message: string) => void;
};

type State = { error: Error | null };

/** Catches GLTF/OBJ/FBX loader failures and render errors so Suspense cannot leave the viewer stuck loading. */
export class ViewerAssetErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[3das] Asset load/render failed", error, info.componentStack);
    this.props.onError(error.message || String(error));
  }

  render(): ReactNode {
    if (this.state.error) return null;
    return this.props.children;
  }
}
