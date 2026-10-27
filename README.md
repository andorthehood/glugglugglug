# glugglugglug

`glugglugglug` is a small immediate-mode WebGL2 sprite renderer. It keeps an R8 coverage-mask atlas and a premultiplied float32 color palette in a GPU uniform buffer and uploads one compact, ordered instance list per frame.

```ts
import { Engine, type SpriteLookup } from 'glugglugglug';

const engine = new Engine(canvas);
const lookup: SpriteLookup = {
	player: { x: 0, y: 0, spriteWidth: 16, spriteHeight: 16 },
};

// One byte of coverage per texel: 0 is uncovered, 255 is fully covered.
const atlas = engine.setSpriteAtlas({ width: 16, height: 16, data: new Uint8Array(256).fill(255) }, lookup);
// Straight-alpha RGBA8 entries; colors are addressed by their numeric array index.
engine.setPalette(new Uint8Array([255,255,255,255, 255,0,0,128]));
const player = atlas.resolveSprite('player');
engine.render(() => {
	engine.drawSprite(10, 20, player, 0);
	engine.drawSprite(40, 20, player, 1, 32, 32);
});
```

Each sprite instance occupies 20 bytes: four float32 values (`x`, `y`, `width`, `height`), one uint16 sprite ID, and one uint16 palette index. Calls are drawn in append order with premultiplied-alpha blending. `renderFrame()` is available for one synchronous frame, `resize()` explicitly changes the canvas drawing buffer, and `destroy()` stops the render loop and releases owned WebGL resources.

`setSpriteAtlas()` validates and uploads the atlas, then returns its resolver. Resolve public string or numeric lookup keys
once while installing application sprite tables and retain the resulting `SpriteId` values for drawing. Replacing the
atlas invalidates ids from the previous resolver; rebuild application lookup tables from the new resolver before the next
frame. Arbitrary numeric lookup keys are not dense ids and must also be resolved.

The atlas descriptor contains tightly packed, top-to-bottom `Uint8Array` coverage bytes, one per texel. The GPU samples
its red channel. `setPalette()` accepts 1–256 straight-alpha RGBA8 entries. On each changed upload, the renderer
normalizes those bytes and premultiplies RGB by alpha on the CPU. The vertex shader indexes a `std140` uniform block;
the fragment shader multiplies that prepared color by coverage. All colors share the same sprite batch.

The GPU palette always occupies 4 KiB: 256 float32 `vec4` slots, with unused slots cleared. A 189-entry palette uses
3,024 bytes of those slots and supplies 756 input bytes; the byte input format does not describe the GPU allocation.

`setPalette(bytes)` replaces only color storage and skips identical updates. It can be called between frames without
reinstalling the atlas or resolving sprite IDs again. Both resource setters retain private copies of their byte arrays.
Atlas IDs and instance palette fields retain their 16-bit representation; active palette indices must address one of
the supplied 1–256 colors. Atlas and rectangle textures must fit the device's texture limits. Invalid
per-draw IDs and indices are programmer errors and are not validated in the hot path.

`releaseRenderingMemory()` releases the atlas, rectangle table, palette, and GPU instance storage. Resource setters
can update retained data while released; `restoreRenderingMemory()` uploads the latest data. `destroy()` deletes all
owned resources. Atlas uploads establish pixel-unpack state. After trusted render hooks, the sprite pass restores the
mask and rectangle texture/sampler bindings plus the palette uniform-block mapping and buffer binding at point 0.

The drawing surface preserves transparent pixels so the WebGL output can composite over the canvas element's CSS
background.

`drawSprite()` and per-frame rendering are unchecked hot paths. Atlas validity and public-key resolution are checked
outside the render loop, but sprite lifecycle, dense-id, numeric-value, and per-frame destruction validation is
intentionally omitted. Callers must use ids from the active atlas, finite rectangle values, and must not render after
destroying the engine.
Violations are programmer errors with unspecified consequences.

See [ADR-001: Do Not Validate Programmer Input in Render Hot Paths](docs/adr/001-no-programmer-input-validation-in-the-sprite-hot-path.md) for the decision and its consequences.

The core engine intentionally has no caching, lines, text layout, post-processing, or general primitive API.

## Frame statistics

`engine.frameStats` is one stable, allocation-free view updated after every completed sprite pass. It reports
the number of submitted sprite rectangles and the used instance-buffer bytes sent to the GPU:

```ts
engine.renderFrame(drawScene);

console.log(engine.frameStats.spriteCount);
console.log(engine.frameStats.uploadedInstanceBytes);
```

The values describe only the core sprite pass; plugin uploads and draw calls are intentionally independent. During
sprite submission the view still describes the previous completed pass. `postDraw` hooks observe the current pass.

## Render-hook plugins

The engine exposes its exact `WebGL2RenderingContext` as `engine.gl` and two ordered mutable hook arrays. `preDraw` hooks
run after the frame clear and before the application callback; `postDraw` hooks run after the sprite pass, including on
frames with no sprites. This deliberately small plugin surface supports arbitrary underlays and overlays without adding
checks to `drawSprite()`.

```ts
engine.hooks.preDraw.push(gl => {
	background.draw(gl);
});

engine.hooks.postDraw.push(gl => {
	diagnostics.draw(gl);
});
```

Hooks are trusted code sharing unrestricted context state. The engine defensively restores the state needed by its next
clear and sprite pass, but this is not a sandbox: hooks can still clear the canvas, lose the context, or deliberately
discover and destroy engine resources. Hook errors propagate, hook arrays run in insertion order, and mutating an array
while it is being iterated is a programmer error with unspecified consequences. Plugins own and must delete every GPU
resource they create.

The engine does not bundle concrete rendering plugins. Consumers own their hook implementations and lifecycle;
the 8f4e editor keeps its background, line, and RGBA texture plugins in web-ui.

## Optional drawing utilities

`glugglugglug/utils` provides a CPU-only `DrawContext` for nested coordinate offsets. It wraps the structural
`SpriteTarget` interface, so an `Engine`, a test recorder, or another numeric destination can receive the final sprite
submissions without importing utility code into the core renderer.

```ts
import { Engine } from 'glugglugglug';
import { DrawContext } from 'glugglugglug/utils';

const engine = new Engine(canvas);
const draw = new DrawContext(engine);
engine.setPalette(new Uint8Array([255,255,255,255]));
const atlas = engine.setSpriteAtlas(mask, lookup);
const panelSpriteId = atlas.resolveSprite('panel');

engine.renderFrame(() => {
	draw.startGroup(panel.x, panel.y);
	draw.drawSprite(0, 0, panelSpriteId, 0, panel.width, panel.height);
	draw.endGroup();
});
```

One context can be reused across frames. Every `startGroup()` call must have a matching `endGroup()` call. Text, fonts,
fallback glyphs, and space handling belong to higher-level application utilities. The context owns neither its target nor
the atlas, render loop, or caches.

## Development

The package owns its TypeScript, Vitest, Playwright, and Biome configuration and can be developed without the 8f4e
workspace:

```sh
npm ci
npm run build
npm test
npm run typecheck
```

`npm pack` builds and packages only `dist/`, together with the package metadata and README. The repository's
`project.json` is an optional adapter for consuming the same npm scripts from the parent Nx workspace.

## Publishing

The unscoped package is configured for public npm access. Authenticate with npm, inspect the exact archive, and then
publish from a clean `main` checkout:

```sh
npm login
npm publish --dry-run
npm publish
```

`npm publish` runs formatting checks, typechecking, all unit tests, and a fresh production build before uploading.
Publishing requires a version that does not already exist in the npm registry.

## Visual regression tests

The Chromium snapshot covers atlas selection, default and explicit sizing, positioning, insertion-order layering,
alpha blending, instance-buffer growth, clearing between frames, RGBA underlays, and the line overlay.

```sh
npm run test:screenshot
npm run test:screenshot:update
```
