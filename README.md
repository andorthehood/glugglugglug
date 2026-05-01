# 2D Engine

A minimal WebGL2-based 2D rendering engine designed specifically for sprite sheet rendering.
Requires WebGL2 and GLSL ES 3.00 shaders (`#version 300 es`).

## Philosophy

This engine was built as a WebGL learning exercise with a focus on minimalism over feature completeness. The goal was to create a no-bloat rendering engine that does one thing well: efficiently rendering sprites from a sprite sheet.

**Core principles:**
- **Minimal feature set** - Only essential sprite rendering functionality
- **Performance over safety** - Optimized for speed with minimal error checking
- **Educational focus** - Clean, readable WebGL code for learning purposes
- **No dependencies** - Pure WebGL implementation without external libraries
- **Retro aesthetic** - Designed specifically for pixel-perfect, anti-aliasing-free rendering

## Features

- **Sprite-only rendering** - Optimized for rendering sprites from a single sprite sheet
- **WebGL2 backend** - Hardware-accelerated rendering with custom shaders
- **Batched rendering** - Efficient buffer management for high performance
- **Pixel-perfect rendering** - No anti-aliasing, nearest-neighbor filtering for retro pixelated look
- **Post-processing effects** - Flexible shader-based effects system with built-in time, resolution, and render texture uniforms
- **Performance monitoring** - Built-in FPS and render time tracking
- **Optional caching** - Cache frequently reused draw blocks to offload per-frame work

## Quick Start

### Basic Usage (No Caching)

```typescript
import { Engine, SpriteLookup } from 'glugglug';

// Initialize engine without caching
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const engine = new Engine(canvas);

// Load sprite sheet
const spriteSheet = new Image();
spriteSheet.onload = () => {
  engine.loadSpriteSheet(spriteSheet);
  
  // Define sprite locations
  const sprites: SpriteLookup = {
    'player': { x: 0, y: 0, spriteWidth: 32, spriteHeight: 32 },
    'enemy': { x: 32, y: 0, spriteWidth: 32, spriteHeight: 32 }
  };
  engine.setSpriteLookup(sprites);
  
  // Start rendering
  engine.render((timeToRender, fps, triangles, maxTriangles) => {
    engine.drawSprite(100, 100, 'player');
    engine.drawSprite(200, 150, 'enemy');
  });
};
spriteSheet.src = 'spritesheet.png';
```

### With Caching (Recommended for Complex Scenes)

```typescript
import { Engine, SpriteLookup, EngineOptions } from 'glugglug';

// Initialize engine with caching enabled
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const options: EngineOptions = { 
  caching: true, 
  maxCacheItems: 100 // Optional: defaults to 50
};
const engine = new Engine(canvas, options);

// Same setup as above...
engine.loadSpriteSheet(spriteSheet);
engine.setSpriteLookup(sprites);

// Render with caching for complex UI elements
engine.render((timeToRender, fps, triangles, maxTriangles) => {
  // Cache a complex UI panel that doesn't change often
  engine.cacheGroup('ui-panel', 200, 100, () => {
    engine.drawSprite(10, 10, 'button');
    engine.drawSprite(60, 10, 'button');
    engine.drawText(20, 50, 'Menu');
  }, true, 0.85); // Draws cached version on subsequent frames with replay alpha
  
  // Draw dynamic content normally
  engine.drawSprite(player.x, player.y, 'player');
});
```

## Constructor Options

The unified `Engine` constructor accepts optional configuration:

```typescript
interface EngineOptions {
  /** Enable caching functionality. Defaults to false. */
  caching?: boolean;
  /** Maximum number of cache items when caching is enabled. Defaults to 50. */
  maxCacheItems?: number;
}

// Examples:
const basicEngine = new Engine(canvas);                              // No caching
const fastEngine = new Engine(canvas, { caching: false });          // Explicit no caching  
const cachedEngine = new Engine(canvas, { caching: true });         // Caching with default limit
const customEngine = new Engine(canvas, { caching: true, maxCacheItems: 200 }); // Custom limit
```

## How It Renders

The engine renders in two phases each frame:

1) Batch sprites into CPU buffers
- The `Renderer` accumulates vertices into two `Float32Array` buffers: positions and UVs.
- Calls like `drawSprite` and `drawLine` append 6 vertices (2 triangles) per quad.
- If buffers would overflow, they auto-flush (upload & draw) to avoid overflow.

2) Render-to-texture, then post-process to the canvas
- The batched geometry is rendered into an off-screen `renderTexture` attached to a framebuffer.
- A `PostProcessManager` then renders a full-screen quad to the canvas using the `renderTexture`, applying any enabled effects.
- Blending is enabled for sprite transparency; post-process temporarily disables it for the full-screen pass and restores it.

## Post-Processing Effects

The engine supports a single post-processing effect. Fragment shaders receive built-in `u_time`, `u_resolution`, and `u_renderTexture` uniforms. If `vertexShader` is omitted, glugglug uses its built-in full-screen quad vertex shader.

```typescript
import { PostProcessEffect } from 'glugglug';

const rippleEffect: PostProcessEffect = {
  fragmentShader: `#version 300 es
    precision mediump float;

    in vec2 v_screenCoord;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform sampler2D u_renderTexture;
    out vec4 outColor;

    void main() {
      vec2 uv = v_screenCoord;
      vec2 offset = uv - vec2(0.5);
      float dist = max(length(offset), 0.0001);
      float wave = sin(dist * 50.0 - u_time * 5.0);
      vec2 rippleUV = uv + (offset / dist) * wave * 0.0025;
      outColor = vec4(texture(u_renderTexture, rippleUV).rgb, 1.0);
    }
  `,
};

engine.setPostProcessEffect(rippleEffect);
engine.clearPostProcessEffect();
```

## Caching

For complex or frequently reused content (UI panels, static HUD layers, repeated composites), enable caching through the unified `Engine` constructor.

### How caching works

- Per-ID render targets: Each `cacheGroup(id, w, h, draw, enabled?, alpha?)` allocates a dedicated `WebGLTexture` + framebuffer sized to the group. The `draw` callback renders into that framebuffer instead of the main one.
- Dedicated capture buffers: Cache capture uses dedicated CPU-side buffers so it never interferes with the frame’s in-progress buffers (prevents mid-frame flicker/blink).
- Immediate first draw: When a cache is created, the engine draws that cache once in the same frame (at 0,0 by default) to avoid a first-frame blink. Reuse path also draws the cached texture.
- Draw-order segments: During playback, the renderer records segments separating sprite-sheet draws from cached-texture draws, rebinding textures only when necessary to preserve order while minimizing state changes.
- Replay alpha: `alpha` is applied only when the cached texture is replayed. It does not change the cached bitmap and does not require cache invalidation.
- LRU eviction: Cache entries are tracked with access order and evicted (texture + framebuffer are deleted) when exceeding `maxCacheItems`.

See examples in `packages/glugglug/examples/cache-usage.md`.

### Unified Engine API

```ts
import { Engine, EngineOptions } from 'glugglug';

// Enable caching when creating the engine
const options: EngineOptions = { caching: true, maxCacheItems: 50 };
const engine = new Engine(canvas, options);

// Create or reuse a cache; returns true if created this call
engine.cacheGroup('ui-panel', 200, 100, () => {
  engine.drawSprite(10, 10, 'button');
  engine.drawText(20, 60, 'Menu');
}, true, 0.75);

// Draw cached content at position, with optional replay alpha
engine.drawCachedContent('ui-panel', 20, 20, 0.75);

// Introspection and management
engine.hasCachedContent('ui-panel');
engine.clearCache('ui-panel');
engine.clearAllCache();
engine.getCacheStats(); // { itemCount, maxItems, accessOrder }

// Check if caching is enabled
engine.isCachingEnabled; // true
```

### Runtime Behavior

When caching is **disabled** (default):
- Caching methods behave gracefully without errors:
  - `cacheGroup()`: Executes draw function and returns `false`
  - `drawCachedContent()`: Exits silently (no-op)
  - `hasCachedContent()`: Returns `false`
  - `clearCache()` and `clearAllCache()`: Exit silently (no-op)
  - `getCacheStats()`: Returns `{ itemCount: 0, maxItems: 0, accessOrder: [] }`
- No performance overhead from caching infrastructure
- Uses standard `Renderer` for maximum performance

When caching is **enabled**:
- All caching methods are available and functional  
- Uses `CachedRenderer` with LRU eviction and draw-order segmentation
- Small overhead for cache management infrastructure

### Behavior details

- Coordinate system: Cache content is drawn in its own local (0,0)–(w,h) space during capture. When drawing cached content, you place that snapshot at any screen position.
- Resolution uniform: While capturing, `u_resolution` is set to the cache’s size; after capture it is restored to the canvas size.
- No mid-frame canvas draws: Cache capture never flushes the current frame to the canvas; it binds the cache framebuffer first and uses dedicated buffers.
- First-use parity: Creating a cache also schedules a quad to draw that cached texture in the same frame to match the reuse path.
- Replay-only alpha: `alpha` affects only the cached quad draw. It is not part of the cache key and changing it does not recreate the cache.

### Best practices

- Good candidates: Static UI pieces, repeated composites, particle systems updated less frequently than per-frame, level backgrounds.
- Avoid caching: Single sprites, content that changes every frame, very large caches (mind GPU memory and max texture size).
- Sizing: Keep caches tight to content; oversized caches waste memory. Consider grouping related UI into a single cache.
- Limits: Tune `maxCacheItems` to your scene; monitor with `getCacheStats()`.

### Future optimization: atlas caching

Today, each cache ID has its own texture+framebuffer. A potential future optimization is to render all cache snapshots into a single (or few) large atlas texture(s) and store per-cache UV rectangles. Benefits: fewer texture binds and GL objects. Considerations: rectangle packing, gutters to avoid bleeding, scissor clears, and fragmentation management.

## API Reference

### Engine Class

#### Constructor
```typescript
new Engine(canvas: HTMLCanvasElement)
```

#### Sprite Methods
```typescript
// Draw sprite by lookup key
drawSprite(x: number, y: number, sprite: string | number, width?: number, height?: number): void

// Draw sprite by coordinates
drawSpriteFromCoordinates(x: number, y: number, width: number, height: number, 
                         spriteX: number, spriteY: number, spriteWidth?: number, spriteHeight?: number): void

// Load sprite sheet texture
loadSpriteSheet(image: HTMLImageElement | HTMLCanvasElement | OffscreenCanvas): void

// Set sprite lookup table
setSpriteLookup(spriteLookup: SpriteLookup): void
```

#### Drawing Methods
```typescript
// Draw line with thickness (uses geometric calculation, not rectangular sprites)
drawLine(x1: number, y1: number, x2: number, y2: number, sprite: string | number, thickness: number): void

// Draw text using sprite font
drawText(x: number, y: number, text: string, sprites?: Array<SpriteLookup | undefined>): void
```

#### Transform Groups
```typescript
// Start transform group with offset
startGroup(x: number, y: number): void

// End current transform group
endGroup(): void
```

#### Utility Methods
```typescript
// Start render loop
render(callback: (timeToRender: number, fps: number, triangles: number, maxTriangles: number) => void): void

// Resize canvas
resize(width: number, height: number): void

// Set shader uniform
setUniform(name: string, ...values: number[]): void
```

#### Post-Processing Effects
```typescript
// Set the active post-process effect (replaces any previous)
setPostProcessEffect(effect: PostProcessEffect): void

// Clear the active post-process effect
clearPostProcessEffect(): void

```

### Types

```typescript
type SpriteCoordinates = {
  spriteWidth: number;
  spriteHeight: number;
  x: number;
  y: number;
};

type SpriteLookup = Record<string | number, SpriteCoordinates>;

type PostProcessEffect = {
  vertexShader?: string; // defaults to built-in fullscreen quad shader when omitted
  fragmentShader: string;
};
```

## Performance

- **Buffer size**: Configurable (default: 20,000 triangles)
- **Rendering**: Batched triangles with single draw call
- **Memory**: Pre-allocated Float32Array buffers
- **Blending**: Premultiplied alpha for proper transparency
- **Anti-aliasing**: Disabled on WebGL context and textures for retro pixel art

## Architecture Notes

- **Performance-first**: Optimized for speed over safety - minimal error checking and validation
- **Rectangular rendering**: All drawing uses rectangular sprites except `drawLine()`
- **Line geometry**: Lines use trigonometric calculation to create thick lines with proper angles
- **Pixel-perfect**: Even geometric lines maintain pixelated appearance due to disabled anti-aliasing
- **Auto-flush rendering**: Buffer automatically flushes and renders when full to prevent overflow

## Limitations

- Single sprite sheet only
- No rotation or scaling transforms (use groups for positioning)
- WebGL2 context required
- No built-in animation system

## License

MIT
