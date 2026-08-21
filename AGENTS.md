# Repository Guidelines

## Package Scope & Layout

- Parent-workspace path: `packages/editor/packages/glugglug`; source in `src/`, output in `dist/`.
- Package and Nx project name: `glugglug`.
- The package is maintained in the `glugglug` Git submodule even though consumers import `glugglug`.

## Build, Test, and Development

- Run standalone package tasks with `npm run build|test|typecheck|lint`.
- Run visual regressions with `npm run test:screenshot`.
- Update intentional visual changes with `npm run test:screenshot:update`.
- The parent workspace may invoke the same scripts through the optional Nx `project.json` adapter.

## Coding Style

- Use TypeScript ES modules and keep the public renderer API browser-focused.
- Use Biome as the fixer; it owns formatting and import organization.
- Preserve the allocation-conscious, validation-free sprite hot path documented under `docs/adr/`.

## Testing

- Use Vitest for unit tests colocated with source files.
- Keep WebGL rendering coverage in the Playwright screenshot suite.
- Run build, typecheck, unit tests, and visual regressions after renderer or plugin changes.
