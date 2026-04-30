# Engineering task backlog (maps to [blender.md](./blender.md))

## How engineers should use this

| Field | Meaning |
|-------|---------|
| **ID** | Stable handle for tickets (`ENG-§x.y-nnn` or `ENG-6.2-MODNAME`). |
| **Outcome** | Definition of done (testable). |
| **Implementation** | Concrete approach—start here; refine in design doc if needed. |
| **Depends on** | IDs or “§a.b foundation”—blocks parallel start. |
| **Size** | S ≈ days, M ≈ 1–2 weeks, L ≈ multi-sprint (order-of-magnitude only). |
| **Explain** | See [Explainability](#explainability-every-task-must-be-explainable)—required when closing work. |

**Rule:** Pick tasks whose **Depends on** are already merged or explicitly stubbed.

---

## Explainability (every task must be explainable)

Work is **explainable** if someone who did not write the code can **understand what changed, why it exists, and how to confirm it** without reverse-engineering the diff.

### What you deliver with each task (closure checklist)

| Artifact | Purpose |
|----------|---------|
| **Why (1 short paragraph)** | Business or technical reason: what user problem or subsystem contract this task satisfies. |
| **What (scoped)** | What files/modules you touched; what you explicitly did *not* change (avoids “scope creep is unclear”). |
| **How to verify** | Either: automated test name(s) + what they assert, **or** numbered manual steps + expected result. |
| **Failure modes** | How wrong behavior shows up (logs, UI, crashes)—helps QA and support. |
| **Links** | Ticket ID, ADR link if architectural, spec section in [blender.md](./blender.md). |

### Where this lives

| Size of change | Minimum documentation |
|----------------|------------------------|
| **S** | PR / merge request description covering the checklist above. |
| **M** | Above + brief note in module README or `docs/` one-pager if behavior is user-visible. |
| **L** | Above + ADR or design doc section for trade-offs (algorithm choice, GPU vs CPU, format versioning). |

### Review bar (“explainable” gate)

A reviewer approves when they can answer **without asking you**:

1. What observable behavior changed?  
2. Why is this approach acceptable versus a simpler alternative?  
3. What test or demo proves it works?

If any answer is missing, the task is **not** explainable yet—expand the PR text or add a test before merge.

### Example (filled in for one row)

| ID | Task | Outcome | Implementation | Depends | Size | **Explain / demonstrate** |
|----|------|---------|----------------|---------|------|---------------------------|
| ENG-3.3-001 | Selection picking | Correct hit-test under occlusion | GPU ID render pass + fallback raycast | ENG-3.8-001 | L | **Verify:** automated render pick from known camera returns object id 7; **failure:** wrong id when X-ray on—documented; **why:** interactive editing depends on reliable selection. |

Rows below follow the same **Explain** expectation even where the column is omitted—use the closure checklist in the PR.

---

## Phase map (from blender.md Program view)

| Phase | Sections | Notes |
|-------|----------|-------|
| **P0** | §1, §2 shell, §3 basics, §4 core mesh, §25/§30 IO | Blocks all authoring. |
| **P1** | §5–§7, §6 modifiers, §14–§17, §20 | Authoring + shading preview. |
| **P2** | §10–§11 | Animation/rig. |
| **P3** | §12 | Simulation vertical. |
| **P4** | §18–§21 | Rendering + comp. |
| **P5** | §22–§24, §26–§28 | Editorial, tracking, XR, audio polish. |

---

## §1 — Core application runtime

### §1.1 Process model

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-1.1-001 | Application entry & main loop | Single process boots UI or batch mode via flag | Parse CLI argv; branch `gui` vs `background`; init subsystems in order (RNA → data → GPU → editors) | — | M |
| ENG-1.1-002 | Session lifecycle | Autosave timer writes recovery file; dirty flag gates quit | Timer thread signals main thread; write minimal crash-safe temp blend | ENG-1.1-001, §30 save | S |
| ENG-1.1-003 | CLI contract | Documented flags: blend path, frame range, output, `-b`, `--python` | Use standard argparse/similar; print help; exit codes 0/1 | ENG-1.1-001 | S |

### §1.2 Context and modes

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-1.2-001 | Mode state machine | Per-object-type mode stored; illegal ops disabled | Enum per object type; transition table; invalidate tool registry on change | ENG-1.6-001 | M |
| ENG-1.2-002 | Context pointers | `active_object`, `selected_objects`, mode-active selection | Struct mirroring Blender context; sync from selection/outliner | ENG-2.2-001 | M |

### §1.3 Dependency graph

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-1.3-001 | Depsgraph core | Dirty tags propagate; topological eval order | DAG of deps nodes (object → modifiers → mesh); version stamps | ENG-1.7-001 | L |
| ENG-1.3-002 | Animation sampling | Properties evaluated at float frame time | Walk animated IDs; sample FCurves/drivers before transforms | ENG-10.4-001 | M |
| ENG-1.3-003 | Cache invalidation hooks | Physics/GN bake invalidate when inputs change | Hash inputs per cache consumer; UI banner “stale cache” | ENG-1.3-001 | M |

### §1.4 Undo/redo

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-1.4-001 | Undo stack | Push/pop snapshots or deltas; memcap LRU | Copy-on-write for large meshes optional; operator boundary | ENG-1.1-001 | L |
| ENG-1.4-002 | Modal undo grouping | Transform drag = one undo step | Begin modal pushes undo block end on confirm | ENG-1.6-002 | S |

### §1.5 Properties (RNA-like)

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-1.5-001 | Property registry | Typed fields + UI metadata + stable paths | Codegen or macros for struct definitions; path resolver for `location.x` | — | L |
| ENG-1.5-002 | Serialization bridge | Core structs round-trip through file IO | Iterate RNA tree; pointer relocation on load | ENG-1.5-001, §30 | L |

### §1.6 Operators

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-1.6-001 | Operator registry | Register idname → poll, execute, invoke, undo | Hash map; poll hides missing ops from search | ENG-1.5-001 | M |
| ENG-1.6-002 | Modal operator runtime | Pointer stream → axis locks → numeric entry | Event pump from window system; shared modal math utils | ENG-1.6-001 | M |

### §1.7 ID datablocks & libraries

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-1.7-001 | ID base type | User counts, rename, library weak refs | Ref-count + fake user; rename map across pointers | ENG-1.5-001 | M |
| ENG-1.7-002 | Link/append | Linked RO data; append duplicates into file | Path resolver; remap IDs on append | ENG-1.7-001, §30 | L |
| ENG-1.7-003 | Library overrides | Property-level override layer | Diff overlay struct; serialize overrides | ENG-1.7-002 | L |

### §1.8 Collections & view layers

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-1.8-001 | Collection graph | Parent/child collections; object membership | Tree structure; inclusion queries for render | ENG-1.7-001 | M |
| ENG-1.8-002 | View layers | Per-layer collection masks + holdout/indirect | Bitsets per object per layer; evaluate visibility pipeline | ENG-1.8-001 | M |

---

## §2 — User interface & workflow

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-2.1-001 | Window/area/region tree | Split/join; persist layout JSON | Docking layout model; serialize workspace | ENG-1.1-001 | L |
| ENG-2.1-002 | Editor type router | Each area draws one editor | Virtual `Editor` interface: draw(), poll(); factory per type | ENG-2.1-001 | M |
| ENG-2.2-001 | Minimal editors shell | Empty canvas + header for Viewport, Outliner, Properties | Stub editors registering regions | ENG-2.1-002 | M |
| ENG-2.3-001 | Theme tokens | Widget colors/fonts scale | CSS-like token table or JSON theme | ENG-2.1-001 | S |
| ENG-2.4-001 | Gizmo framework | Transform gizmo draws & hits tests | Screen-space handles; constraint to axes | ENG-3.8-001 | M |
| ENG-2.5-001 | Operator search | Fuzzy palette invokes `bpy.ops` equivalent | Trie/fuzzy on idnames + labels | ENG-1.6-001 | S |
| ENG-2.6-001 | Asset library scanner | Index `.blend` roots; thumbnails | Background worker; mmap or subprocess extract thumb | ENG-1.7-002 | L |
| ENG-2.7-001 | Batch rename op | Pattern tokens rename selection | Single undo step; regex safety | ENG-1.6-001 | S |

---

## §3 — Three-dimensional viewport

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-3.1-001 | ViewProjection matrices | Persp/ortho + clip planes | Standard glm-style matrices; stereo eye offset | ENG-2.2-001 | S |
| ENG-3.2-001 | Navigation ops | Orbit/pan/zoom/bookmarks | Trackball vs turntable; quat accumulation | ENG-3.1-001 | M |
| ENG-3.3-001 | Selection picking | GPU ID buffer + raycast fallback | Encode object index in attachment; X-ray mode toggle depth | ENG-3.8-001 | L |
| ENG-3.3-002 | Mesh component selection | Vert/edge/face buckets | Extend picking buffer with elem ids | ENG-4.1-001, ENG-3.3-001 | M |
| ENG-3.4-001 | Transform operator | Move/rotate/scale modal | Pivot math; constraint axes; numeric panel | ENG-1.6-002, ENG-3.2-001 | L |
| ENG-3.4-002 | Snapping subsystem | Grid + verts + edge mid | Spatial accel over evaluated mesh (BVH) | ENG-3.4-001, ENG-1.3-001 | M |
| ENG-3.5-001 | Viewport shading modes | Wire/solid/material/rendered | Switch shader technique set | ENG-3.8-001, §14 preview | M |
| ENG-3.6-001 | Overlay toggles | Normals, stats, motion paths | Instanced debug draws | ENG-3.8-001 | M |
| ENG-3.8-001 | GPU render backend | Device abstraction + buffer pools | Metal/Vulkan/GL backend interface; uniform ring buffer | ENG-1.1-001 | L |

---

## §4 — Modeling (mesh)

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-4.1-001 | Mesh buffers | Vertices, edges, faces, loops + attributes | Half-edge or loop representation; validate manifold ops | — | L |
| ENG-4.1-002 | Attribute layers | UV/COLOR/custom float layers per loop/vert | SoA layout for SIMD | ENG-4.1-001 | M |
| ENG-4.2-001 | Primitive operators | Cube/sphere/… generation | Parameterized constructors writing ENG-4.1-001 | ENG-4.1-001 | M |
| ENG-4.3-001 | Extrude / inset / inset-individual | Correct normals & manifold rules | Face inset polygon clipping | ENG-4.1-001 | L |
| ENG-4.3-002 | Bevel op | Edge bevel with segments/profile | Offset curves; miter patterns | ENG-4.1-001 | L |
| ENG-4.3-003 | Loop cut / edge slide | Ring insertion | Edge loop detection graph | ENG-4.1-001 | M |
| ENG-4.3-004 | Knife modal | Plane intersections | BSP classification of faces | ENG-4.1-001, ENG-1.6-002 | L |
| ENG-4.3-005 | Bridge / fill / dissolve | Boundary ops | Ear clipping / fan fill | ENG-4.1-001 | M |
| ENG-4.4-001 | Merge by distance | Weld verts epsilon | Spatial hash | ENG-4.1-001 | S |
| ENG-4.5-001 | Normal pipeline | Face normals + split normals + auto-smooth | Angle threshold splits loops | ENG-4.1-001 | M |
| ENG-4.6-001 | UV unwrap solvers | LSCM/conformal | Eigen sparse solve or libigl-style | ENG-4.1-002 | L |
| ENG-4.6-002 | UV pack | Pack islands with margin | Bin packing heuristic | ENG-4.6-001 | M |
| ENG-4.7-001 | Vertex groups API | Named weights | Assign/remove normalize ops | ENG-4.1-001 | S |

---

## §5 — Curves, metaballs, text

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-5.1-001 | Bézier/NURBS core | Evaluate curve → polyline | De Casteljau / basis eval | — | M |
| ENG-5.1-002 | Curve object pipeline | Bevel/extrude/taper → mesh | Tessellation resolution sliders | ENG-5.1-001, ENG-4.1-001 | L |
| ENG-5.2-001 | Metaball implicit field | Polygonize marching cubes | Scalar field eval per primitive type | ENG-4.1-001 | L |
| ENG-5.3-001 | Text → curve → mesh | Font load + glyph tess | HarfBuzz/FreeType stack | ENG-5.1-001 | M |

---

## §6 — Modifiers

**Shared prerequisite:** `ENG-MOD-000` — Modifier stack evaluator: ordered apply on mesh payload; cage vs evaluated toggle; depsgraph links to targets.

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-MOD-000 | Modifier stack framework | Iterator + per-modifier dispatch | Virtual `Modifier::eval(Mesh&)`; persist UI props on RNA | ENG-4.1-001, ENG-1.3-001 | L |

### §6.1 Modify-type

| ID | Modifier | Outcome | Implementation | Size |
|----|----------|---------|----------------|------|
| ENG-6.1-DATAXFER | Data Transfer | Attributes mapped from other mesh | Nearest-neighbor / ray hit map once at bind | L |
| ENG-6.1-SEQ | Mesh Sequence Cache | Alembic/USD playback | Stream vertices per frame from cache lib | L |
| ENG-6.1-NORMAL | Normal Edit | Manual/shaded normals | Loop split edits | M |
| ENG-6.1-UVPROJ | UV Project | Projector matrix UV | Assign loop UV from clip space | S |
| ENG-6.1-UVWARP | UV Warp | Bone-driven affine UV | 2×2 + translate from bone delta | S |
| ENG-6.1-VWEIGHT | Vertex Weight Edit | Texture→weights | Sample tex at vert 3D pos | M |
| ENG-6.1-VWMIX | Vertex Weight Mix | Per-vert combine | Branch per mix op | S |
| ENG-6.1-VWPROX | Vertex Weight Proximity | Distance falloff | KD-tree to target mesh | M |

### §6.2 Generate-type

| ID | Modifier | Outcome | Implementation | Size |
|----|----------|---------|----------------|------|
| ENG-6.2-ARRAY | Array | Repeated transforms + merge | Instance matrices; weld pass | M |
| ENG-6.2-BEVEL | Bevel (mod) | Non-destructive bevel | Same core as §4.3-002 with limit geometry | L |
| ENG-6.2-BOOL | Boolean | CSG | Manifold library (Manifold/CGAL/mesh booleans) | L |
| ENG-6.2-BUILD | Build | Face reveal over time | Sorted face mask | S |
| ENG-6.2-DECIMATE | Decimate | Reduce tris | Quadric error collapse / planar merge | L |
| ENG-6.2-ESPLIT | Edge Split | Duplicate verts along sharp | Angle threshold | S |
| ENG-6.2-MASK | Mask | Delete by weight threshold | Conditional face emit | S |
| ENG-6.2-MIRROR | Mirror | Bisect + weld | Symmetry plane | M |
| ENG-6.2-MULTIRES | Multires | Subdiv levels | Catmull-Clark subdiv stack | L |
| ENG-6.2-REMESH | Remesh | Voxel remesh | OpenVDB/dual contouring optional | L |
| ENG-6.2-SCREW | Screw | Lathe | Rotate extrude profile | M |
| ENG-6.2-SKIN | Skin | Skeleton inflate | Spanning tree radii | L |
| ENG-6.2-SOLID | Solidify | Shell offset | Extrude normals + rim | M |
| ENG-6.2-SUBSURF | Subdivision Surface | Catmull-Clark | Crease weights on edges | L |
| ENG-6.2-TRI | Triangulate | All tris | Fan/beauty | S |
| ENG-6.2-WNORMAL | Weighted Normal | Weighted vtx normals | Accumulate face normals | M |
| ENG-6.2-WELD | Weld | Merge tol | Spatial hash | S |

### §6.3 Deform-type

| ID | Modifier | Outcome | Implementation | Size |
|----|----------|---------|----------------|------|
| ENG-6.3-ARM | Armature | Skinning | LBS/DQS matrix palette | L |
| ENG-6.3-CAST | Cast | Implicit warp | Distance field deform | M |
| ENG-6.3-CURVE | Curve deform | Frenet frame along path | Arc-length parameter | M |
| ENG-6.3-DISP | Displace | Texture displacement | Sample disp map + normal perturb | M |
| ENG-6.3-HOOK | Hook | Empty pulls group | Affine partial transform | S |
| ENG-6.3-LAPL | Laplacian Deform | Harmonic coords | Sparse linear solve | L |
| ENG-6.3-LATT | Lattice | FFD | Trilinear grid | M |
| ENG-6.3-MDEF | Mesh Deform | Cage bind | BDM/WPSC cage interp | L |
| ENG-6.3-SHRINK | Shrinkwrap | Project to surface | BVH closest point / ray | M |
| ENG-6.3-SIMPLE | Simple Deform | Twist/bend/taper | Analytic deformation | M |
| ENG-6.3-SMOOTH | Smooth family | Relax verts | Laplacian iterations | S |
| ENG-6.3-SURF | Surface Deform | Bind ride surface | UV-like bind mesh | L |
| ENG-6.3-WARP | Warp | Two-point warp | Radial basis / shear warp | M |
| ENG-6.3-WAVE | Wave | Phase sine | Displace along axis | S |
| ENG-6.3-VOLDISP | Volume Displace | Move volume | Sample vector grid | M |

### §6.4 Simulate-type & physics bridge

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-6.4-CLOTH | Cloth modifier wire-up | Mesh driven by cloth sim | Read cache from §12.3 | ENG-MOD-000, ENG-12.3-001 | M |
| ENG-6.4-SOFT | Soft body bridge | Same pattern | Cache consumer | ENG-12.2-001 | M |
| ENG-6.4-FLUID | Fluid domain bridge | Domain bounds + mesh seq | Interface to fluid bake | ENG-12.4-001 | M |
| ENG-6.4-OCEAN | Ocean modifier | Displace from spectrum | FFT/Gerstner eval | ENG-12.7-001 | M |
| ENG-6.4-DPAINT | Dynamic Paint | Canvas maps | Rasterize brush→UV tex | ENG-12.6-001 | L |
| ENG-6.4-EXPL | Explode | Face scatter | Time-based offset | S |
| ENG-6.5-COLL | Collision modifier | Collision mesh for cloth | Extra BVH for solver | ENG-12.3-001 | M |
| ENG-6.5-PART | Particle system hook | Legacy emitter settings | Bridge to particle engine if built | TBD | L |

---

## §7 — Geometry Nodes

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-7-001 | Graph VM | Topological sort; exec nodes | Socket type system; field lazy eval | ENG-MOD-000 | L |
| ENG-7-002 | Field attributes | Named arrays per domain | Attribute lifecycle + anonymous attrs | ENG-7-001 | L |
| ENG-7-003 | Instance system | Instancing + realize | Expand to geometry on demand | ENG-7-001 | L |
| ENG-7-004 | Repeat zone | Loop subgraph | Fixed iteration count + feedback edges | ENG-7-001 | L |
| ENG-7-005 | Simulation zone | Frame cache state | Persistent attribute buffers per ID | ENG-7-002 | L |
| ENG-7-006 | Node library batch 1 | Mesh read/write/sampling | Implement nodes per blender.md §7 checklist group | ENG-7-001 | L |
| ENG-7-007 | Bake operator | Disk bake GN output | Serialize geometry per frame | ENG-7-005 | M |

---

## §8 — Sculpting & painting

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-8.1-001 | PBVH accelerator | Brush affects subtree only | Octree over triangles | ENG-4.1-001 | L |
| ENG-8.1-002 | Dyntopo | Split/collapse during stroke | Edge ops preserving manifold goals | ENG-8.1-001 | L |
| ENG-8.2-001 | Brush stroke engine | Spacing jitter pressure curves | Tablet API integration | ENG-1.6-002 | M |
| ENG-8.3-001 | Brush kernels batch | Grab/clay/smooth/… | Shared displacement kernels | ENG-8.1-001 | L |
| ENG-8.4-001 | Mask buffer | Paint mask + blur | GPU tex or vert attrib | ENG-8.1-001 | M |
| ENG-8.5-001 | Vertex paint mode | RGBA layers | Same stroke engine on color attrib | ENG-8.2-001 | M |

---

## §9 — Retopology

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-9-001 | Shrinkwrap modifier | Snap verts to target shell | Iterative project + ENG-6.3-SHRINK core | ENG-MOD-000 | M |
| ENG-9-002 | Surface snap edit mode | Snap transform to surface | Ray cast against target BVH | ENG-3.4-001 | M |

---

## §10 — Rigging & animation

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-10.1-001 | Bone data structures | Edit/pose armature | Head/tail/roll; pose matrices | — | M |
| ENG-10.1-002 | Heat weights | Auto skin bind | Diffuse distance solve | ENG-4.7-001 | L |
| ENG-10.2-001 | IK solver | 2-bone + chain IK | CCD or analytic two-bone | ENG-10.1-001 | L |
| ENG-10.2-002 | Spline IK | Bones along curve | Arc-length bone placement | ENG-5.1-001 | M |
| ENG-10.3-001 | Shape keys | Basis + deltas | Blendshape apply | ENG-4.1-001 | M |
| ENG-10.4-001 | FCurve storage | Keys + handles | Bézier interpolation | ENG-1.5-001 | M |
| ENG-10.4-002 | Quaternion curves | Slerp between keys | Normalize quats | ENG-10.4-001 | S |
| ENG-10.5-001 | Graph Editor UI | Edit handles | Canvas + zoom | ENG-10.4-001 | L |
| ENG-10.6-001 | Driver evaluation | Expr references props | Lexer/parser safe subset | ENG-10.4-001 | M |
| ENG-10.7-001 | NLA strips | Tracks blend | Clip evaluation order | ENG-10.4-001 | L |
| ENG-10.8-001 | Motion paths | Sample & draw | GPU line strip | ENG-10.4-001 | S |

---

## §11 — Constraints

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-11-001 | Constraint solver pass | Ordered evaluation before matrix finalize | One iteration or documented cascade | ENG-1.3-001 | M |
| ENG-11-002 | IK constraint node | Same as ENG-10.2-001 hook | Constraint wrapper | ENG-10.2-001 | S |
| ENG-11-TRACK | Tracking constraints batch | Copy/Limit/Track/ChildOf/… | Per-constraint small matrix math | ENG-11-001 | L |

---

## §12 — Physics & simulation

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-12.1-001 | Rigid body world | Dynamics simulation step | Bullet-style solver integration | ENG-1.3-001 | L |
| ENG-12.2-001 | Soft body solver | Springs + goal | Explicit integration | ENG-4.1-001 | L |
| ENG-12.3-001 | Cloth solver | Mass-spring cloth | Self-collision layers | ENG-12.2-001 | L |
| ENG-12.4-001 | Fluid FLIP | Domain grid + particles | Mantaflow-like or reference impl | ENG-12.1-001 | L |
| ENG-12.5-001 | Force fields | Wind/turbulence/etc. | Force accumulation pass | ENG-12.x solvers | M |
| ENG-12.6-001 | Dynamic paint raster | UV raster brush | GPU render brush to texture | ENG-4.1-002 | M |
| ENG-12.7-001 | Ocean spectrum | Displacement tiles | FFT shader or CPU | — | M |

---

## §13 — Hair

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-13-001 | Hair curves data | Strand CVs + radius | New geometry type or curve variant | ENG-5.1-001 | L |
| ENG-13-002 | Groom brushes | Comb/cut on strands | Spatial queries on curves | ENG-8.2-001 | L |
| ENG-13-003 | Hair collision | Segment vs mesh | Narrow-phase tests | ENG-12.3-001 | M |

---

## §14 — Shading & materials

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-14-001 | Shader graph compiler | Node graph → closure tree | Topo sort; dead-code elimination | — | L |
| ENG-14-002 | Principled closure | GGX BSDF params | Implement BSDF eval for path tracer | ENG-14-001 | L |
| ENG-14-003 | Procedural noise lib | Noise/Voronoi/Musgrave | Deterministic GPU/CPU | ENG-14-001 | M |
| ENG-14-004 | Preview shader path | EEVEE/Cycles preview | Shared closure eval subset | ENG-19-001 or ENG-18-001 | L |

---

## §15 — Texturing & UV tools

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-15-001 | UDIM tile addressing | Tile indices in UV space | Paint + export naming | ENG-4.6-001 | M |
| ENG-15-002 | Texture paint projection | 3D brush → image | UV seam handling | ENG-3.8-001 | L |

---

## §16 — Lighting

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-16-001 | Light shaders | Point/spot/sun/area PDF sampling | Solid angle sampling for area | ENG-18-001 | M |
| ENG-16-002 | IES loader | 1D angle→cd | LUT texture | ENG-16-001 | S |

---

## §17 — Cameras

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-17-001 | Physical camera | Sensor/f-stop/focus | Thin lens DOF sampling | ENG-18-001 | M |
| ENG-17-002 | Background plates | Viewport image plane | Non-render aligned quad | ENG-3.8-001 | S |

---

## §18 — Path tracer (Cycles-class)

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-18-001 | Path integrator core | Unidirectional PT + MIS | Next-event estimation; BSDF eval | ENG-14-002 | L |
| ENG-18-002 | GPU path kernel | Wavefront or megakernel | NV/AMD/Apple backends | ENG-18-001 | L |
| ENG-18-003 | Adaptive sampling | Tile noise estimate | Variance-guided sample budget | ENG-18-001 | M |
| ENG-18-004 | Light passes + Cryptomatte | AOV outputs | ID buffers per bounce subset | ENG-18-001 | L |
| ENG-18-005 | Volume integration | Heterogeneous medium | Delta tracking / equiangular | ENG-18-001 | L |

---

## §19 — Real-time (EEVEE-class)

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-19-001 | Deferred G-buffer | MRT layout | PBR channels | ENG-3.8-001 | L |
| ENG-19-002 | Screen-space effects | SSR/AO/bloom | Depth-aware passes | ENG-19-001 | L |
| ENG-19-003 | Transparency modes | Sort/hash/blend | Document limitations | ENG-19-001 | M |

---

## §20 — World

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-20-001 | Environment sampling | HDRI importance map | Build alias table | ENG-16-001 | M |

---

## §21 — Compositing

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-21-001 | Compositor graph VM | Node exec on CPU/GPU | Same pattern as §7 | ENG-18-004 outputs | L |
| ENG-21-002 | File output multi-layer EXR | Write passes | OpenEXR lib | ENG-21-001 | M |

---

## §22 — Motion tracking

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-22-001 | Feature track correlation | KLT/optical flow patch | Grayscale pyramid | — | L |
| ENG-22-002 | Bundle adjustment | Camera + points solve | Ceres/g2o-style sparse BA | ENG-22-001 | L |
| ENG-22-003 | Distortion model | Brown-Conrady params | Apply/undistort pipeline | ENG-22-002 | M |

---

## §23 — Video Sequencer

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-23-001 | Strip timeline model | Non-overlap rules optional | Data structure + undo | ENG-1.4-001 | M |
| ENG-23-002 | Codec decode path | FFmpeg decode frames | Async prefetch | ENG-23-001 | L |
| ENG-23-003 | Proxy generation | Lower-res movie | Background job | ENG-23-002 | M |
| ENG-23-004 | Export encode | Container write | FFmpeg mux | ENG-23-001 | M |

---

## §24 — Grease Pencil

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-24-001 | Stroke storage | Points + pressure | GPU buffer upload | ENG-3.8-001 | M |
| ENG-24-002 | Fill tessellation | Closed regions | Triangulation | ENG-24-001 | M |
| ENG-24-003 | GP modifiers | Noise/thickness… | Mesh-like stack on strokes | ENG-MOD-000 | L |

---

## §25 — Import / export

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-25-001 | glTF 2.0 I/O | Full round-trip subset | Khronos sample validator pass | ENG-4.1-001, ENG-14-001 | L |
| ENG-25-002 | FBX I/O | Common studio exchange | Autodesk SDK or OpenFBX | ENG-4.1-001 | L |
| ENG-25-003 | OBJ/MTL | Baseline mesh | Simple parser/writer | ENG-4.1-001 | S |
| ENG-25-004 | Alembic cache | Animated mesh | Alembic C++ API | ENG-4.1-001 | L |

---

## §26 — Audio

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-26-001 | Audio backend | Mix bus + spatial | miniaudio/OpenAL | ENG-1.1-001 | M |
| ENG-26-002 | VSE audio sync | Sample-accurate scrub | Clock tied to frame rate | ENG-23-001 | M |

---

## §27 — Scripting

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-27-001 | Python embedding | `bpy` modules | PyBind11/C API expose RNA | ENG-1.5-001 | L |
| ENG-27-002 | Operator exposure | Call ops from Python | Generated bindings | ENG-27-001 | M |

---

## §28 — XR

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-28-001 | OpenXR session | Stereo swapchain | Initialize xrCreateSession path | ENG-3.8-001 | L |
| ENG-28-002 | XR navigation | Teleport / fly | Map inputs to §3.2 | ENG-28-001 | M |

---

## §29 — Units & precision

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-29-001 | Unit scale propagation | Sim uses meters internally | Single conversion layer | ENG-1.5-001 | S |

---

## §30 — File format & collaboration

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-30-001 | Blend container v1 | Serialize RNA tree | Chunked binary + endian | ENG-1.5-002 | L |
| ENG-30-002 | Link rebinding UI | Fix broken paths | Batch search/replace | ENG-30-001 | S |

---

## §31 — Testing infrastructure

| ID | Task | Outcome | Implementation | Depends | Size |
|----|------|---------|----------------|---------|------|
| ENG-31-001 | Golden mesh tests | Hash topology after ops | pytest + fixtures | ENG-4.3-001 | M |
| ENG-31-002 | Render regression | EXR diff CI | Thresholded PSNR job | ENG-18-001 | M |

---

## Dependency graph (high level)

```
ENG-1.5 (RNA) → ENG-1.6 → ENG-1.7 → ENG-1.8
ENG-4.1 (mesh) → ENG-MOD-000 → §6 modifiers / §7 GN / §8 sculpt
ENG-4.1 → ENG-18 integrator → ENG-21 compositor (renders)
ENG-12.* depends ENG-MOD-000 + caches (ENG-1.3)
```

---

## See also

- Feature detail: [blender.md](./blender.md)
