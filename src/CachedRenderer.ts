import { Renderer } from './renderer';

/**
 * CachedRenderer extends the base Renderer with integrated cache management
 * for improved performance when drawing complex or frequently-used content.
 */
export class CachedRenderer extends Renderer {
	private cacheMap: Map<string, WebGLTexture>;
	private cacheFramebuffers: Map<string, WebGLFramebuffer>;
	private cacheSizes: Map<string, { width: number; height: number }>;
	private cacheAccessOrder: string[]; // For LRU tracking
	private maxCacheItems: number;
	private currentCacheId: string | null = null;
	// Draw order segmentation: preserves relative order between sprite-sheet draws and cached quads
	private segments: Array<{ texture: WebGLTexture | 'SPRITESHEET'; alpha: number; start: number; end?: number }> = [];
	private currentSegmentTexture: WebGLTexture | 'SPRITESHEET' = 'SPRITESHEET';
	private currentSegmentAlpha = 1;

	// Dedicated CPU-side buffers for cache capture to avoid touching frame buffers
	private cacheVertexBuffer: Float32Array;
	private cacheTexcoordBuffer: Float32Array;

	constructor(canvas: HTMLCanvasElement, maxCacheItems: number = 50) {
		super(canvas);
		this.maxCacheItems = maxCacheItems;
		this.cacheMap = new Map();
		this.cacheFramebuffers = new Map();
		this.cacheSizes = new Map();
		this.cacheAccessOrder = [];

		// Allocate dedicated capture buffers matching current buffer size
		this.cacheVertexBuffer = new Float32Array(this.bufferSize);
		this.cacheTexcoordBuffer = new Float32Array(this.bufferSize);
	}

	/** Ensure dedicated capture buffers track size changes */
	override growBuffer(newSize: number): void {
		super.growBuffer(newSize);
		this.cacheVertexBuffer = new Float32Array(this.bufferSize);
		this.cacheTexcoordBuffer = new Float32Array(this.bufferSize);
	}

	/**
	 * Override drawing methods to respect cache state
	 */
	drawSpriteFromCoordinates(
		x: number,
		y: number,
		width: number,
		height: number,
		spriteX: number,
		spriteY: number,
		spriteWidth: number = width,
		spriteHeight: number = height
	): void {
		// Record that subsequent vertices belong to the sprite sheet segment (only during playback)
		if (this.currentCacheId === null) {
			this.ensureSegment('SPRITESHEET', 1);
		}
		super.drawSpriteFromCoordinates(x, y, width, height, spriteX, spriteY, spriteWidth, spriteHeight);
	}

	drawLineFromCoordinates(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		spriteX: number,
		spriteY: number,
		spriteWidth: number,
		spriteHeight: number,
		thickness: number
	): void {
		if (this.currentCacheId === null) {
			this.ensureSegment('SPRITESHEET', 1);
		}
		super.drawLineFromCoordinates(x1, y1, x2, y2, spriteX, spriteY, spriteWidth, spriteHeight, thickness);
	}

	/**
	 * Cache a drawing block or draw an existing cached texture.
	 * Returns true if a new cache was created (callback executed), false if reused.
	 */
	cacheGroup(cacheId: string, width: number, height: number, draw: () => void): boolean {
		const gl = this.gl;

		if (this.currentCacheId !== null) {
			throw new Error('Cannot start cache group: already in a cache group');
		}

		// If cache exists, draw it and return false
		const existing = this.getCachedData(cacheId);
		if (existing) {
			this.drawCachedTexture(existing.texture, existing.width, existing.height, 0, 0);
			return false;
		}

		// Important: do NOT flush the current frame's buffers to the canvas here.
		// That would render mid-frame to the default framebuffer and also drop
		// any already-batched geometry (including cached quads), causing visible
		// blinking. Instead, temporarily swap CPU-side buffers so cache capture
		// uses its own scratch buffers without disturbing the current frame.

		// Save current CPU-side buffers and counters
		const savedVertexBuffer = this.vertexBuffer;
		const savedTexcoordBuffer = this.textureCoordinateBuffer;
		const savedBufferPointer = this.bufferPointer;
		const savedBufferCounter = this.bufferCounter;

		// Switch to dedicated capture buffers for cache rendering
		this.vertexBuffer = this.cacheVertexBuffer;
		this.textureCoordinateBuffer = this.cacheTexcoordBuffer;
		this.bufferPointer = 0;
		this.bufferCounter = 0;

		// Create new cache entry
		const cacheTexture = this.createCacheTexture(width, height);
		const cacheFramebuffer = this.createCacheFramebuffer(cacheTexture);

		// Store cache data and mark as most recently used
		this.cacheMap.set(cacheId, cacheTexture);
		this.cacheFramebuffers.set(cacheId, cacheFramebuffer);
		this.cacheSizes.set(cacheId, { width, height });
		this.cacheAccessOrder.push(cacheId);

		// Set current cache state
		this.currentCacheId = cacheId;

		// Switch to rendering to cache framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, cacheFramebuffer);
		gl.viewport(0, 0, width, height);

		// Update resolution uniform to match cache target
		this.setUniform('u_resolution', width, height);

		// Make sure sprite sheet is bound for rendering to cache
		if (this.spriteSheet) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.spriteSheet);
		}

		// Clear to transparent so cached areas don't draw opaque rects
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// Evict old cache entries if necessary
		this.evictOldCacheEntries();

		// Execute drawing callback to populate cache
		try {
			draw();
		} finally {
			// Render any buffered content to the cache (using the temporary buffers)
			if (this.bufferCounter > 0) {
				super.renderVertexBuffer();
				super.resetBuffers();
			}

			// Switch back to default framebuffer (canvas)
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

			// Restore resolution uniform for canvas rendering
			this.setUniform('u_resolution', gl.canvas.width, gl.canvas.height);

			// Restore original clear color
			gl.clearColor(0, 0, 0, 1.0);

			// Rebind sprite sheet for main rendering
			if (this.spriteSheet) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, this.spriteSheet);
			}

			// Restore original CPU-side buffers and counters
			this.vertexBuffer = savedVertexBuffer;
			this.textureCoordinateBuffer = savedTexcoordBuffer;
			this.bufferPointer = savedBufferPointer;
			this.bufferCounter = savedBufferCounter;

			// Clear current cache state
			this.currentCacheId = null;
		}

		return true;
	}

	/**
	 * Clear a specific cache entry
	 * @param cacheId - ID of the cache to clear
	 */
	clearCache(cacheId: string): void {
		const gl = this.gl;
		const cacheMap = this.cacheMap;
		const cacheFramebuffers = this.cacheFramebuffers;
		const cacheAccessOrder = this.cacheAccessOrder;

		// Clean up WebGL resources
		const texture = cacheMap.get(cacheId);
		const framebuffer = cacheFramebuffers.get(cacheId);

		if (texture) {
			gl.deleteTexture(texture);
		}
		if (framebuffer) {
			gl.deleteFramebuffer(framebuffer);
		}

		// Remove from all tracking structures
		cacheMap.delete(cacheId);
		cacheFramebuffers.delete(cacheId);
		this.cacheSizes.delete(cacheId);

		const index = cacheAccessOrder.indexOf(cacheId);
		if (index > -1) {
			cacheAccessOrder.splice(index, 1);
		}
	}

	/**
	 * Draw a cached texture to the screen
	 * @param texture - WebGL texture to draw
	 * @param width - Width to draw the texture
	 * @param height - Height to draw the texture
	 * @param x - X position to draw at (default 0)
	 * @param y - Y position to draw at (default 0)
	 */
	drawCachedTexture(texture: WebGLTexture, width: number, height: number, x: number = 0, y: number = 0, alpha: number = 1): void {
		// Never draw cached content while capturing a cache
		if (this.currentCacheId !== null) return;

		// Ensure a segment for this cached texture
		this.ensureSegment(texture, alpha);

		// Auto-flush buffer if full (unlikely here, but safe)
		if (this.bufferCounter + 12 > this.bufferSize) {
			super.renderVertexBuffer();
			this.resetBuffers();
			this.ensureSegment(texture, alpha);
		}

		// Append one textured quad
		const off = this.bufferPointer;
		const vertexBuffer = this.vertexBuffer;
		const textureCoordinateBuffer = this.textureCoordinateBuffer;
		const x1 = x,
			x2 = x + width,
			y1 = y,
			y2 = y + height;
		// positions
		vertexBuffer[off] = x1;
		vertexBuffer[off + 1] = y1;
		vertexBuffer[off + 2] = x2;
		vertexBuffer[off + 3] = y1;
		vertexBuffer[off + 4] = x1;
		vertexBuffer[off + 5] = y2;
		vertexBuffer[off + 6] = x1;
		vertexBuffer[off + 7] = y2;
		vertexBuffer[off + 8] = x2;
		vertexBuffer[off + 9] = y1;
		vertexBuffer[off + 10] = x2;
		vertexBuffer[off + 11] = y2;
		// UVs: flip V only to compensate FBO orientation
		textureCoordinateBuffer[off] = 0;
		textureCoordinateBuffer[off + 1] = 1;
		textureCoordinateBuffer[off + 2] = 1;
		textureCoordinateBuffer[off + 3] = 1;
		textureCoordinateBuffer[off + 4] = 0;
		textureCoordinateBuffer[off + 5] = 0;
		textureCoordinateBuffer[off + 6] = 0;
		textureCoordinateBuffer[off + 7] = 0;
		textureCoordinateBuffer[off + 8] = 1;
		textureCoordinateBuffer[off + 9] = 1;
		textureCoordinateBuffer[off + 10] = 1;
		textureCoordinateBuffer[off + 11] = 0;

		this.bufferCounter += 12;
		this.bufferPointer = this.bufferCounter;
	}

	/**
	 * Render buffer content using whatever texture is currently bound to TEXTURE0.
	 * This avoids the base class behavior of rebinding the sprite sheet.
	 */
	private renderVertexBufferWithCurrentTexture(): void {
		const gl = this.gl;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glTextureCoordinateBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.textureCoordinateBuffer, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertexBuffer, gl.STATIC_DRAW);

		gl.drawArrays(gl.TRIANGLES, 0, Math.min(this.bufferCounter / 2, this.bufferSize / 2));

		if (this.isPerformanceMeasurementMode) {
			gl.finish();
		}
	}

	/** Render the frame to the off-screen texture, honoring draw order via segments */
	renderWithPostProcessing(elapsedTime: number): void {
		const gl = this.gl;
		const segments = this.segments;

		// Close the current segment if needed
		if (this.currentCacheId === null && segments.length > 0 && segments[segments.length - 1].end === undefined) {
			segments[segments.length - 1].end = this.bufferCounter / 2;
		}

		this.startRenderToTexture();

		// Render background effect before sprites
		const renderedBackground = this.backgroundEffectManager.render(
			elapsedTime,
			this.renderTextureWidth,
			this.renderTextureHeight,
		);
		if (renderedBackground) {
			this.restoreSpriteState();
		}

		// Upload buffers once
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glTextureCoordinateBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.textureCoordinateBuffer, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertexBuffer, gl.STATIC_DRAW);

		const textureLocation = gl.getUniformLocation(this.program, 'u_texture');
		if (textureLocation) {
			// @ts-ignore
			gl.uniform1i(textureLocation, 0);
		}

		if (this.currentCacheId === null && segments.length > 0) {
			for (const seg of segments) {
				const start = seg.start;
				const end = seg.end ?? this.bufferCounter / 2;
				const count = end - start;
				if (count <= 0) continue;
				gl.activeTexture(gl.TEXTURE0);
				this.setAlpha(seg.alpha);
				if (seg.texture === 'SPRITESHEET') {
					if (this.spriteSheet) gl.bindTexture(gl.TEXTURE_2D, this.spriteSheet);
				} else {
					gl.bindTexture(gl.TEXTURE_2D, seg.texture);
				}
				gl.drawArrays(gl.TRIANGLES, start, count);
			}
			this.setAlpha(1);
		} else {
			// Fallback for capture mode
			super.renderVertexBuffer();
		}

		this.endRenderToTexture();
		gl.flush();
		gl.bindTexture(gl.TEXTURE_2D, null);
		this.renderPostProcess(elapsedTime);

		// Reset segments for next frame, keep counters for stats
		segments.length = 0;
		this.currentSegmentTexture = 'SPRITESHEET';
		this.currentSegmentAlpha = 1;
	}

	private ensureSegment(texture: WebGLTexture | 'SPRITESHEET', alpha: number): void {
		if (this.currentCacheId !== null) return; // don't record during capture
		const currentVertexIndex = this.bufferCounter / 2;
		if (this.segments.length === 0) {
			// First segment of the frame
			this.segments.push({ texture, alpha, start: currentVertexIndex });
			this.currentSegmentTexture = texture;
			this.currentSegmentAlpha = alpha;
			return;
		}
		if (this.currentSegmentTexture !== texture || this.currentSegmentAlpha !== alpha) {
			// Close previous segment, if open
			if (this.segments[this.segments.length - 1].end === undefined) {
				this.segments[this.segments.length - 1].end = currentVertexIndex;
			}
			// Start new segment at current vertex index
			this.segments.push({ texture, alpha, start: currentVertexIndex });
			this.currentSegmentTexture = texture;
			this.currentSegmentAlpha = alpha;
		}
	}

	/**
	 * Check if a cache entry exists
	 * @param cacheId - ID to check
	 */
	hasCachedContent(cacheId: string): boolean {
		return this.cacheMap.has(cacheId);
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { itemCount: number; maxItems: number; accessOrder: string[] } {
		return {
			itemCount: this.cacheMap.size,
			maxItems: this.maxCacheItems,
			accessOrder: [...this.cacheAccessOrder], // Return copy
		};
	}

	/**
	 * Get cached texture and size data for a specific cache ID
	 * @param cacheId - ID of the cache to get
	 * @returns Cache data or null if not found
	 */
	getCachedData(cacheId: string): { texture: WebGLTexture; width: number; height: number } | null {
		const texture = this.cacheMap.get(cacheId);
		const size = this.cacheSizes.get(cacheId);

		if (texture && size) {
			// Update access order for LRU
			this.updateAccessOrder(cacheId);
			return {
				texture,
				width: size.width,
				height: size.height,
			};
		}

		return null;
	}

	/**
	 * Clear all cache entries
	 */
	clearAllCache(): void {
		const gl = this.gl;

		// Clean up all WebGL resources
		for (const texture of this.cacheMap.values()) {
			gl.deleteTexture(texture);
		}
		for (const framebuffer of this.cacheFramebuffers.values()) {
			gl.deleteFramebuffer(framebuffer);
		}

		// Clear all tracking structures
		this.cacheMap.clear();
		this.cacheFramebuffers.clear();
		this.cacheSizes.clear();
		this.cacheAccessOrder.length = 0;
	}

	/**
	 * Create a texture for caching
	 */
	private createCacheTexture(width: number, height: number): WebGLTexture {
		const gl = this.gl;
		const texture = gl.createTexture();
		if (!texture) {
			throw new Error('Failed to create cache texture');
		}

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA8,
			width,
			height,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		return texture;
	}

	/**
	 * Create a framebuffer for caching
	 */
	private createCacheFramebuffer(texture: WebGLTexture): WebGLFramebuffer {
		const gl = this.gl;
		const framebuffer = gl.createFramebuffer();
		if (!framebuffer) {
			throw new Error('Failed to create cache framebuffer');
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

		// Check framebuffer completeness
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			gl.deleteFramebuffer(framebuffer);
			throw new Error('Cache framebuffer not complete');
		}

		return framebuffer;
	}

	/**
	 * Update access order for LRU tracking
	 */
	private updateAccessOrder(cacheId: string): void {
		const index = this.cacheAccessOrder.indexOf(cacheId);
		if (index > -1) {
			// Move to end (most recently used)
			this.cacheAccessOrder.splice(index, 1);
			this.cacheAccessOrder.push(cacheId);
		}
	}

	/**
	 * Evict old cache entries using LRU strategy
	 */
	private evictOldCacheEntries(): void {
		while (this.cacheMap.size > this.maxCacheItems) {
			const oldestCacheId = this.cacheAccessOrder.shift();
			if (oldestCacheId) {
				this.clearCache(oldestCacheId);
			}
		}
	}
}
