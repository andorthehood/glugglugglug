# Repository Guidelines

## Package Scope & Layout

- Parent-workspace path: `packages/editor/packages/editor-core/packages/web-ui/packages/glugglugglug`; source in `src/`, output in `dist/`.
- Published package and consumer import name: `glugglugglug`.
- Repository, submodule directory, and parent Nx project name: `glugglugglug`.

## Build, Test, and Development

- Run standalone package tasks with `npm run build|test|typecheck|lint`.
- Run visual regressions with `npm run test:screenshot`.
- Update intentional visual changes with `npm run test:screenshot:update`.
- The parent workspace may invoke the same scripts through the optional Nx `project.json` adapter.

## Coding Style

- Use TypeScript ES modules and keep the public renderer API browser-focused.
- Use Biome as the fixer; it owns formatting and import organization.
- Accept R8 masks and 1–256 straight-alpha RGBA8 palette entries. Prepare premultiplied float32 colors on upload
  and back the complete 4 KiB std140 palette block. Keep the 20-byte float32/uint16 instance contract.
- Restore the palette uniform buffer with the atlas after memory release. Reassert uniform-block mapping/buffer
  bindings and the two atlas sampler bindings after render hooks.
- Preserve the allocation-conscious, validation-free sprite hot path documented under `docs/adr/`.

## Testing

- Use Vitest for unit tests colocated with source files.
- Keep WebGL rendering coverage in the Playwright screenshot suite.
- Run build, typecheck, unit tests, and visual regressions after renderer or plugin changes.
