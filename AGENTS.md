# Repository Guidelines

## Package Scope & Layout
- Path: `packages/glugglug`; source in `src/`, output in `dist/` (ES modules).
- Consumed via workspace alias `glugglug` after build.

## Build, Test, Dev
- From root: `npx nx run glugglug:build|test|typecheck`.
- From package: use Nx commands (`npx nx run glugglug:build`, `npx nx run glugglug:test`, `npx nx run glugglug:typecheck`), or legacy `npm run` scripts (build, test, typecheck).
- Output: `dist/` artifacts referenced by Vite aliases in the root app.

## Coding Style
- TypeScript, strict mode. ESLint + `@typescript-eslint` with `import/order`.
- Use ESLint as the fixer (`npx eslint --fix <files>`); it owns formatting rules such as tabs, single quotes, semicolons, width 120, and trailing commas.
- Prefer alias imports `@8f4e/<pkg>` for workspace modules.

## Testing
- Jest with `@swc/jest`. Test files under `**/__tests__/**` or `*.test.ts`.
- Keep tests fast and unit-scoped; no browser required.

## Commits & PRs
- Commits: imperative, scoped (e.g., `glugglug: add sprite util`).
- PRs: include summary, rationale, and test notes; link issues.
