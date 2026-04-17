# RepoPilot Client UI Design System

This document describes the implemented design system for the client UI in `repo-pilot-client`. It reflects the current codebase (Tailwind v4 + shadcn-style primitives + Base UI), not a theoretical future state.

## 1) System Overview

- **Framework:** Next.js App Router + React 19.
- **Styling model:** Tailwind CSS v4 with CSS custom properties as design tokens.
- **Component strategy:** shadcn-style local primitives in `components/ui/*`, powered by `@base-ui/react` and `class-variance-authority` (`cva`) for variants.
- **Iconography:** `lucide-react`.
- **Theming:** tokenized light/dark themes via CSS variables in `app/globals.css`; runtime theme support via `next-themes`.
- **Feedback patterns:** Sonner toasts (`components/ui/sonner.tsx`), status pills (`components/ui/status-badge.tsx`), progress/skeleton, dialogs and alerts.

The visual language emphasizes low contrast, neutral surfaces, subtle borders, compact spacing, and utility-first composition.

## 2) Design Foundations

### 2.1 Typography

Defined in `app/globals.css` and mirrored in `public/design-system.css`.

- **Primary family:** `--font-sans` mapped to Geist Sans stack.
- **Monospace family:** `--font-mono` for logs, durations, and tabular values.
- **Heading family:** `--font-heading` mapped to the same Geist Sans stack.
- **Core sizes in usage:**
  - `text-xl` for page-level headings.
  - `text-sm` / `text-[13px]` for body and controls.
  - `text-xs` and `text-[11px]` for metadata, helper text, badges.

### 2.2 Color Tokens

#### Semantic app tokens (`app/globals.css`)

Primary variables:

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`
- `--border`, `--input`, `--ring`
- Sidebar and chart token families.

#### Light theme intent

- Warm neutral paper surfaces (`#f2f0ea`, `#f8f6f1`) and soft borders.
- Dark text and subdued muted labels.
- Non-neon, earthy chart accents.

#### Dark theme intent

- Deep charcoal backgrounds (`#1a1a1a`, `#1f1f1f`) with gray typography.
- Preserved semantic state colors (success/amber/error/violet/cyan accents).
- Strong reliance on border differentiation rather than heavy shadows.

### 2.3 Radius, Border, and Shape

- Root radius token: `--radius: 0.5rem`.
- Derived radii: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, etc.
- Common shape usage:
  - `rounded-lg` for controls and cards.
  - `rounded-md` for compact pills and tabs.
  - `rounded-xl` for elevated containers/modals.
  - Fully rounded for count badges and status chips.

### 2.4 Surfaces and Texture

- `html` applies tiled background texture (`doodle-tile-light.svg` / `doodle-tile-dark.svg`) with `background-attachment: fixed`.
- `body` remains transparent to reveal texture while preserving readable content surfaces.
- Elevated UI (`card`, `popover`, dialogs) sits on top through tokenized surface contrast and light ring outlines.

### 2.5 Motion and State Transitions

Motion is intentionally minimal:

- Short transitions on hover/focus/active (`transition-all`, quick opacity/zoom in popups).
- Active feedback via micro movement (`active:translate-y-px` for buttons).
- Pulse effects for active status dots (`in_progress`, `active`, `running`).

## 3) Layout System

### 3.1 App Shell Pattern

`components/app/app-shell.tsx` defines the standard shell:

- Left navigation rail with collapse (`220px -> 52px`) and mobile slide-in.
- Top header (`h-12`) for section context and nav controls.
- Scrollable main region with consistent `px-6 py-6`.
- Bottom queue status bar for global background work visibility.

### 3.2 Navigation

- Nav item scale is compact (`text-[13px]`, icon `size-3.5`).
- Active state uses `bg-sidebar-accent` + `text-sidebar-accent-foreground`.
- Idle state uses muted text with subtle hover tint.
- Queue badge appears as numeric badge in expanded mode, dot indicator in collapsed mode.

### 3.3 Content Containers

- `SettingsGroup`: bordered, divided card for stacked settings rows.
- `SettingsRow`: horizontal two-column row with content left and controls right.
- `Card`: flexible container with header/content/footer slots and `size` mode (`default|sm`).

This creates a predictable hierarchy for pages like Settings, Rules, Tools, and RepoPilot controls.

## 4) Component Library (Implemented Primitives)

All primitives live in `components/ui/*`.

### 4.1 Buttons

`components/ui/button.tsx`

- **Variants:**
  - `default`: primary CTA.
  - `outline`: neutral border action.
  - `chrome`: dark control-surface variant used heavily in settings contexts.
  - `secondary`, `ghost`, `destructive`, `link`.
- **Sizes:**
  - `xs`, `sm`, `default`, `lg`, icon sizes (`icon-xs`, `icon-sm`, `icon`, `icon-lg`).
- **Behavior:**
  - Explicit focus ring (`focus-visible:ring-3`).
  - Disabled and invalid states are built in.
  - Icon sizing and spacing are standardized via slot-aware classes.

### 4.2 Inputs and Selectors

- **Input (`components/ui/input.tsx`):**
  - Compact default height (`h-8`), rounded, tokenized border/input colors.
  - Full support for disabled, invalid, placeholder, and dark mode styling.
- **Select (`components/ui/select.tsx`):**
  - Trigger sizes (`default|sm`), dropdown portal, animated popup.
  - Structured subcomponents: `SelectTrigger`, `SelectContent`, `SelectItem`, etc.
  - Checkmark indicator and chevron affordance built in.
- **Checkbox (`components/ui/checkbox.tsx`):**
  - 16x16 control with check icon indicator and semantic checked styles.

### 4.3 Structural and Data Components

- **Card (`components/ui/card.tsx`)** with slot components (`CardHeader`, `CardTitle`, etc.).
- **Table (`components/ui/table.tsx`)** for run history and list-heavy UIs; hover and selected row states.
- **Tabs (`components/ui/tabs.tsx`)**:
  - Variants: `default` (pill rail) and `line`.
  - Active-state styling with optional indicator line.

### 4.4 Overlays and Confirmation

- **Dialog (`components/ui/dialog.tsx`)**
  - Centered popup, subtle blur backdrop, compact spacing.
  - Optional top-right close action.
- **Alert Dialog (`components/ui/alert-dialog.tsx`)**
  - Used for irreversible/confirming actions (e.g., queue cancellation).
- **Tooltip / Dropdown / Scroll areas**
  - Secondary support for dense settings and constrained spaces.

### 4.5 Feedback Components

- **StatusBadge (`components/ui/status-badge.tsx`)**
  - Canonical statuses:
    - `pending`, `queued`, `waiting`, `in_progress`, `active`, `running`, `review`, `done`, `success`, `failed`, `skipped`
  - Encodes semantics through text + icon/dot color and subtle background treatments.
- **Progress (`components/ui/progress.tsx`)**
  - Label + value + track + indicator pattern.
- **Skeleton**
  - Lightweight placeholder pattern for loading areas.
- **Toaster (`components/ui/sonner.tsx`)**
  - Theme-aware toasts mapped to design tokens (`--popover`, `--border`, `--radius`).

## 5) Status and State Language

### 5.1 System Status Semantics

The UI consistently uses status chips and dots to represent work progression:

- **Neutral:** `pending`, `skipped`
- **Queued/waiting:** violet family
- **In-flight execution:** sky/amber/emerald with pulse for live activity
- **Success:** emerald
- **Failure:** destructive red
- **Review required:** amber icon state

### 5.2 Queue Representation

RepoPilot queue visuals use three levels:

1. **Global bar:** idle vs running summary.
2. **Expanded queue:** running/waiting counts plus chips.
3. **Job chip:** compact title + state dot/icon + optional cancel action.

This hierarchy keeps background operations visible without overwhelming content pages.

## 6) Accessibility and Interaction Rules

Implemented patterns include:

- Clear keyboard focus styling (`focus-visible:border-ring` + ring layers).
- Disabled-state opacity and pointer-event guarding.
- Aria-aware styling (`aria-invalid`, `aria-expanded`, checked/data states).
- Icon + text pairing for statuses (not color-only meaning).
- Dialog overlay + close controls + escape handling in shell/mobile nav interactions.

## 7) The HTML Reference Artifact

`public/design-system.css` and `public/design-system.html` provide a static design reference parallel to the React implementation:

- Includes low-level `--ds-*` token set and concrete pattern classes.
- Mirrors the dark, subtle settings language.
- Useful for visual spec alignment and parity checks between static references and React components.

Note: React runtime components in `components/ui/*` and app pages remain the source of truth for behavior and final implementation details.

## 8) Practical Usage Guidelines for Contributors

When adding new client UI:

1. **Start with tokens** (`bg-card`, `text-muted-foreground`, `border-border`) instead of raw hex values.
2. **Prefer existing primitives** (`Button`, `Input`, `Card`, `StatusBadge`, `Dialog`) over custom ad hoc markup.
3. **Keep density compact** (13px baseline, tight paddings, subdued contrast).
4. **Use status vocabulary consistently** with existing badge statuses.
5. **Follow shell spacing contracts** (`px-6` body region, row-based settings groups).
6. **Honor dark/light variables** and avoid hardcoded one-theme colors unless intentionally scoped demo/reference styling.
7. **Preserve subtlety:** avoid high-saturation fills, heavy drop shadows, or excessive motion.

## 9) File Map (Design-System-Relevant)

- `repo-pilot-client/app/globals.css` - global tokens, theme variables, base layer, texture.
- `repo-pilot-client/components/ui/*` - reusable primitives and variants.
- `repo-pilot-client/components/app/app-shell.tsx` - canonical shell/navigation layout.
- `repo-pilot-client/components/design-system/*` - usage examples and pattern demos.
- `repo-pilot-client/public/design-system.css` - static tokenized CSS reference.
- `repo-pilot-client/public/design-system.html` - static visual reference page.

---

If the UI evolves (new token families, status types, spacing scales, motion rules), this document should be updated in the same PR to keep implementation and design language aligned.
