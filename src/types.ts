export type SpriteCoordinates = {
	spriteWidth: number;
	spriteHeight: number;
	x: number;
	y: number;
};

export type SpriteLookup = Record<string | number, SpriteCoordinates>;

export type EngineOptions = {
	/** Enable caching functionality. Defaults to false. */
	caching?: boolean;
	/** Maximum number of cache items when caching is enabled. Defaults to 50. */
	maxCacheItems?: number;
};

export type Rgba8TextureFilter = 'nearest' | 'linear';

export type Rgba8TextureData = Uint8Array | Uint8ClampedArray;

export type Rgba8Texture = {
	texture: WebGLTexture;
	width: number;
	height: number;
	filter: Rgba8TextureFilter;
};

export type UploadRgba8TextureOptions = {
	texture?: Rgba8Texture;
	filter?: Rgba8TextureFilter;
};
