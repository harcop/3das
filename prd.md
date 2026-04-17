

# Product Requirements Document
## 3D Asset Viewer — Three-Panel UI

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** April 17, 2026

---

## 1. Overview

### 1.1 Purpose

The 3D Asset Viewer is a browser-based tool for browsing, loading, and interactively inspecting 3D models. It targets designers, engineers, game developers, and technical artists who need to review assets without opening a full DCC tool (Blender, Maya, etc.).

### 1.2 Product Vision

A fast, frictionless way to review any 3D asset — click it, see it, inspect it. The interface stays out of the way and puts the model front and center.

### 1.3 Scope

This document covers the initial v1 release: the three-panel shell, asset library, interactive viewport, and control panel. Animation playback, collaboration features, and cloud storage are out of scope for v1.

---

## 2. Layout Architecture

The UI is divided into three fixed panels arranged horizontally across the full viewport.

**Panel ①** — Asset Library (left, ~220px fixed width): browsable list of all available 3D assets. Acts as the primary navigation.

**Panel ②** — 3D Viewport (center, flexible/fill): renders the selected model in real time. This is the dominant surface — it should feel spacious and immersive.

**Panel ③** — Controls (right, ~260px fixed width): contextual controls for the active asset — transforms, render modes, lighting, and metadata.

The three-panel layout is persistent. Panels ① and ③ may be collapsed via a toggle button to give the viewport maximum space (e.g. for presentation mode).

---

## 3. Panel ① — Asset Library

### 3.1 Asset List

Each asset entry shows a thumbnail preview, the asset name in medium weight, and a category tag beneath it (e.g. "Transport", "Mechanical", "Architecture"). The selected asset is highlighted with a subtle info-blue background. Hovering an unselected asset shows a soft hover state.

Clicking an asset loads it into the viewport immediately. The transition should feel near-instant; a brief loading spinner overlays the viewport if the model takes longer than 300ms to parse.

### 3.2 Search & Filter

A search bar at the top of panel ① filters the asset list by name in real time. A secondary filter row below it supports filtering by file format (.glb, .obj, .fbx, .gltf) and category. Filters are additive.

### 3.3 Import

An "+ Import Asset" button at the bottom of panel ① opens a file picker. Accepted formats: .glb, .gltf, .obj, .fbx. Imported assets are added to the local library for the duration of the session; persisted storage (user accounts or local indexedDB) is a v2 feature.

### 3.4 Asset metadata on hover

Hovering an asset item for >500ms shows a small tooltip with polygon count, file size, and format.

---

## 4. Panel ② — 3D Viewport

### 4.1 Renderer

The viewport uses a WebGL-based renderer (Three.js or Babylon.js). It must support: PBR shading, environment maps for ambient lighting, shadow casting, and at minimum 60fps for models under 500k polygons on a mid-range laptop GPU.

### 4.2 Camera & Navigation

| Interaction | Behavior |
|---|---|
| Left-click + drag | Orbit camera around model |
| Right-click + drag | Pan camera |
| Scroll wheel | Zoom in/out |
| Double-click on model | Focus/recenter on clicked surface point |
| Double-click on empty space | Reset camera to default |

On mobile/tablet, equivalent touch gestures apply: one-finger swipe orbits, two-finger pinch zooms, two-finger drag pans.

### 4.3 Viewport Toolbar

A slim toolbar sits at the top edge of the viewport with: the active render mode label (Solid / Wireframe / Texture / X-Ray), active camera mode (Perspective / Orthographic), and a fullscreen toggle. These are informational labels — the actual controls live in panel ③.

### 4.4 Axis Indicator

A small XYZ axis gizmo sits in the bottom-left corner of the viewport. It rotates in sync with the camera, giving the user continuous spatial orientation. Axes are colored red (X), blue (Y), and green (Z).

### 4.5 Grid & Environment

A subtle perspective grid floor is displayed beneath the model to provide ground reference. The grid fades at the viewport edges. A neutral HDRI environment map provides realistic ambient lighting. Both can be toggled off from panel ③.

### 4.6 Asset Name Label

The active asset's filename is displayed as a small pill label centered near the bottom of the viewport, above the grid. It is non-interactive and disappears in fullscreen/presentation mode.

---

## 5. Panel ③ — Controls

### 5.1 Transform

Three rotation sliders for X, Y, and Z axes (0–360°), each showing the current angle value as a numeric readout beside the slider. A "Reset Transform" button returns all axes to 0°.

A zoom/distance slider controls camera focal distance from 0.5× to 5×.

### 5.2 Render Mode

Four mode buttons arranged in a 2×2 grid:

**Solid** — standard PBR-shaded surface rendering. Default mode.  
**Wireframe** — renders only the mesh edges, no faces. Useful for topology inspection.  
**Texture** — shows UV-mapped diffuse textures with flat shading, no specular.  
**X-Ray** — semi-transparent solid mode, allowing the interior mesh structure to show through.

Only one mode is active at a time. The active mode button uses a filled info-blue style; inactive buttons use an outlined style.

### 5.3 Lighting

An environment light intensity slider (0–100%) controls overall scene brightness. A secondary direct light toggle adds a single key light from the upper left, approximating studio lighting. Shadow toggle shows/hides ground shadows.

### 5.4 Camera Controls

A "Reset Camera" button returns the camera to the default position for the current model (calculated from bounding box). A "Snapshot" button exports the current viewport as a PNG at 2× resolution.

### 5.5 Asset Metadata

At the bottom of panel ③, a read-only info block displays: polygon count, vertex count, file format, and file size. This updates whenever a new asset is selected.

---

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| F-01 | Load and display .glb / .gltf assets | Must |
| F-02 | Load and display .obj assets | Must |
| F-03 | Load and display .fbx assets | Should |
| F-04 | Orbit, pan, and zoom camera via mouse | Must |
| F-05 | Solid and Wireframe render modes | Must |
| F-06 | Texture and X-Ray render modes | Should |
| F-07 | Rotation sliders in Controls panel | Must |
| F-08 | Zoom slider in Controls panel | Must |
| F-09 | Asset search and category filter | Should |
| F-10 | Import local asset file | Must |
| F-11 | Snapshot / PNG export | Should |
| F-12 | Touch gesture support (mobile) | Should |
| F-13 | Fullscreen / presentation mode | Could |
| F-14 | Collapsible side panels | Could |
| F-15 | Asset persistence across sessions | Won't (v1) |
| F-16 | Animation playback | Won't (v1) |

---

## 7. Non-Functional Requirements

**Performance:** The viewport must sustain ≥60fps for models under 500k polygons on a mid-range device. Models above 2M polygons should trigger a polygon count warning before loading.

**Load time:** Assets under 10MB must appear in the viewport within 1 second on a modern broadband connection. A skeleton loader or progress bar is shown for assets taking longer.

**Accessibility:** Panel ① list items must be keyboard-navigable (arrow keys to move, Enter to load). All interactive controls in panel ③ must have ARIA labels. The viewport itself is exempt from WCAG focus requirements but must include a descriptive `aria-label` for screen readers.

**Responsiveness:** The three-panel layout is the canonical desktop experience (min-width 1024px). Below 768px (tablet portrait and mobile), the layout switches to a single-panel view with a bottom sheet for the asset list and a floating action button for controls.

**Browser support:** Chrome 110+, Firefox 110+, Safari 16+, Edge 110+. WebGL 2.0 required.

---

## 8. Design Principles

**Viewport-first.** The 3D canvas is the product — all surrounding chrome should feel subordinate and unobtrusive.

**No modal interruption.** Switching assets, changing render modes, adjusting sliders — none of these actions should trigger a modal or block the viewport.

**Immediate feedback.** Every control interaction (slider move, button press, asset click) must produce a visible change within one frame. No delayed animations on controls themselves.

**Progressive disclosure.** Advanced options (polygon budget warnings, UV channel selector, LOD inspector) live in expandable sections within panel ③ — not in the default view.

---

## 9. Open Questions

1. Should the asset library support nested folders/collections in v1, or flat list only?
2. Is drag-and-drop import onto the viewport a required v1 interaction, or a nice-to-have?
3. What is the maximum supported polygon count before mandatory decimation is applied?
4. Should the snapshot export include a transparent background option?
5. Who is responsible for supplying the default HDRI environment maps, and under what license?

---

## 10. Success Metrics

The v1 release will be considered successful if, within 60 days of launch: the median time from opening the tool to successfully viewing a loaded asset is under 10 seconds, 80% of session recordings show users engaging with at least one control in panel ③, and the viewport frame rate drops below 30fps in fewer than 5% of recorded sessions.