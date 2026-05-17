## Architecture overview

Next.js hosts a Blender-adjacent **viewer workspace** backed by `@react-three/fiber`. Product features should accumulate under `src/features/<vertical>/`, keeping primitives in `components/ui/` clean and reusable.

### Layout

```
src/
├── app/
│   ├── layout.tsx           # Fonts, globals
│   ├── page.tsx             # Mounts ViewerApp shim
│   └── globals.css          # Tokens + theme surfaces
├── features/
│   └── viewer/
│       ├── viewer-app.tsx           # Composition + local state orchestration
│       ├── viewer-asset-error-boundary.tsx # Import failure boundary
│       ├── constants.ts             # Starter assets + primitives catalog
│       ├── scene-utils.ts           # Mesh stats/bounds + render modes
│       ├── scene/
│       │   ├── viewer-scene.tsx     # Lighting, orbit controls, overlays
│       │   ├── viewer-models.tsx    # Procedural meshes + loaders
│       │   └── render-mode-mesh-style.ts # Shared JSX material props per mode
│       ├── panels/
│       │   ├── viewer-panels.tsx    # Desktop outliner/properties
│       │   └── mobile-panels.tsx    # Lightweight mobile drawers
│       └── ui/
│           └── property-section.tsx # Collapsible Blender-style inspector rows
├── components/
│   ├── ViewerApp.tsx        # Thin `use client` re-export (`@/features/viewer`)
│   └── ui/                  # Shared shadcn/radix building blocks
└── lib/utils.ts             # Cross-cutting Tailwind/class helpers
```

### Import etiquette

| Path | Use |
|------|-----|
| `@/features/viewer` | Primary package surface for collaborators wiring new routes |
| `@/components/ui/*` | Visual primitives — never pull feature folders into UI components |
| `@/features/viewer/scene-*` | Hot paths for viewport math/loaders |

### Operational notes

- **Loaders**: `ImportedModel` uses Suspense plus `ViewerAssetErrorBoundary`. Failures propagate to UX banners in `viewer-app.tsx`.
- **Heavy math / mesh ops**: keep outside React renders; Fiber components should orchestrate subscriptions and declarative meshes.
