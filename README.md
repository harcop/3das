# 3das

Collaborative groundwork for an in-browser Blender-class creative stack: **workflow shell + Three.js-powered viewport**. Long-form product/engineering specs live in [`blender.md`](./blender.md) and [`blender-engineering-tasks.md`](./blender-engineering-tasks.md).

## Prerequisites

- **Node.js** 20+ recommended (CI uses Node 22)
- **npm** (or another package manager compatible with lockfiles)

## Quick start

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Local Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production bundle |
| `npm run lint` | ESLint (warnings fail by default via `--max-warnings 0`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (`src/**/*.test.ts`) |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier CI check |
| `npm run verify` | Lint, typecheck, test, build (match CI gates) |

## Where code lives

- **Feature module:** `src/features/viewer/` — outliner/properties UI, loaders, viewport scene
- **App shell:** `src/app/` — Next layouts, globals, routing
- **Shared UI primitives:** `src/components/ui/` — shadcn-style building blocks (`components.json`)

See [`docs/architecture.md`](docs/architecture.md) for onboarding details.

## Contributing

Follow [`CONTRIBUTING.md`](CONTRIBUTING.md) for branching, CI expectations, and review notes.
