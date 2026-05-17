## Contributing

### Before you ship

Run the same gates CI applies:

```bash
npm run verify
```

Prefer small, scoped PRs. When behavior changes materially, summarize **why**, **what touched**, and **how verified**—see checklist in [`blender-engineering-tasks.md`](blender-engineering-tasks.md) under “Explainability”.

### Branches / reviews

Use short-lived branches off `main` (unless your team adopts another default). Assign reviewers with domain familiarity (viewport/Three.js, UI/design system, infra).

Formatting is centralized through Prettier (see `.prettierrc.json`). If historical files drift, migrate them deliberately rather than mixing massive style-only churn with behavioral changes.
