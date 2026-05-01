// Export types
export type { SpriteCoordinates, SpriteLookup, EngineOptions } from './types';
export type { PostProcessEffect } from './types/postProcess';
export type { BackgroundEffect } from './types/background';

// Export main Engine class (public API)
export { Engine } from './engine';

// Export Renderer for advanced users who want low-level access
export { Renderer } from './renderer';

// Export cached renderer for advanced users
export { CachedRenderer } from './CachedRenderer';

// Export post-processing system
export { PostProcessManager } from './postProcess/PostProcessManager';
