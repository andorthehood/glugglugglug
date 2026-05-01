import { Engine } from '../src/engine';
import { Renderer } from '../src/renderer';

// Mock canvas and WebGL context
const mockCanvas = {
	width: 800,
	height: 600,
	getContext: jest.fn(),
} as unknown as HTMLCanvasElement;

const mockTexture = {} as WebGLTexture;
const mockFramebuffer = {} as WebGLFramebuffer;

const mockGL = {
	// Constants
	RGBA: 6408,
	UNSIGNED_BYTE: 5121,
	TEXTURE_2D: 3553,
	LINEAR: 9729,
	CLAMP_TO_EDGE: 33071,
	TEXTURE_MIN_FILTER: 10241,
	TEXTURE_MAG_FILTER: 10240,
	TEXTURE_WRAP_S: 10242,
	TEXTURE_WRAP_T: 10243,
	FRAMEBUFFER: 36160,
	COLOR_ATTACHMENT0: 36064,
	FRAMEBUFFER_COMPLETE: 36053,
	COLOR_BUFFER_BIT: 16384,
	TEXTURE0: 33984,
	ARRAY_BUFFER: 34962,
	FLOAT: 5126,
	STATIC_DRAW: 35044,
	TRIANGLES: 4,
	SRC_ALPHA: 770,
	ONE_MINUS_SRC_ALPHA: 771,
	BLEND: 3042,
	FRAGMENT_SHADER: 35632,
	VERTEX_SHADER: 35633,

	// Methods
	createTexture: jest.fn(() => mockTexture),
	bindTexture: jest.fn(),
	texImage2D: jest.fn(),
	texParameteri: jest.fn(),
	createFramebuffer: jest.fn(() => mockFramebuffer),
	bindFramebuffer: jest.fn(),
	framebufferTexture2D: jest.fn(),
	checkFramebufferStatus: jest.fn(() => 36053),
	deleteTexture: jest.fn(),
	deleteFramebuffer: jest.fn(),
	viewport: jest.fn(),
	clear: jest.fn(),
	activeTexture: jest.fn(),

	// Base engine/renderer mocks
	canvas: mockCanvas,
	createShader: jest.fn(() => ({}) as WebGLShader),
	createProgram: jest.fn(() => ({}) as WebGLProgram),
	shaderSource: jest.fn(),
	compileShader: jest.fn(),
	getShaderParameter: jest.fn(() => true),
	attachShader: jest.fn(),
	linkProgram: jest.fn(),
	getProgramParameter: jest.fn(() => true),
	useProgram: jest.fn(),
	getAttribLocation: jest.fn(() => 0),
	getUniformLocation: jest.fn(() => ({}) as WebGLUniformLocation),
	createBuffer: jest.fn(() => ({}) as WebGLBuffer),
	clearColor: jest.fn(),
	vertexAttribPointer: jest.fn(),
	blendFunc: jest.fn(),
	enable: jest.fn(),
	enableVertexAttribArray: jest.fn(),
	bindBuffer: jest.fn(),
	bufferData: jest.fn(),
	drawArrays: jest.fn(),
	finish: jest.fn(),
	flush: jest.fn(),
	disable: jest.fn(),
	uniform1i: jest.fn(),
	uniform1f: jest.fn(),
	uniform2f: jest.fn(),
	uniform3f: jest.fn(),
	uniform4f: jest.fn(),
	deleteProgram: jest.fn(),
	deleteBuffer: jest.fn(),
	deleteShader: jest.fn(),
	isEnabled: jest.fn(() => true),
	TRIANGLE_STRIP: 5,
	RGBA8: 33506,
} as unknown as WebGL2RenderingContext;

// Mock the canvas context
(mockCanvas.getContext as jest.Mock).mockReturnValue(mockGL);

describe('Engine - Unified API', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Constructor Options', () => {
		test('should create engine without caching by default', () => {
			const engine = new Engine(mockCanvas);
			expect(engine.isCachingEnabled).toBe(false);
		});

		test('should create engine without caching when caching: false', () => {
			const engine = new Engine(mockCanvas, { caching: false });
			expect(engine.isCachingEnabled).toBe(false);
		});

		test('should create engine with caching when caching: true', () => {
			const engine = new Engine(mockCanvas, { caching: true });
			expect(engine.isCachingEnabled).toBe(true);
		});

		test('should create engine with custom maxCacheItems', () => {
			const engine = new Engine(mockCanvas, { caching: true, maxCacheItems: 100 });
			expect(engine.isCachingEnabled).toBe(true);
			expect(engine.getCacheStats().maxItems).toBe(100);
		});

		test('should default to 50 maxCacheItems when caching enabled', () => {
			const engine = new Engine(mockCanvas, { caching: true });
			expect(engine.getCacheStats().maxItems).toBe(50);
		});
	});

	describe('Backward Compatibility', () => {
		test('should maintain all base engine functionality without options', () => {
			const engine = new Engine(mockCanvas);

			// Test that base engine methods are available
			expect(typeof engine.drawSprite).toBe('function');
			expect(typeof engine.drawLine).toBe('function');
			expect(typeof engine.startGroup).toBe('function');
			expect(typeof engine.endGroup).toBe('function');
			expect(typeof engine.loadSpriteSheet).toBe('function');
			expect(typeof engine.setSpriteLookup).toBe('function');
		});

		test('should maintain all base engine functionality with caching disabled', () => {
			const engine = new Engine(mockCanvas, { caching: false });

			// Test that base engine methods are available
			expect(typeof engine.drawSprite).toBe('function');
			expect(typeof engine.drawLine).toBe('function');
			expect(typeof engine.startGroup).toBe('function');
			expect(typeof engine.endGroup).toBe('function');
		});
	});

	describe('Caching Methods - Disabled', () => {
		let engine: Engine;

		beforeEach(() => {
			engine = new Engine(mockCanvas); // No caching
		});

		test('should handle cacheGroup gracefully without caching enabled', () => {
			let callbackExecuted = false;
			const result = engine.cacheGroup('test', 100, 100, () => {
				callbackExecuted = true;
			});
			expect(callbackExecuted).toBe(true); // Draw callback should be executed
			expect(result).toBe(false); // Should return false indicating no cache was created
		});

		test('should handle drawCachedContent gracefully without caching enabled', () => {
			expect(() => {
				engine.drawCachedContent('test', 0, 0);
			}).not.toThrow(); // Should not throw an error
		});

		test('should return false when calling hasCachedContent without caching enabled', () => {
			const result = engine.hasCachedContent('test');
			expect(result).toBe(false);
		});

		test('should handle clearCache gracefully without caching enabled', () => {
			expect(() => {
				engine.clearCache('test');
			}).not.toThrow(); // Should not throw an error
		});

		test('should handle clearAllCache gracefully without caching enabled', () => {
			expect(() => {
				engine.clearAllCache();
			}).not.toThrow(); // Should not throw an error
		});

		test('should return empty stats when calling getCacheStats without caching enabled', () => {
			const stats = engine.getCacheStats();
			expect(stats).toEqual({ itemCount: 0, maxItems: 0, accessOrder: [] });
		});
	});

	describe('Caching Methods - Enabled', () => {
		let engine: Engine;

		beforeEach(() => {
			engine = new Engine(mockCanvas, { caching: true, maxCacheItems: 5 });
		});

		test('should provide caching functionality when enabled', () => {
			expect(engine.isCachingEnabled).toBe(true);
			expect(typeof engine.cacheGroup).toBe('function');
			expect(typeof engine.drawCachedContent).toBe('function');
			expect(typeof engine.hasCachedContent).toBe('function');
			expect(typeof engine.clearCache).toBe('function');
			expect(typeof engine.clearAllCache).toBe('function');
			expect(typeof engine.getCacheStats).toBe('function');
		});

		test('should manage cache group operations with offset handling', () => {
			// Set some initial offsets
			engine.startGroup(10, 20);
			expect(engine.offsetX).toBe(10);
			expect(engine.offsetY).toBe(20);

			let insideOffset: { x: number; y: number } | null = null;
			const created = engine.cacheGroup('test-cache', 100, 100, () => {
				insideOffset = { x: engine.offsetX, y: engine.offsetY };
			});

			expect(created).toBe(true);
			expect(insideOffset).toEqual({ x: 0, y: 0 });
			expect(engine.offsetX).toBe(10);
			expect(engine.offsetY).toBe(20);

			// Clean up
			engine.endGroup();
		});

		test('should not run draw callback when cache exists', () => {
			let ran = false;

			// First call creates cache and runs draw
			const first = engine.cacheGroup('existing-cache', 200, 150, () => {
				ran = true;
			});
			expect(first).toBe(true);
			expect(ran).toBe(true);

			ran = false;

			// Second call uses cache and skips draw
			const second = engine.cacheGroup('existing-cache', 200, 150, () => {
				ran = true;
			});
			expect(second).toBe(false);
			expect(ran).toBe(false);
		});

		test('should draw newly created cache content in the same call', () => {
			const drawCachedContentSpy = jest.spyOn(engine, 'drawCachedContent');

			const created = engine.cacheGroup('immediate-draw-cache', 200, 150, () => {});

			expect(created).toBe(true);
			expect(drawCachedContentSpy).toHaveBeenCalledWith('immediate-draw-cache', 0, 0, 1);
		});

		test('should forward alpha when drawing newly created cache content', () => {
			const drawCachedContentSpy = jest.spyOn(engine, 'drawCachedContent');

			const created = engine.cacheGroup('alpha-cache', 200, 150, () => {}, true, 0.4);

			expect(created).toBe(true);
			expect(drawCachedContentSpy).toHaveBeenCalledWith('alpha-cache', 0, 0, 0.4);
		});

		test('should forward alpha when reusing existing cache content', () => {
			engine.cacheGroup('alpha-cache', 200, 150, () => {});

			const drawCachedContentSpy = jest.spyOn(engine, 'drawCachedContent');

			const created = engine.cacheGroup('alpha-cache', 200, 150, () => {}, true, 0.25);

			expect(created).toBe(false);
			expect(drawCachedContentSpy).toHaveBeenCalledWith('alpha-cache', 0, 0, 0.25);
		});

		test('should handle enabled parameter in cacheGroup', () => {
			let ran = false;

			// With enabled: false, should always draw without caching
			const result = engine.cacheGroup(
				'disabled-cache',
				100,
				100,
				() => {
					ran = true;
				},
				false
			);

			expect(result).toBe(false);
			expect(ran).toBe(true);
			expect(engine.hasCachedContent('disabled-cache')).toBe(false);
		});

		test('should correctly identify cached content', () => {
			expect(engine.hasCachedContent('test-cache')).toBe(false);

			engine.cacheGroup('test-cache', 100, 100, () => {});

			expect(engine.hasCachedContent('test-cache')).toBe(true);
		});

		test('should clear specific cache entries', () => {
			engine.cacheGroup('cache1', 100, 100, () => {});
			engine.cacheGroup('cache2', 100, 100, () => {});

			expect(engine.hasCachedContent('cache1')).toBe(true);
			expect(engine.hasCachedContent('cache2')).toBe(true);

			engine.clearCache('cache1');

			expect(engine.hasCachedContent('cache1')).toBe(false);
			expect(engine.hasCachedContent('cache2')).toBe(true);
		});

		test('should clear all cache entries', () => {
			engine.cacheGroup('cache1', 100, 100, () => {});
			engine.cacheGroup('cache2', 100, 100, () => {});

			expect(engine.getCacheStats().itemCount).toBe(2);

			engine.clearAllCache();

			expect(engine.getCacheStats().itemCount).toBe(0);
			expect(engine.hasCachedContent('cache1')).toBe(false);
			expect(engine.hasCachedContent('cache2')).toBe(false);
		});

		test('should provide accurate cache statistics', () => {
			let stats = engine.getCacheStats();
			expect(stats.itemCount).toBe(0);
			expect(stats.maxItems).toBe(5);

			engine.cacheGroup('stats-test', 100, 100, () => {});

			stats = engine.getCacheStats();
			expect(stats.itemCount).toBe(1);
			expect(stats.accessOrder).toContain('stats-test');
		});

		test('should forward alpha to cached texture replay', () => {
			engine.cacheGroup('alpha-cache', 100, 100, () => {});

			const cachedRenderer = (engine as any).renderer;
			const drawCachedTextureSpy = jest.spyOn(cachedRenderer, 'drawCachedTexture');

			engine.drawCachedContent('alpha-cache', 10, 20, 0.6);

			expect(drawCachedTextureSpy).toHaveBeenCalledWith(mockTexture, 100, 100, 10, 20, 0.6);
		});
	});

	describe('Integration with Transform Groups', () => {
		test('should handle nested transform groups with caching', () => {
			const engine = new Engine(mockCanvas, { caching: true });

			engine.startGroup(5, 5);
			engine.startGroup(10, 10);
			expect(engine.offsetX).toBe(15);
			expect(engine.offsetY).toBe(15);

			let insideOffset: { x: number; y: number } | null = null;
			engine.cacheGroup('nested-cache', 100, 100, () => {
				insideOffset = { x: engine.offsetX, y: engine.offsetY };
			});

			expect(insideOffset).toEqual({ x: 0, y: 0 });
			expect(engine.offsetX).toBe(15);
			expect(engine.offsetY).toBe(15);

			// Clean up
			engine.endGroup();
			engine.endGroup();
		});
	});

	describe('Background Effect Methods', () => {
		let engine: Engine;

		beforeEach(() => {
			engine = new Engine(mockCanvas);
		});

		test('should expose background effect API methods', () => {
			expect(typeof engine.setBackgroundEffect).toBe('function');
			expect(typeof engine.clearBackgroundEffect).toBe('function');
		});

		test('should set and clear background effects without throwing', () => {
			expect(() => {
				engine.setBackgroundEffect({
					vertexShader: 'vertex source',
					fragmentShader: 'fragment source',
				});
			}).not.toThrow();

			expect(() => {
				engine.clearBackgroundEffect();
			}).not.toThrow();
		});

		test('should expose background effect API with caching enabled', () => {
			const cachedEngine = new Engine(mockCanvas, { caching: true });
			expect(typeof cachedEngine.setBackgroundEffect).toBe('function');
			expect(typeof cachedEngine.clearBackgroundEffect).toBe('function');
		});
	});

	describe('Background Effect Rendering', () => {
		let renderer: any;

		beforeEach(() => {
			renderer = new Renderer(mockCanvas);
			jest.clearAllMocks();
		});

		test('should render background effect before sprites', () => {
			// Set up a background effect
			renderer.setBackgroundEffect({
				vertexShader: 'vertex source',
				fragmentShader: 'fragment source',
			});

			// Clear mock calls to start fresh
			jest.clearAllMocks();

			// Render with post-processing
			renderer.renderWithPostProcessing(0);

			// Verify that the background quad (TRIANGLE_STRIP) is drawn before sprite triangles
			const drawArraysCalls = (mockGL.drawArrays as jest.Mock).mock.calls;
			const backgroundCallIndex = drawArraysCalls.findIndex(call => call[0] === mockGL.TRIANGLE_STRIP);
			const spriteCallIndex = drawArraysCalls.findIndex(call => call[0] === mockGL.TRIANGLES);

			// Ensure both background and sprite draws occurred
			expect(backgroundCallIndex).not.toBe(-1);
			expect(spriteCallIndex).not.toBe(-1);

			// Ensure background effect rendered before sprites
			expect(backgroundCallIndex).toBeLessThan(spriteCallIndex);
		});

		test('should restore sprite state after background effect renders', () => {
			// Set up a background effect
			renderer.setBackgroundEffect({
				vertexShader: 'vertex source',
				fragmentShader: 'fragment source',
			});

			// Clear mock calls to start fresh
			jest.clearAllMocks();

			// Render with post-processing
			renderer.renderWithPostProcessing(0);

			// Verify sprite state restoration after background rendering by checking that
			// vertexAttribPointer and enableVertexAttribArray were called for sprite attributes.
			// Since attribute locations are now cached, we can't rely on getAttribLocation call counts.
			// Instead, we verify that the attribute setup functions were called the expected number of times.
			const vertexAttribPointerCalls = (mockGL.vertexAttribPointer as jest.Mock).mock.calls;
			const enableVertexAttribArrayCalls = (mockGL.enableVertexAttribArray as jest.Mock).mock.calls;

			// We expect exactly 6 vertexAttribPointer calls when a background effect is set:
			// 1 from backgroundEffectManager.render() for a_position
			// 2 from restoreSpriteState() after background for a_position + a_texcoord
			// 1 from postProcessManager.render() for a_position
			// 2 from restoreSpriteState() after post-process for a_position + a_texcoord
			expect(vertexAttribPointerCalls.length).toBe(6);
			expect(enableVertexAttribArrayCalls.length).toBe(6);
		});

		test('should not restore sprite state when no background effect is set', () => {
			// Don't set a background effect
			jest.clearAllMocks();

			// Render with post-processing
			renderer.renderWithPostProcessing(0);

			// When no background effect is set, we should see 3 vertexAttribPointer calls:
			// 1 from postProcessManager.render() for a_position
			// 2 from restoreSpriteState() after post-process for a_position + a_texcoord
			const vertexAttribPointerCalls = (mockGL.vertexAttribPointer as jest.Mock).mock.calls;

			// Expected: 3 (1 from postProcess + 2 from final restoreSpriteState),
			// not 4+ (which would include restoreSpriteState after background)
			expect(vertexAttribPointerCalls.length).toBe(3);
		});

		test('should handle attribute location -1 gracefully', () => {
			// Mock getAttribLocation to return -1 (attribute not found)
			(mockGL.getAttribLocation as jest.Mock).mockReturnValue(-1);

			// Set up a background effect
			renderer.setBackgroundEffect({
				vertexShader: 'vertex source',
				fragmentShader: 'fragment source',
			});

			// This should not throw even with -1 attribute locations
			expect(() => {
				renderer.renderWithPostProcessing(0);
			}).not.toThrow();

			// Verify vertexAttribPointer was not called with -1
			const vertexAttribPointerCalls = (mockGL.vertexAttribPointer as jest.Mock).mock.calls;
			vertexAttribPointerCalls.forEach(call => {
				expect(call[0]).not.toBe(-1);
			});

			// Verify enableVertexAttribArray was not called with -1
			const enableVertexAttribArrayCalls = (mockGL.enableVertexAttribArray as jest.Mock).mock.calls;
			enableVertexAttribArrayCalls.forEach(call => {
				expect(call[0]).not.toBe(-1);
			});
		});
	});
});
