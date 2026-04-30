# Blender-class DCC — Feature specification (PM & engineering)

## How to use this document

| Audience | Use |
|----------|-----|
| **Project manager** | Scope phases using **Program view**; per-section **Purpose**, **Deliverables**, **Dependencies**, **Acceptance criteria**. Estimate risk from **Complexity** notes—they flag coupling and research spikes. |
| **Tech lead / architect** | Treat **Data model** and **Evaluation order** as contracts between verticals. |
| **QA** | **Acceptance criteria** define verifiable outcomes; cross-reference **Testing expectations**. |

**Terms:** **Depsgraph** = dependency graph evaluator (what recomputes when time or inputs change). **RNA-style** = typed property registry driving UI, animation paths, and serialization. **PBVH** = spatial hierarchy for sculpt updates. **MIS** = multiple importance sampling (render variance reduction).

This mirrors Blender’s domain vocabulary; it is **not** a shipping requirement to match Blender bug-for-bug.

**Pickable engineering work:** [blender-engineering-tasks.md](./blender-engineering-tasks.md) lists tasks with IDs, outcomes, implementation notes, dependencies, rough sizing, and **explainability** requirements for closing each task (what to document, how reviewers verify).

---

## Program view (phased delivery)

| Phase | Vertical bundle | Exit criterion |
|-------|-----------------|----------------|
| **P0 Foundation** | Runtime (§1), UI shell (§2), viewport basics (§3), mesh modeling core (§4), file IO skeleton (§25, §30) | Save/load scene; translate objects; edit mesh; undo/redo stable |
| **P1 Authoring depth** | Full modifier stack (§6), UV (§4.6, §15), curves/text/meta (§5), materials + UV-driven shading (§14), lights/camera/world (§16–§17, §20) | Non-destructive pipeline through shading preview |
| **P2 Animation** | Rigging (§10), constraints (§11), driven props | Animated shot exports to disk |
| **P3 Simulation** | Rigid/cloth/soft/fluids/particles as scoped (§12) | Cached sim replay + render |
| **P4 Rendering** | Cycles-class path tracer and/or real-time engine (§18–§19), compositor (§21) | Beauty EXR + agreed passes |
| **P5 Specialized** | Tracking (§22), VSE (§23), Grease Pencil (§24), XR (§28) | Per-product milestones |

Dependencies flow downward: P0 blocks everything; simulation depends on mesh evaluation and caching from §1.

---

## Document conventions

- **Must-have:** Expected for parity with a modern general-purpose DCC (not niche sculpt-only tools).
- **Cross-cutting:** Touches selection, time, or GPU draw path.
- **Pipeline:** Modifier stack → physics/cache → render preprocess.

---

## 1. Core application runtime

### Purpose

Provide a stable **evaluation core**: typed data, deterministic recomputation order, undoable edits, and library-safe referencing—everything else hangs off this.

### Deliverables

| ID | Deliverable | Detail |
|----|-------------|--------|
| R1 | Multi-mode desktop app | UI mode vs batch (`-b`) render/script without widgets |
| R2 | Session safety | Autosave timer, recovery blend on crash, dirty-file prompt |
| R3 | CLI | Non-interactive: blend path, frame start/end, output paths, engine choice, execute script, addon paths |
| R4 | Context resolution | Operators resolve **active** vs **selected** objects/bones/strips/node trees |
| R5 | Depsgraph | Invalidate evaluated geometry/transforms when animation, modifiers, constraints, or parenting changes |
| R6 | Undo/redo | Stack with byte/memory budget; modal ops collapse to one step where agreed |
| R7 | RNA-style properties | Typed fields + UI metadata + animatable paths |
| R8 | Operator registry | Poll (enabled?), execute, invoke (modal), undo push/pop |
| R9 | ID lifecycle | User counts, fake user, rename rules, orphan cleanup |
| R10 | Collections & view layers | Inclusion/exclusion per layer; render visibility independent of viewport where specified |

### 1.1 Process model

**Behavior:** One primary UI thread owns scene mutation; background jobs (render, bake) use worker pools with explicit handoff of **read-only** evaluated data or copies.

**Deliverables:** Startup file load; preferences path; recent files list; exit codes for CLI success/failure.

**Acceptance criteria:** Second instance can batch-render without displaying UI; CLI loads blend and exits 0 on successful render write.

### 1.2 Context and modes

**Purpose:** Prevent illegal edits (e.g. mesh extrude in Object mode) and route tools to the correct data.

**Mode inventory (minimum):**

| Data | Modes |
|------|--------|
| Mesh | Object, Edit, Sculpt, Vertex Paint, Weight Paint, Texture Paint |
| Armature | Object, Edit, Pose |
| Grease Pencil | Object, Edit, Sculpt (GP), Weight Paint, Vertex Paint, Draw |
| Curve/Surface/Lattice | Object, Edit |

**Acceptance criteria:** Switching modes preserves selection where defined; unavailable operators do not appear in search results (poll fails gracefully).

### 1.3 Dependency graph (evaluation)

**Purpose:** Answer “what is the mesh at frame *t* for render?” without recomputing the world.

**Evaluation layers (conceptual order):**

1. Time → animation curves & drivers → animated properties  
2. Constraints & parenting → object transforms  
3. Armature pose → pose bones  
4. Modifier stack top-to-bottom on geometry  
5. Physics solvers read pose + collision state → write caches  
6. Render preprocessing ( subdivision for displacement, tessellation )

**Deliverables:** Subframe sampling hooks for motion blur; stable evaluation ID for instancing and duplication.

**Complexity:** Cycles must see **final** meshes; viewport may subsample modifiers for latency—two LOD policies must not diverge silently (expose toggles).

### 1.4 Undo/redo

**Purpose:** Predictable reversal of user edits without corrupting IDs.

**Deliverables:** Memcap with LRU or ring buffer; undo steps for mesh edits, sculpt (optional per-stroke granularity), node edits, strip edits.

**Acceptance criteria:** Undo after multi-step modal returns to pre-modal state once; redo mirrors undo stack depth.

### 1.5 Properties system (RNA-like)

**Purpose:** One source of truth for UI, keyframes, drivers, and file IO.

**Requirements:**

| Capability | Requirement |
|------------|-------------|
| Types | float/int/bool/enum/string/pointer/collection/array |
| Animation path | Stable string address per animatable field |
| UI metadata | Min/max, soft range, subtype (angle, color), units |
| Localization | Tooltip/key ids without breaking paths |

### 1.6 Operator system

**Purpose:** All user actions are callable, scriptable, logged operators—not one-off GUI callbacks only.

**Modal operator contract:** Begin → stream pointer/events → numeric mode (axis lock, typed values) → confirm/cancel → single undo push.

**Deliverables:** Repeat last; macro recording optional; fuzzy operator search.

### 1.7 ID datablocks and libraries

**Purpose:** Share assets across files without duplication.

**Minimum ID set:** Scene, World, Object, Mesh, Curve, Metaball, Font, Armature, Lattice, Camera, Light, Speaker, Material, Texture, Image, Action, NodeTree (shader/geometry/compositor), MovieClip, Sound, Mask, Brush, CacheFile, Collection data.

**Append vs link:** Append duplicates IDs into local file; link keeps external library read-only. **Overrides:** selectively replace linked properties locally without full duplication.

**Acceptance criteria:** Linked material edit in library file updates all consumers on reload; broken links reported with recover options.

### 1.8 Collections and view layers

**Purpose:** Organize scenes for artists and split renders without copying geometry.

**Deliverables:** Nested collections; collection instances (empty referencing whole hierarchy); per-view-layer visibility and holdout flags for compositing isolation.

---

## 2. User interface and workflow

### Purpose

Expose runtime capabilities through consistent editors, discoverable actions, and readable layouts—without coupling UI code to evaluation internals.

### Dependencies

§1 (operators, RNA), GPU backend (§3.8).

### 2.1 Windowing

**Deliverables:**

| Item | Behavior |
|------|----------|
| Split/join areas | Horizontal/vertical splits; draggable joins |
| Editor per area | Exactly one editor type active; swap via menu |
| Regions | Header, tool shelf, sidebar (tabs), main region, footer optional |
| Workspaces | Named presets switching area layout + editor modes |
| Multi-monitor | Multiple OS windows referencing same session |

**Acceptance criteria:** Saved startup layout restores on launch; fullscreen editor hides chrome without losing mode.

### 2.2 Editor types — responsibilities

| Editor | Primary user task | Reads | Writes |
|--------|-------------------|-------|--------|
| 3D Viewport | Navigate, transform, paint, sculpt | Scene, depsgraph | Transforms, modes, tools |
| Outliner | Hierarchy, visibility, sync selection | Collections, objects | Visibility flags, selection |
| Properties | Parameters for active datablock | Context RNA | Property values |
| Shader Editor | Material/world/light nodal shading | Node trees | Nodes, links |
| Geometry Nodes | Procedural geometry | Node trees, mesh attributes | Modifier stack output |
| UV Editor | UV topology | Mesh loops | UV layers |
| Graph Editor | F-curves | Actions | Keys, handles |
| Dope Sheet / Timeline | Keys overview, playback | Actions, scene frame | Keys, frame |
| NLA | Layered actions | NLA strips | Strip placement, blend |
| Compositor | Post graph | Render layers | Composite tree |
| Movie Clip Editor | Tracks, masks | MovieClip | Tracks, solves |
| Video Sequencer | Edit strips | Sequencer data | Strips, cuts |
| Image Editor | View renders / paint UV test | Images | Paint ops |
| Text Editor | Scripts | Text blocks | Text |
| Spreadsheet | Inspect attributes | Geometry eval | Read-only by default |
| Asset Browser | Browse libraries | Asset indexes | Catalog assignment drag |
| File Browser | Open/save | Filesystem | Paths |
| Preferences | App settings | User prefs | Persistent prefs |

### 2.3 Themes and accessibility

**Deliverables:** Theme tables for widget states; scalable UI factor; translation bundles; separate UI vs viewport color spaces (OCIO for viewport preview optional).

### 2.4 Interaction primitives

| Primitive | Specification |
|-----------|----------------|
| Gizmos | Axis-constrained widgets; pivot adherence; custom per-tool groups |
| Pie menus | Radial 8-way shortcuts with cancel zone |
| Tool shelf | Toggle tools vs modal tools distinction |
| Sidebar | Tabbed panels; addon registration hooks |
| Status bar | FPS, selection counts, progress bars for bake/render |

### 2.5 Search and discovery

**Deliverables:** Operator palette with fuzzy match; add-object menus grouped by type.

### 2.6 Asset workflow

**Purpose:** Treat `.blend` datablocks as first-class reusable assets.

**Deliverables:** Root directories scanned; `.blend` catalogs (UUID hierarchy); thumbnails generated via offline or GPU preview; drag from browser creates object instance with linked data.

**Acceptance criteria:** Catalog assignment survives rename when UUID stable; missing library surfaces explicit error.

### 2.7 Batch operations

**Deliverables:** Pattern rename (`Object_###`); apply transforms (bake scale into mesh verts); apply modifier stack (destructive).

---

## 3. Three-dimensional viewport

### Purpose

Interactive visualization and manipulation at interactive rates with faithful **selection** and **overlay** semantics.

### Dependencies

§1 depsgraph; GPU backend.

### 3.1 Camera and projection

| Setting | Specification |
|---------|-----------------|
| Perspective | Focal length mm or horizontal FOV |
| Orthographic | Scale maps world units to screen |
| Clipping | Near/far planes to avoid Z-fighting and precision loss |
| Stereo | Eye separation and convergence for passive/active stereo |

### 3.2 Navigation

**Deliverables:** Orbit (turntable vs trackball modes optional); pan; zoom (cursor-centric vs screen-center); view bookmarks saved per scene or user.

### 3.3 Selection

**Purpose:** Correct picking under occlusion and in dense meshes.

**Pipeline:** Depth buffer pick → optionally X-ray ignore depth → tolerance pixels for fat fingers.

**Deliverables:** Vertex/edge/face modes; shortest path (Ctrl+LMB chain); select linked (material, seam, sharp); loop/ring selection.

**Acceptance criteria:** Selection syncs with UV editor when **sync selection** enabled.

### 3.4 Transforms

**Pivot modes:** Median, active, cursor, individual origins—each changes gizmo origin math.

**Snapping targets:** Grid increment; verts; edge midpoints; face centers; perpendicular foot to edge.

**Proportional editing:** Radius in screen space or world space; falloff curve affects displacement kernel.

### 3.5 Display modes

| Mode | Purpose |
|------|---------|
| Wireframe | Topology inspection |
| Solid | Shaded without heavy shading graph |
| Material preview | Quick PBR response |
| Rendered | Match render engine (within approximations) |

### 3.6 Overlays

**Deliverables:** Normals display (verts vs loops); face orientation; edge sharpness; motion paths (sampled curves); measurement tool with delta XYZ.

### 3.7 Local view and clipping

Local view temporarily hides non-selected objects without destroying scene graph membership.

### 3.8 Drawing architecture

**Purpose:** Maintain stable frame times at scene scale.

**Deliverables:** Instancing for repeated meshes; GPU selection buffers; separate buffers for curves/Grease Pencil; shader variants for edit-mode vertex color selection masking.

**Complexity:** Sync between evaluated mesh and edit-mode cage mesh when modifiers active—visualize cage vs final consistently.

---

## 4. Modeling — mesh

### Purpose

Author clean manifold-friendly topology with explicit control over normals, UV seams, and deformation weights.

### 4.1 Mesh representation

**Data model:**

| Element | Stores |
|---------|--------|
| Vertex | Position; optional groups |
| Edge | Two verts; seam/sharp flags |
| Face | Polygon fan via **loops** |
| Loop | Corner: vertex index + per-corner UV/normal/color |

**Why loops:** One geometric vertex can carry multiple UVs/normals along a seam—required for unwrap quality and baking.

### 4.2 Primitives

**Deliverables:** Parameterized creation ops (segments, rings, radius, align to view optional).

### 4.3 Topological operators

Each operator below must define **manifold preservation rules** and **selection behavior post-op**.

| Operator | User outcome | Core algorithm notes |
|----------|--------------|----------------------|
| Extrude | New geometry extruded along normals or constrained vector | Inset duplicate faces; bridge side quads |
| Inset | Inner offset polygon | Handle concave loops; individual vs region inset |
| Bevel | Chamfer/fillet edges | Width limit vs intersection handling; profile curves |
| Loop cut | Insert edge ring | Find edge loops; slide along loops |
| Knife | Cut faces along drawn line | Plane-face intersections; triangulation of cuts |
| Bridge loops | Tunnel between two edge rings | Twist parity; odd vertex counts fail clearly |
| Fill / Grid fill | Close borders | Beauty vs minimal triangles |
| Dissolve | Reduce verts while preserving shape | Limited dissolve by angle |
| Delete | Remove elements | Dissolve vs hole vs dissolve-only verts |

### 4.4 Cleanup

**Deliverables:** Merge by distance (epsilon); delete loose verts/edges/faces; degenerate face removal (zero area).

### 4.5 Normals

**Deliverables:** Auto-smooth angle threshold; **marked sharp** edges split vertex normals via loop splits; custom normals bake tools.

### 4.6 UV mapping

**Unwrap solvers:** Least-squares conformal / angle-based methods produce different stretch profiles—expose method choice.

**Pack:** Margin (pixels/world UV units), rotation bins, scale-to-fit.

**Live unwrap:** Iterative relaxation during edit—performance budget required.

### 4.7 Vertex groups

**Purpose:** Drive armature deformation and modifiers via named weight maps.

**Deliverables:** Assign-by-selection; gradient painting in Weight Paint mode; normalize/threshold operators.

---

## 5. Modeling — curves, metaballs, text

### 5.1 Curves

**Purpose:** Paths for modeling, deformers, and bevel profiles.

**Deliverables:** Bézier/NURBS handles with automatic handle types; bevel along curve with taper curve scaling; 2D curve filled interior triangulation; convert-to-mesh with configurable resolution.

### 5.2 Metaballs

**Purpose:** Organic blob modeling via implicit surfaces.

**Deliverables:** Primitives with influence radius; negative balls; polygonization resolution slider controlling triangle count.

### 5.3 Text

**Deliverables:** Font selection; extrusion/bevel; conversion to curve then mesh for destructive pipeline.

---

## 6. Modifiers — inventory with specifications

### Purpose

Non-destructive operators that transform evaluated geometry **before** physics/render without losing base mesh.

### Global rules

| Rule | Specification |
|------|----------------|
| Stack order | Top applies first to base mesh unless documented exception |
| Dependency | Modifier may depend on another object (target) → depsgraph edge |
| Apply | Bake result into mesh; remove modifier |
| Edit cage | Viewport shows cage vs evaluated mesh toggle |

### 6.1 Modify-type modifiers

| Modifier | User outcome | Computation summary |
|----------|--------------|---------------------|
| Data Transfer | Copy attributes from another mesh | Topology mapping: nearest face/interpolated vertex; ray-traced matching optional |
| Mesh Sequence Cache | Playback animated mesh file | Stream vertices/normals/UV from Alembic/USD per frame |
| Normal Edit | Author normals manually | Mix toward vector/custom; preserve/sharpen toggles |
| UV Project | Generate UVs from projector | Perspective/ortho projector matrix from object |
| UV Warp | Skew UVs with two bones | Affine warp from rest→pose bone pair |
| Vertex Weight Edit | Procedural weights | Texture lookup + curve mapping → weight layer |
| Vertex Weight Mix | Combine two weight maps | Per-vert math ops with clamp |
| Vertex Weight Proximity | Distance-based weights | Distance to verts/faces/volumes with falloff |

### 6.2 Generate-type modifiers

| Modifier | User outcome | Computation summary |
|----------|--------------|---------------------|
| Array | Repeated copies | Linear offset; curve offset; Object offset transform; merge verts within epsilon |
| Bevel | Round edges | Limit by angle/weight; profile curve; clamp overlaps |
| Boolean | CSG mesh ops | Union/intersect/difference; manifold expectation documented |
| Build | Reveal faces over time | Face sort order for progressive visibility |
| Decimate | Reduce triangles | Collapse ratio / planar decimation / unsubdivide |
| Edge Split | Duplicate edges as sharp | Angle threshold splits verts |
| Mask | Delete verts by group | Vertex group threshold hides geometry |
| Mirror | Symmetric mesh | Bisect plane; merge tol; bisect clip optional |
| Multiresolution | Subdiv sculpt levels | Catmull-Clark levels; adaptive sculpt compatibility |
| Remesh | Uniform topology | Voxel size fills bounding volume |
| Screw | Lathe | Screw axis spins profile curve |
| Skin | Thick skeleton | Vertex radii along spanning tree extrusion |
| Solidify | Shell thickness | Offset along normals; rim fill; even thickness option |
| Subdivision Surface | Smooth subdiv | Catmull-Clark creases via edge crease weights |
| Triangulate | All triangles | Beauty vs fixed algorithms |
| Weighted Normal | Stable shading normals | Weight by face area/angle; respect sharp flags |
| Weld | Weld verts | Merge within distance across islands |

### 6.3 Deform-type modifiers

| Modifier | User outcome | Computation summary |
|----------|--------------|---------------------|
| Armature | Skin follow bones | Dual quaternion vs linear skinning; envelope vs weights |
| Cast | Mold toward sphere/cylinder/cube | Implicit primitive distance warp |
| Curve | Follow path | Constraint frames along curve parameter |
| Displace | Texture height | Displace along normals using texture RGB intensity |
| Hook | Pull region | Vertex group influenced by empty transforms |
| Laplacian Deform | Preserve detail edits | Solve Laplacian with pinned verts |
| Lattice | FFD | Trilinear lattice deformation |
| Mesh Deform | Cage warp | Bind cage → interp interior verts |
| Shrinkwrap | Stick to surface | Nearest point / projected / along normal modes |
| Simple Deform | Twist/bend/taper | Single-axis analytic deformation |
| Smooth family | Relax geometry | Iterations + strength variants |
| Surface Deform | Ride animated mesh | Bind mesh UV-like correspondence |
| Warp | Region warp | Two empties define from/to mapping |
| Wave | Ripple | Phase along axis |
| Volume Displace | Move smoke/fire | Vector field integration on volume grid |

### 6.4 Simulate-type modifiers

Couple mesh/object data to **solver domains** or ocean spectra. Each exposes bake frame range, cache path on disk, and playback vs interactive toggle.

| Modifier | User outcome | Computes |
|----------|--------------|----------|
| Cloth | Fabric motion under gravity/collision | Spring network on triangles; collision response; optional internal pressure |
| Soft Body | Deformable solid | Lattice springs + goal to rest pose |
| Fluid | Liquid/smoke/fire in domain | FLIP/grid hybrid + optional mesh surface |
| Ocean | Infinite-looking waves | Gerstner/FFT displacement from spectrum parameters |
| Dynamic Paint | Canvas receives paint/wet/displace | Brush objects rasterize onto UV surface attributes |
| Explode | Faces fly apart over time | Face centers pushed along normals with variance |

**Acceptance criteria:** Opening file replays baked frames without resim unless inputs changed; cache invalidation warns when collision topology edits.

### 6.5 Physics collision / particles

| Component | Role |
|-----------|------|
| Collision modifier | Provide collision mesh (with thickness/offset options) to cloth/soft |
| Particle System modifier | Legacy bridge to emitter/hair settings on object |

---

## 7. Geometry Nodes

### Purpose

Author procedural geometry as a **field-evaluated** graph with instances and optional simulation—replacing many one-off modeling scripts.

### Dependencies

§6 modifier evaluation order; mesh attributes (§4.1); volume and curve evaluators may share grid helpers with fluid (§12.4) when both exist in the product.

### Architecture summary

| Concept | Meaning |
|---------|---------|
| Geometry bundle | May contain mesh + curves + instances + volumes |
| Field | Function evaluated per domain sample (not always stored array) |
| Domain | Point, edge, face, corner, spline, instance |
| Instance | References to object/collection with transform without copying geometry |

### Deliverables

- Socket typing: geometry vs field vs scalar vs object handle  
- **Implicit fields:** `position`, `index`, `normal` depending on context  
- **Repeat zone:** For-loop subgraph with carried geometry  
- **Simulation zone:** Frame-to-frame state (attributes) with stable IDs  
- Bake to disk for heavy graphs  

### Node families (build checklist)

| Family | Examples |
|--------|----------|
| Read | Object info, collection info, named attribute |
| Write | Store named attribute, remove attribute |
| Mesh ops | Extrude, inset, subdivide, split edges, merge |
| Sampling | Sample nearest surface, raycast |
| Curve | Resample, trim, curve → mesh |
| Volume | Mesh ↔ volume conversion |
| Instances | Points distribute, instance on points, realize |
| Utilities | Switch, compare, random value, accumulate field |

**Acceptance criteria:** Changing upstream seed reproducibly changes instances; baking produces identical frames when reopened.

---

## 8. Sculpting and painting

### Purpose

High-density organic modeling with brushes competitive with mesh editing throughput.

### 8.1 Sculpt pipeline

| Mode | Purpose |
|------|---------|
| PBVH | Refine octree near brush—limits touched verts |
| Dyntopo | Dynamic triangulation during stroke |
| Voxel remesh | Uniform resolution rebuild |
| Multires | Level-of-detail sculpt separate from base |

### 8.2 Brush system

**Parameters:** Radius (world/screen), strength, autosmooth, stroke spacing, jitter, tablet pressure curves mapping to radius/strength.

### 8.3 Brush catalog (each implements a displacement kernel)

| Brush | Effect |
|-------|--------|
| Grab / Snake Hook / Elastic | Translate regions |
| Clay / Clay Strips | Build volume |
| Crease / Pinch | Sharpen features |
| Inflate / Blob | Local bulge |
| Smooth | Laplacian-like relaxation |
| Flatten / Scrape / Fill / Plane | Planar enforcement |
| Draw Sharp | Crease-like displacement |
| Layer | Height stack without bleeding |
| Trim | Cut mesh by plane boolean |
| Mask | Protect verts from edits |

### 8.4 Masking and visibility

Mask weights 0–1; blur/sharpen mask; extract masked island to new object.

### 8.5 Vertex paint

RGBA layers; blend modes; painting writes vertex color attributes consumable by shaders and exports.

---

## 9. Retopology

### Purpose

Produce animation-friendly quad topology over scanned/sculpted reference surfaces.

**Toolchain:** Shrinkwrap modifier (snap verts to target) + surface snapping + Poly Build / knife / relax loops.

**Acceptance criteria:** Snapped verts stay on surface under camera rotation; target mesh updates propagate.

---

## 10. Rigging and animation

### Purpose

Define **skeletons**, bind them to meshes, and animate transforms over time using keys, layered clips, and procedural drivers—output feeds §18/§19 and exports.

### Dependencies

§4 vertex groups; §11 constraints; §1 depsgraph sampling.

### 10.1 Armatures

| Concept | Specification |
|---------|----------------|
| Edit mode | Define bone chains; parenting and connected bones |
| Pose mode | Transform bones without editing rest pose topology |
| Bone roll | Align twist for IK poles and deformation |
| Bendy bones | Extra subdivisions along bone segment for curvature |

**Skinning pipeline:**

| Step | Behavior |
|------|----------|
| Automatic weights | Diffuse heat from bones to verts → initial vertex groups |
| Envelope | Fallback distance volumes when weights absent |
| Manual | Paint weights per bone in Weight Paint mode |

### 10.2 IK / spline IK

| Feature | Parameters |
|---------|------------|
| IK | Chain length, pole target empty/bone, stretch on/off, iteration count |
| Spline IK | Target curve, chain length, twist settings, scale fixups |

### 10.3 Shape keys

| Concept | Behavior |
|---------|----------|
| Basis | Reference mesh |
| Relative keys | Delta offsets referenced to basis or prior key |
| Mixing | Multiple keys active with normalized weights |
| Correctives | Sculpt fixes driven by joint rotation via drivers |

### 10.4 Actions and channels

| Concept | Behavior |
|---------|----------|
| Action | Container of FCurves addressing RNA paths |
| Keyframes | Hold Bézier handles per channel |
| Rotation modes | Euler (gimbal risk) vs quaternion (no interpolation ambiguity if normalized) |

### 10.5 Graph Editor

| Tool class | Function |
|------------|----------|
| Tangent editing | Bézier handle modes (vector/auto/free) |
| Key cleanup | Merge duplicates, reduce keys |
| FCurve modifiers | Generators, cycles, limits, noise |

### 10.6 Drivers

| Driver type | Use |
|-------------|-----|
| Scripted expression | Python subset or simple expression language |
| Variables | Pull single values from bones, objects, channel values |

**Risk:** Driver evaluation order matters—cycle detection required.

### 10.7 NLA

| Concept | Behavior |
|---------|----------|
| Tracks | Ordered stacks evaluated bottom→top or documented order |
| Strips | Reference Action datablocks with frame mapping |
| Blending | Replace vs additive blend modes per strip |
| Time scaling | Strip scale retimes motion non-destructively |

### 10.8 Motion paths

Bake sampling interval; draw polyline in viewport; optional keyframe dots along path.

---

## 11. Constraints

### Purpose

Limit or derive transforms without keyframe spam—foundational for rigs and cameras.

**Evaluation note:** Cyclic dependencies must error visibly in UI.

| Constraint | Outcome |
|------------|---------|
| Copy Location/Rotation/Scale/Transforms | Offset relationship |
| Limit * | Clamp axes |
| Track To / Damped / Locked Track | Aim axes toward targets |
| Stretch To | Maintain distance spring |
| Child Of | Parent without scene hierarchy |
| Floor | Prevent penetration axis |
| Shrinkwrap | Stick mesh to surface |
| IK | Chain solver |
| Spline IK | Follow curve |
| Follow Path | Parameter along curve |
| Clamp To | Slide along curve segment |
| Transform Cache | External baked transforms |

---

## 12. Physics and simulation

### Purpose

Produce motion and secondary animation driven by forces, collisions, and time integration—results **cacheable** for deterministic playback and farm rendering.

### Dependencies

§1 depsgraph (frame evaluation); §6 simulate modifiers; mesh collision geometry.

### Cross-cutting requirements

| Requirement | Meaning |
|---------------|---------|
| Bake contract | Disk cache stores frame-range state so reopen = replay without hidden random seeds |
| Invalidation rules | Document what edits force rebake (topology, collision margin, timestep) |
| Substeps | Collision tunneling reduced via substeps vs fixed timestep tradeoff |

### 12.1 Rigid bodies

| Aspect | Specification |
|--------|----------------|
| Body types | **Active** (simulated) vs **Passive** (kinematic obstacle) |
| Shapes | Box, sphere, capsule, convex hull (recommended), compound hulls, mesh (expensive, thin-shell risk) |
| Material props | Friction, restitution (bounce), rolling friction optional |
| Damping | Linear/angular velocity damping for stability |
| Solver | Constraint solver iterations; collision pairs filtered by layers/groups |

**Acceptance criteria:** Stacking boxes settle without interpenetration at documented timestep; passive animated mesh moves rigid obstacles predictably.

### 12.2 Soft body

| Aspect | Specification |
|--------|----------------|
| Structure | Springs connect verts (edges + optional diagonals/air mesh) |
| Goal | Springs pull verts toward rest pose to preserve volume impression |
| Aerodynamics | Optional wind-facing drag |
| Self-collision | Approximate or full—performance tradeoff documented |

### 12.3 Cloth

| Aspect | Specification |
|--------|----------------|
| Springs | Structural (edges), shear (diagonals), bending (hinge or angle-based) |
| Internal pressure | Outward force for inflated cloth |
| Collision | Object collision + optional self-collision with offset |
| Quality | Step count and collision passes exposed to user |

**Acceptance criteria:** Cloth draped over sphere does not tunnel at default settings; pinned verts stay fixed.

### 12.4 Fluid (FLIP-style expectations)

| Stage | Behavior |
|-------|----------|
| Domain | Axis-aligned voxel bounds; resolution drives memory |
| Liquid | FLIP transfers velocity between particles and staggered grid |
| Smoke/fire | Scalar fields advected with velocity field |
| Surface | Level set or marching cubes mesh from density |
| Obstacles | Collision velocity injected into grid |

**Complexity:** Adaptive timestep or CFL condition—expose stability warnings when user pushes resolution.

### 12.5 Forces

| Force | Effect |
|-------|--------|
| Wind | Directional acceleration with optional turbulence texture |
| Turbulence | Vector noise field scales |
| Vortex | Tangential acceleration around axis |
| Harmonic | Spring toward reference point |
| Magnetic-like | Attract/repel along falloff (implementation-specific naming) |

### 12.6 Dynamic paint

| Canvas surface type | Stored maps |
|---------------------|-------------|
| Paint | Color accumulation |
| Wet | Wetness propagation optional |
| Displace | Height displacement from brush |

Brush objects define radius, strength, color; frames bake interaction.

### 12.7 Ocean

| Output | Use |
|--------|-----|
| Displacement | Shader displacement or mesh displacement |
| Foam/spray | Mask textures for shading foam |

Spectrum parameters (fetch, alignment, damp) define Gerstner-style waves or FFT tiles for repetition.

---

## 13. Hair and grooming

### Purpose

Author strand-based hair as first-class geometry with grooming tools, dynamics, and shading tuned for fibers.

### Data model

| Element | Stores |
|---------|--------|
| Strand | Control points (CVs), radius per CV or curve profile |
| Interpolation | Render hairs vs guide hairs ratio |
| Materials | Dedicated hair BSDF parameters (roughness along/azimuth, melanin optional) |

### Grooming & dynamics

| Capability | Specification |
|------------|---------------|
| Attachment | Roots on mesh surface (closest point / UV island / interpolated) |
| Brushes | Comb, smooth, length, cut—edit guide strands |
| Collision | Body mesh collision offset; substeps to reduce tunneling |
| Children | Interpolate render strands between guides with clumping/roughness |

**Acceptance criteria:** Changing guide count updates render hairs without breaking root attachment; baked sim replays from cache.

---

## 14. Shading and materials

### Purpose

Define surface and volume light response via node graphs compiled per render engine backend.

### Dependencies

Lights (§16), world (§20), mesh UVs (§4.6), texture images (disk).

### 14.1 Shader graph structure

| Concept | Rule |
|---------|------|
| Surface output | Final closure wired to Material Output node |
| Closure types | BSDF (opaque/transmissive), emission, transparent, holdout |
| Mixing | `Mix Shader` (factor blend); `Add Shader` for additive emission mixed with base |

### 14.2 Principled BSDF (physically based subset)

| Parameter group | Controls |
|-----------------|----------|
| Base | Base color, subsurface weight/radius/color |
| Specular | Specular tint/IOR level; anisotropic roughness |
| Metallic workflow | Metallic (0=dielectric, 1=metal), roughness |
| Transmission | Transmission weight, IOR, thin-wall approximate |
| Sheen | Fabric-like rim (cloth pipeline) |
| Coat | Secondary specular layer |
| Emission | Color × strength |

Exact parameter names vary by engine version; document parity matrix vs reference renderer.

### 14.3 Texture coordinates

| Space | Typical use |
|-------|-------------|
| Generated | Procedural without UVs |
| Object/world | Stable projection-scaled coordinates |
| UV | Image textures |
| Camera/window | Screen-space tricks |

### 14.4 Procedural textures

Each outputs scalar or color driven by input vector; commonly: Noise (multiple dimensions), Voronoi (distance/F1/F2), Musgrave fractal, Wave, Brick, Checker.

### 14.5 Utility nodes

Mapping (scale/rotate/translate), Vector Math, Color Ramp (scalar→color mapping), Bump vs Normal Map (tangent-space perturbation), displacement output for true displacement when subdivided.

### 14.6 NPR / lines

Optional geometry/view-dependent edge detection or freestyle-style line passes—distinct render pipeline stage from GI beauty.

---

## 15. Texturing and UV tools

### Purpose

Map 2D images onto 3D with minimal stretch and production-ready UDIM workflows.

**Deliverables:** UDIM tile naming; island packing with rotation bins; margin in texels; painting masks and stencils.

---

## 16. Lighting

### Purpose

Illuminate scenes with artist-controllable units and shadows matching renderer capabilities.

| Light | Behavior |
|-------|----------|
| Point | Inverse-square falloff |
| Spot | Cone angle + blend softness |
| Sun | Parallel rays |
| Area | Soft shadows scale with area |

IES: angle→intensity texture for real luminaires.

Light linking: restrict light→object pairs (engine feature flag).

---

## 17. Cameras and effects

Shift sensor offsets for architectural framing; DOF from physical camera parameters (f-stop, focal length, sensor size).

Background reference images: viewport-only alignment plates.

---

## 18. Rendering — Cycles-class path tracer

### Purpose

Unbiased/biased-controllable **global illumination** via path sampling—reference images for lighting validation and delivery.

### Dependencies

Evaluated meshes (depsgraph), shaders compiled to closure evaluate functions, lights, camera, film settings.

### 18.1 Integration algorithm

| Mechanism | Role |
|-----------|------|
| Unidirectional path tracing | Extend paths from camera through bounces |
| MIS | Combine BSDF sampling with light sampling to reduce fireflies |
| Russian roulette | Terminate paths probabilistically after threshold depth |
| Separate bounce caps | Limit diffuse vs glossy vs transmission vs volume ray counts independently |

**Caustics:** Optional specialized paths or guiding—often expensive; expose toggles.

### 18.2 Devices

| Backend | Implication |
|---------|-------------|
| CPU | Wide SIMD batching; predictable memory |
| GPU | Mega-kernel or wavefront; kernel compile per architecture; VRAM bounds scenes |

### 18.3 Sampling strategy

| Feature | Behavior |
|---------|----------|
| Progressive | Refine image every sample pass |
| Adaptive | Allocate extra samples to high-noise tiles |
| Denoise | Post-filter (OIDN/OptiX) using auxiliary features (albedo, normal) |

**Acceptance criteria:** Same scene + seed → bitwise-identical output on same device/build (document floating-point variance across platforms).

### 18.4 Light transport passes

Typical AOV splits: Diffuse Direct/Indirect, Glossy Direct/Indirect, Transmission, Volume Direct/Indirect, Emission, Environment.

**Cryptomatte:** Encode object/material/asset IDs into EXR auxiliary layers for compositing isolation.

### 18.5 Volumes

Homogeneous vs heterogeneous density; **equiangular sampling** along rays reduces noise in dense volumes; multi-scattering approximations vs brute force bounce caps.

---

## 19. Rendering — real-time (EEVEE-class)

### Purpose

Raster/hybrid pipeline for **interactive** feedback and game-export-friendly shading within known approximation limits.

### Architecture expectations

| Layer | Typical technique |
|-------|-------------------|
| G-buffer | Deferred shading for opaque surfaces |
| Lighting | Punctual + area lights with shadow maps/cascades |
| GI approx | Light probes / irradiance volumes / screen probes—engine-version-specific |
| Screen-space | SSR for reflections; ambient occlusion from depth/normals |
| Transparency | Sorted layers, alpha hash, or clip—each with documented artifacts |

### Feature checklist

| Feature | PM note |
|---------|---------|
| Contact shadows | Screen-space short-range shadow catch |
| Bloom | Threshold + blur composite |
| DOF | Circle of confusion from depth |
| Motion blur | Velocity buffer blur optional |

**Acceptance criteria:** Written parity matrix vs §18 listing known divergences (energy conservation, thin transparency, volume single scatter).

---

## 20. World and environment

### Purpose

Define scene-wide lighting defaults independent of mesh objects—especially infinite HDR lighting.

| Setting | Behavior |
|---------|----------|
| Background shader | Color or texture-driven emission |
| Strength | Linear multiplier on environment contribution |
| Rotation Z/Y | Align HDRI to scene north |
| MIS | Importance sample bright texels to reduce noise |

**Dependencies:** §14 world shader graph; §18/§19 environment sampling.

---

## 21. Compositing

### Purpose

Post-process rendered layers and plate footage without round-tripping to another app—supports delivery formats (multi-layer EXR) and editorial fixes.

### Inputs

| Source | Provides |
|--------|----------|
| Render Layers node | Passes from §18/§19 (beauty, diffuse, emit, depth, vector, cryptomatte) |
| Image/Movie Clip | External plates |
| Mask | Rotoscoped alpha from §22 |

### Node inventory by class

| Class | Representative nodes (examples) |
|-------|----------------------------------|
| Input | Render Layers, Image, Mask |
| Color | Bright/Contrast, Hue Saturation, Color Balance, Tone Map |
| Filter | Blur, Bilateral Blur, Defocus (depth guided), Glare, Vector Blur |
| Matte | Color Key, Channel Key, Double Edge Mask |
| Distort | Translate/Scale/Rotate on image coordinates |
| Vector | Map UV—warp using vector pass |
| Converter | Separate RGBA, Combine RGBA, Math |
| Output | Composite (viewer target), File Output (paths per pass), Viewer |

**Acceptance criteria:** EXR multi-layer round-trip preserves cryptomatte IDs; color pipeline respects scene OCIO display/view.

---

## 22. Motion tracking

### Purpose

Recover **camera extrinsics/intrinsics** and optionally **object motion** from 2D feature tracks over plate footage—output drives §3 viewport camera and §21 compositing masks.

### Pipeline stages

| Stage | Input | Output |
|-------|-------|--------|
| Lens distortion | Known polynomial model or solve K1/K2/K3 | Undistorted normalized coords |
| Feature detection | Frame pyramid | Candidate corners |
| Tracking | Patch correlation across frames | 2D tracks with confidence |
| Solve | Tracks + constraints | Camera path + 3D error metric |
| Orientation | Ground plane / scale reference | Scene-aligned units |
| Plane track | Four corners on planar surface | Homography for screen replacement |

### Solve modes

| Mode | Use |
|------|-----|
| Camera motion | Full 6DOF camera |
| Tripod | Pan/tilt only with fixed position |
| Object | Moving object relative to solved camera |

**Deliverables:** Export solved camera as keyframed empties/camera; stabilization strip for compositor smooth plate.

---

## 23. Video Sequencer

### Purpose

Non-linear timeline editing with mixed media—video, audio, stills, generated color, **nested 3D scenes**, and adjustment passes.

### Strip types

| Strip | Contains |
|-------|----------|
| Movie | Video codec stream + embedded/synced audio track reference |
| Sound | Waveform-backed audio |
| Image | Single still |
| Image sequence | Numbered frame pattern |
| Color | Solid generator |
| Adjustment | Grade strips below in stack |
| Text | Rasterized titles |
| Scene | Render from §1 scene at strip resolution/frame range |

### Editorial vocabulary

| Operation | Effect on timeline |
|-----------|-------------------|
| Slip | Move media within strip bounds |
| Slide | Move strip without changing length |
| Ripple | Shift following strips to close gaps |
| Snap | Frame/grid alignment |

**Strip data:** Opacity/mix mode; volume curves for audio; fade handles on ends.

### Performance

Proxies: half/quarter-res movie substitutes for scrubbing; disk cache vs RAM cache policies explicit.

### Export

FFmpeg (or platform encoder) with matrix: container (MOV/MP4/MKV) × video codec (H.264/H.265/ProRes) × audio codec × bitrate/VBR.

---

## 24. Grease Pencil

### Purpose

Raster-quality **strokes in 3D**—storyboards, 2D animation, annotations—without UV-dependent texture workflow.

### Stroke model

| Field | Role |
|-------|------|
| Points | Polyline vertices in layer space |
| Pressure | Stroke width multiplier along stroke |
| Strength | Opacity or hardness |
| UV fill | Coordinates for closed-region fill |

### Materials

Separate **stroke** color/texture vs **fill**; holdout materials punch holes for compositing.

### Modifiers (non-destructive)

| Modifier | Effect |
|----------|--------|
| Noise | Jitter points |
| Thickness | Width envelope |
| Tint | Color variation |
| Build | Reveal stroke over time |
| Array | Repeat stroke pattern |

### Animation

Layer-level frame holds; onion skin shows adjacent frames for timing.

**Acceptance criteria:** Render engine draws strokes with correct depth vs mesh; animation playback matches frame stepping.

---

## 25. Import and export

### Purpose

Reliable interchange with clear loss documentation.

| Format | Typical use | Loss risks |
|--------|-------------|------------|
| glTF | Web/real-time | Complex nodal shading approximated to PBR |
| FBX | DCC exchange | Axis/scale mismatches; animation stacks |
| Alembic | Animated caches | Materials not primary concern |
| USD | Pipeline assembly | Material binding variance across apps |
| OBJ/MTL | Simple meshes | No animation |
| STL/PLY | Print/points | No UV |
| SVG | Curves | Fill rules |

**Importer checklist:** Up-axis conversion, scale factor, frame rate mapping, material approximation warnings UI.

---

## 26. Audio

### Purpose

Spatial audio preview in 3D and editorial sync with picture in the sequencer.

| Surface | Behavior |
|---------|----------|
| Speaker object | Cone angle, outer gain falloff, volume—evaluated per listener |
| VSE sound strip | Clip playback aligned to frame range; scrubbing feedback |
| Waveform UI | Optional decoded preview for editorial timing |

**Dependencies:** Platform audio backend; video decode for muxed audio in §23.

---

## 27. Scripting and automation

### Purpose

Automate repetitive tasks, pipeline integration, and render farms **without** shipping C++ plugins for every studio script.

### API modules (conceptual parity)

| Module | Responsibility |
|--------|----------------|
| Data API | Iterate/create/remove datablocks (`meshes`, `materials`, …) |
| Context | Read active/selection—matches operator assumptions |
| Operators | Invoke same code paths as UI buttons |
| Types | Register Python subclasses: `Operator`, `Panel`, `PropertyGroup`, `AddonPreferences` |

### Handlers (lifecycle hooks)

| Handler | Fires |
|---------|-------|
| Frame change | Pre/post frame change for pipelines |
| Render | Pre/post render, write still |
| Depsgraph | After evaluation updates |

### Headless / batch

CLI loads blend, sets frame range, runs script, writes outputs—**no** GPU UI requirement; optional `-b` background flag pattern.

**Acceptance criteria:** Script invoking operator produces identical result to UI click for same context.

---

## 28. XR / VR

### Purpose

Review scale and layout in HMD without game-engine export.

| Requirement | Detail |
|-------------|--------|
| Runtime | OpenXR as portable baseline |
| Stereo submit | Two eye textures + optional depth for reprojection |
| Input | Tracked controllers or hands for locomotion/teleport |

**Acceptance criteria:** Session start/end cleans GPU resources; frame rate meets comfortable VR threshold or degrades gracefully.

---

## 29. Precision, units, CAD-adjacent workflows

### Purpose

Align numeric modeling with physical dimensions for manufacture and layout checks.

| Setting | Effect |
|---------|--------|
| Unit system | Metric vs imperial display |
| Unit scale | Multiplier from Blender units to meters (impacts simulation constants) |
| Grid | Snap increments respect unit |
| Dimensions overlay | Edge lengths and area readouts in viewport |

Orthographic views + scale references support mechanical/arch visualization—not full CAD constraint solving unless scoped separately.

---

## 30. File format and collaboration

### Purpose

Single-file round-trip of scene state with optional **linked** external libraries for team parallelism.

| Mechanism | Behavior |
|-----------|----------|
| Container format | Binary archive of tagged datablocks |
| Pointer fixup | Relocate addresses on load—endianness and alignment documented |
| Append | Copy datablocks into working file |
| Link | Reference external path—read-only until overridden |
| Overrides | Replace subset of linked properties locally |

**Risk:** Forward compatibility—newer Blenders read older files; older Blenders may warn on unknown blocks.

**Deliverables:** Missing path report UI; relink browser for batch path fixes.

---

## 31. Testing expectations

### Purpose

Give release gates measurable evidence—**no** “looks fine” sign-off for rendering or simulation.

| Vertical | Automated test | Gate metric |
|----------|------------------|-------------|
| Mesh operators | Unit: apply op to fixture mesh → compare topology hash + bbox | Hash stable across platforms |
| Modifiers | Golden mesh per modifier preset | Vertex count + checksum bounds |
| Physics | Replay cache twice | Binary match or documented float tol |
| Renderer | HDR reference EXR compare | PSNR/SSIM ≥ threshold per scene |
| GPU draw | Startup + draw one frame headless | No crash; optional screenshot hash |
| IO round-trip | Import export sample assets | Warning log empty or expected-only |

**Manual QA** remains for UX timing and tablet hardware—outside pure CI.

---

## 32. Non-goals

Embedded real-time game export as **game engine** is out of scope for core DCC parity (forks exist).

---

## See also

- [Blender Manual](https://docs.blender.org/manual/en/latest/)
- [Blender Developer Documentation](https://developer.blender.org/docs/)
