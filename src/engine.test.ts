import { afterEach, describe, expect, it, vi } from 'vitest';

import { Engine } from './engine.ts';

type FakeWebGl = ReturnType<typeof createFakeWebGl>;

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('Engine', () => {
	it('exposes its shared context and runs ordered hooks around sprite rendering', () => {
		const { engine, webgl } = createEngine();
		const atlas = engine.setSpriteAtlas(createAtlasImage(), {
			player: { x: 0, y: 0, spriteWidth: 8, spriteHeight: 8 },
		});
		const player = atlas.resolveSprite('player');
		const order: string[] = [];
		engine.hooks.preDraw.push(gl => {
			expect(gl).toBe(webgl);
			order.push('pre-1');
		});
		engine.hooks.preDraw.push(() => order.push('pre-2'));
		engine.hooks.postDraw.push(() => {
			expect(webgl.drawArraysInstanced).toHaveBeenCalledOnce();
			order.push('post');
		});

		expect(engine.gl).toBe(webgl);
		engine.renderFrame(() => {
			order.push('application');
			engine.drawSprite(0, 0, player, 0);
		});

		expect(order).toEqual(['pre-1', 'pre-2', 'application', 'post']);
	});

	it('runs post-draw hooks on frames without sprites', () => {
		const { engine } = createEngine();
		const postDraw = vi.fn();
		engine.hooks.postDraw.push(postDraw);

		engine.renderFrame(() => undefined);

		expect(postDraw).toHaveBeenCalledOnce();
	});

	it('propagates hook errors and closes the frame state', () => {
		const { engine } = createEngine();
		const expected = new Error('plugin failure');
		engine.hooks.preDraw.push(() => {
			throw expected;
		});

		expect(() => engine.renderFrame(() => undefined)).toThrow(expected);
		engine.hooks.preDraw.length = 0;
		expect(() =>
			engine.setSpriteAtlas(createAtlasImage(), {
				player: { x: 0, y: 0, spriteWidth: 8, spriteHeight: 8 },
			})
		).not.toThrow();
	});

	it('restores sprite-pass state after a pre-draw hook dirties the shared context', () => {
		const { engine, webgl } = createEngine();
		const atlas = engine.setSpriteAtlas(createAtlasImage(), {
			player: { x: 0, y: 0, spriteWidth: 8, spriteHeight: 8 },
		});
		const player = atlas.resolveSprite('player');
		const pluginFramebuffer = { plugin: true } as unknown as WebGLFramebuffer;
		engine.hooks.preDraw.push(gl => {
			gl.bindFramebuffer(gl.FRAMEBUFFER, pluginFramebuffer);
			gl.viewport(1, 2, 3, 4);
			gl.colorMask(false, false, false, false);
			gl.disable(gl.BLEND);
			gl.enable(gl.SCISSOR_TEST);
			gl.enable(gl.DEPTH_TEST);
			gl.enable(gl.STENCIL_TEST);
			gl.enable(gl.CULL_FACE);
			gl.enable(gl.RASTERIZER_DISCARD);
		});

		engine.renderFrame(() => engine.drawSprite(0, 0, player, 0));

		expect(webgl.bindFramebuffer).toHaveBeenLastCalledWith(webgl.FRAMEBUFFER, null);
		expect(webgl.viewport).toHaveBeenLastCalledWith(0, 0, 320, 200);
		expect(webgl.enable).toHaveBeenLastCalledWith(webgl.BLEND);
		expect(webgl.blendEquation).toHaveBeenLastCalledWith(webgl.FUNC_ADD);
		expect(webgl.blendFunc).toHaveBeenLastCalledWith(webgl.ONE, webgl.ONE_MINUS_SRC_ALPHA);
		expect(webgl.colorMask).toHaveBeenLastCalledWith(true, true, true, true);
		for (const capability of [
			webgl.SCISSOR_TEST,
			webgl.DEPTH_TEST,
			webgl.STENCIL_TEST,
			webgl.CULL_FACE,
			webgl.RASTERIZER_DISCARD,
		]) {
			expect(webgl.disable).toHaveBeenCalledWith(capability);
		}
	});

	it('restores clear state on the frame after a post-draw hook dirties it', () => {
		const { engine, webgl } = createEngine();
		const pluginFramebuffer = { plugin: true } as unknown as WebGLFramebuffer;
		engine.hooks.postDraw.push(gl => {
			gl.bindFramebuffer(gl.FRAMEBUFFER, pluginFramebuffer);
			gl.viewport(1, 2, 3, 4);
			gl.colorMask(false, false, false, false);
			gl.enable(gl.SCISSOR_TEST);
			gl.clearColor(1, 0, 0, 0);
		});

		engine.renderFrame(() => undefined);
		engine.hooks.postDraw.length = 0;
		engine.renderFrame(() => undefined);

		expect(webgl.bindFramebuffer).toHaveBeenLastCalledWith(webgl.FRAMEBUFFER, null);
		expect(webgl.viewport).toHaveBeenLastCalledWith(0, 0, 320, 200);
		expect(webgl.colorMask).toHaveBeenLastCalledWith(true, true, true, true);
		expect(webgl.disable).toHaveBeenLastCalledWith(webgl.SCISSOR_TEST);
		expect(webgl.clearColor).toHaveBeenLastCalledWith(0, 0, 0, 0);
	});

	it('requests a transparent context without a depth buffer', () => {
		const { canvas, engine, webgl } = createEngine();

		expect(canvas.getContext).toHaveBeenCalledWith('webgl2', { antialias: false, alpha: true, depth: false });
		engine.renderFrame(() => undefined);
		expect(webgl.clearColor).toHaveBeenLastCalledWith(0, 0, 0, 0);
	});

	it('uploads one ordered instance range and renders it with one instanced draw', () => {
		const { engine, webgl } = createEngine();
		const atlas = engine.setSpriteAtlas(createAtlasImage(), {
			player: { x: 0, y: 0, spriteWidth: 8, spriteHeight: 16 },
			enemy: { x: 8, y: 0, spriteWidth: 12, spriteHeight: 10 },
		});
		const player = atlas.resolveSprite('player');
		const enemy = atlas.resolveSprite('enemy');
		webgl.bufferSubData.mockClear();
		webgl.drawArraysInstanced.mockClear();
		webgl.texImage2D.mockClear();

		engine.renderFrame(() => {
			engine.drawSprite(10, 20, player, 0);
			engine.drawSprite(30, 40, enemy, 0, 50, 60);
		});

		expect(webgl.bufferSubData).toHaveBeenCalledTimes(1);
		const bytes = webgl.bufferSubData.mock.calls[0][2] as Uint8Array;
		const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
		const integers = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
		expect(bytes.byteLength).toBe(40);
		expect(Array.from(floats.slice(0, 4))).toEqual([10, 20, 8, 16]);
		expect(integers[4]).toBe(0);
		expect(Array.from(floats.slice(5, 9))).toEqual([30, 40, 50, 60]);
		expect(integers[9]).toBe(1);
		expect(webgl.drawArraysInstanced).toHaveBeenCalledTimes(1);
		expect(webgl.drawArraysInstanced).toHaveBeenCalledWith(webgl.TRIANGLE_STRIP, 0, 4, 2);
		expect(webgl.texImage2D).not.toHaveBeenCalled();
	});

	it('exposes stable statistics for the most recently uploaded sprite instances', () => {
		const { engine } = createEngine();
		const stats = engine.frameStats;
		expect(stats).toEqual({ spriteCount: 0, uploadedInstanceBytes: 0 });
		const atlas = engine.setSpriteAtlas(createAtlasImage(), {
			player: { x: 0, y: 0, spriteWidth: 8, spriteHeight: 8 },
		});
		const player = atlas.resolveSprite('player');

		engine.renderFrame(() => {
			engine.drawSprite(0, 0, player, 0);
			engine.drawSprite(10, 0, player, 0);
		});

		expect(engine.frameStats).toBe(stats);
		expect(stats).toEqual({ spriteCount: 2, uploadedInstanceBytes: 40 });

		engine.renderFrame(() => undefined);
		expect(stats).toEqual({ spriteCount: 0, uploadedInstanceBytes: 0 });
	});

	it('resolves sparse numeric identifiers before drawing', () => {
		const { engine, webgl } = createEngine();
		const atlas = engine.setSpriteAtlas(createAtlasImage(), {
			7: { x: 0, y: 0, spriteWidth: 4, spriteHeight: 5 },
		});
		const spriteId = atlas.resolveSprite(7);
		expect(spriteId).toBe(0);

		engine.renderFrame(() => {
			engine.drawSprite(1, 2, spriteId, 0);
		});
		expect(webgl.drawArraysInstanced).toHaveBeenLastCalledWith(webgl.TRIANGLE_STRIP, 0, 4, 1);
	});

	it('keeps atlas replacement outside frames', () => {
		const { engine } = createEngine();
		const image = createAtlasImage();
		const lookup = { player: { x: 0, y: 0, spriteWidth: 8, spriteHeight: 8 } };
		const atlas = engine.setSpriteAtlas(image, lookup);
		const player = atlas.resolveSprite('player');

		expect(() =>
			engine.renderFrame(() => {
				engine.setSpriteAtlas(image, lookup);
			})
		).toThrow('cannot be replaced while a frame is being built');

		expect(() => engine.renderFrame(() => engine.drawSprite(0, 0, player, 0))).not.toThrow();
	});

	it('grows and reuses the same GPU buffer object', () => {
		const { engine, webgl } = createEngine(1);
		const atlas = engine.setSpriteAtlas(createAtlasImage(), {
			player: { x: 0, y: 0, spriteWidth: 8, spriteHeight: 8 },
		});
		const player = atlas.resolveSprite('player');
		webgl.bufferData.mockClear();

		engine.renderFrame(() => {
			engine.drawSprite(0, 0, player, 0);
			engine.drawSprite(10, 0, player, 0);
		});

		expect(webgl.createBuffer).toHaveBeenCalledTimes(2);
		expect(webgl.bufferData).toHaveBeenCalledTimes(1);
		expect(webgl.bufferData).toHaveBeenCalledWith(webgl.ARRAY_BUFFER, 40, webgl.DYNAMIC_DRAW);
	});

	it('atomically replaces atlas resources and explicit resize updates the drawing buffer', () => {
		const { canvas, engine, webgl } = createEngine();
		engine.setSpriteAtlas(createAtlasImage(), {
			first: { x: 0, y: 0, spriteWidth: 8, spriteHeight: 8 },
		});
		webgl.deleteTexture.mockClear();
		engine.setSpriteAtlas(createAtlasImage(), {
			second: { x: 8, y: 8, spriteWidth: 8, spriteHeight: 8 },
		});

		expect(webgl.deleteTexture).toHaveBeenCalledTimes(2);
		engine.resize(640, 360);
		expect(canvas.width).toBe(640);
		expect(canvas.height).toBe(360);
		expect(webgl.viewport).toHaveBeenLastCalledWith(0, 0, 640, 360);
	});

	it('releases and restores atlas textures and the palette while reallocating instance storage lazily', () => {
		const { canvas, engine, webgl } = createEngine(1);
		const atlas = engine.setSpriteAtlas(createAtlasImage(), {
			player: { x: 0, y: 0, spriteWidth: 8, spriteHeight: 8 },
		});
		const player = atlas.resolveSprite('player');
		webgl.deleteTexture.mockClear();
		webgl.bufferData.mockClear();
		webgl.texImage2D.mockClear();

		engine.releaseRenderingMemory();
		engine.releaseRenderingMemory();

		expect(webgl.deleteTexture).toHaveBeenCalledTimes(2);
		expect(webgl.bufferData).toHaveBeenCalledOnce();
		expect(webgl.bufferData).toHaveBeenCalledWith(webgl.ARRAY_BUFFER, 0, webgl.DYNAMIC_DRAW);
		expect(canvas).toEqual(expect.objectContaining({ width: 320, height: 200 }));

		engine.restoreRenderingMemory();
		engine.restoreRenderingMemory();

		expect(webgl.texImage2D).toHaveBeenCalledTimes(2);
		expect(webgl.bufferData).toHaveBeenCalledTimes(2);
		expect(webgl.bufferData).toHaveBeenLastCalledWith(
			webgl.UNIFORM_BUFFER,
			expect.any(Float32Array),
			webgl.STATIC_DRAW
		);

		engine.renderFrame(() => engine.drawSprite(0, 0, player, 0));

		expect(webgl.bufferData).toHaveBeenCalledTimes(3);
		expect(webgl.bufferData).toHaveBeenLastCalledWith(webgl.ARRAY_BUFFER, 20, webgl.DYNAMIC_DRAW);
		expect(webgl.drawArraysInstanced).toHaveBeenCalledOnce();
	});

	it('owns one requestAnimationFrame loop and destroys resources idempotently', () => {
		const requestAnimationFrame = vi.fn(() => 23);
		const cancelAnimationFrame = vi.fn();
		vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
		vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
		const { engine, webgl } = createEngine();
		const callback = vi.fn();

		engine.render(callback);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
		expect(() => engine.render(callback)).toThrow('already running');

		engine.destroy();
		engine.destroy();
		expect(cancelAnimationFrame).toHaveBeenCalledOnce();
		expect(cancelAnimationFrame).toHaveBeenCalledWith(23);
		expect(webgl.deleteBuffer).toHaveBeenCalledTimes(2);
		expect(webgl.deleteVertexArray).toHaveBeenCalledOnce();
		expect(webgl.deleteProgram).toHaveBeenCalledOnce();
		expect(() => engine.setSpriteAtlas(createAtlasImage(), {})).toThrow('engine has been destroyed');
		expect(() => engine.render(callback)).toThrow('engine has been destroyed');
		expect(() => engine.resize(640, 360)).toThrow('engine has been destroyed');
		expect(() => engine.releaseRenderingMemory()).toThrow('engine has been destroyed');
		expect(() => engine.restoreRenderingMemory()).toThrow('engine has been destroyed');
	});
	it('uploads odd-width R8 binary masks with explicit tightly packed pixel-transfer state', () => {
		const { engine, webgl } = createEngine();
		const pixels = new Uint8Array([0, 255, 255, 255, 255, 0]);
		engine.setSpriteAtlas(
			{ width: 3, height: 2, data: pixels },
			{
				mask: { x: 0, y: 0, spriteWidth: 3, spriteHeight: 2 },
			}
		);
		expect(webgl.texImage2D).toHaveBeenCalledWith(
			webgl.TEXTURE_2D,
			0,
			webgl.R8,
			3,
			2,
			0,
			webgl.RED,
			webgl.UNSIGNED_BYTE,
			pixels
		);
		expect(webgl.pixelStorei).toHaveBeenCalledWith(webgl.UNPACK_ALIGNMENT, 1);
		expect(webgl.pixelStorei).toHaveBeenCalledWith(webgl.UNPACK_ROW_LENGTH, 0);
		expect(webgl.bindBuffer).toHaveBeenCalledWith(webgl.PIXEL_UNPACK_BUFFER, null);
	});

	it('prepares premultiplied float32 palette colors in a fully backed block and skips equivalent updates', () => {
		const { engine, webgl } = createEngine();
		const colors = new Uint8Array([255, 100, 50, 128, 17, 33, 99, 255, 100, 150, 200, 0]);
		webgl.bufferData.mockClear();
		webgl.texImage2D.mockClear();
		engine.setPalette(colors);
		engine.setPalette(colors.slice());
		expect(webgl.bufferData).toHaveBeenCalledExactlyOnceWith(
			webgl.UNIFORM_BUFFER,
			expect.any(Float32Array),
			webgl.STATIC_DRAW
		);
		const data = webgl.bufferData.mock.calls[0][1] as Float32Array;
		expect(data.byteLength).toBe(4096);
		expect(data[0]).toBe(Math.fround(128 / 255));
		expect(data[1]).toBeCloseTo((100 / 255) * (128 / 255), 7);
		expect(data[2]).toBeCloseTo((50 / 255) * (128 / 255), 7);
		expect(data[3]).toBe(Math.fround(128 / 255));
		expect([...data.slice(4, 8)]).toEqual([Math.fround(17 / 255), Math.fround(33 / 255), Math.fround(99 / 255), 1]);
		expect([...data.slice(8)]).toEqual(new Array(1016).fill(0));
		expect(webgl.texImage2D).not.toHaveBeenCalled();
		expect(() => engine.renderFrame(() => engine.setPalette(colors))).toThrow('cannot be replaced while a frame');
	});

	it('accepts the last palette slot and clears unused slots when replacing a larger palette', () => {
		const { engine, webgl } = createEngine();
		const colors = new Uint8Array(256 * 4).fill(255);
		webgl.bufferData.mockClear();
		webgl.deleteBuffer.mockClear();
		engine.setPalette(colors);
		const full = webgl.bufferData.mock.calls[0][1] as Float32Array;
		expect([...full.slice(-4)]).toEqual([1, 1, 1, 1]);
		engine.setPalette(new Uint8Array([255, 0, 0, 255]));
		const smaller = webgl.bufferData.mock.calls[1][1] as Float32Array;
		expect(smaller.byteLength).toBe(4096);
		expect([...smaller.slice(0, 4)]).toEqual([1, 0, 0, 1]);
		expect(smaller.slice(4).every(value => value === 0)).toBe(true);
		expect(webgl.deleteBuffer).toHaveBeenCalledTimes(2);
	});

	it('retains the latest palette while memory is released and owns its supplied data', () => {
		const { engine, webgl } = createEngine();
		engine.releaseRenderingMemory();
		webgl.bufferData.mockClear();
		const colors = new Uint8Array([42, 43, 44, 128]);
		engine.setPalette(colors);
		colors.fill(0);
		expect(webgl.bufferData).not.toHaveBeenCalled();
		engine.restoreRenderingMemory();
		const data = webgl.bufferData.mock.calls[0][1] as Float32Array;
		expect(data[0]).toBeCloseTo((42 / 255) * (128 / 255), 7);
		expect(data[1]).toBeCloseTo((43 / 255) * (128 / 255), 7);
		expect(data[2]).toBeCloseTo((44 / 255) * (128 / 255), 7);
		expect(data[3]).toBe(Math.fround(128 / 255));
		webgl.bufferData.mockClear();
		engine.setPalette(new Uint8Array([42, 43, 44, 128]));
		expect(webgl.bufferData).not.toHaveBeenCalled();
	});

	it.each(['allocation', 'upload'] as const)('preserves the installed palette after a failed %s', failure => {
		const { engine, webgl } = createEngine();
		const oldBuffer = webgl.createBuffer.mock.results.at(-1)!.value;
		const id = engine
			.setSpriteAtlas(createAtlasImage(), { fill: { x: 0, y: 0, spriteWidth: 1, spriteHeight: 1 } })
			.resolveSprite('fill');
		webgl.deleteBuffer.mockClear();
		const colors = new Uint8Array([255, 0, 0, 128]);
		if (failure === 'allocation') webgl.createBuffer.mockReturnValueOnce(null);
		else
			webgl.bufferData.mockImplementationOnce(() => {
				throw new Error('upload failed');
			});
		expect(() => engine.setPalette(colors)).toThrow();
		expect(webgl.deleteBuffer).not.toHaveBeenCalledWith(oldBuffer);
		engine.renderFrame(() => engine.drawSprite(0, 0, id, 0));
		expect(webgl.bindBufferBase).toHaveBeenLastCalledWith(webgl.UNIFORM_BUFFER, 0, oldBuffer);
		engine.setPalette(colors);
		expect(webgl.deleteBuffer).toHaveBeenCalledWith(oldBuffer);
		engine.renderFrame(() => engine.drawSprite(0, 0, id, 0));
		expect(webgl.bindBufferBase.mock.calls.at(-1)![2]).not.toBe(oldBuffer);
	});

	it('packs palette indices and restores uniform-block, buffer, and atlas sampler bindings after hooks', () => {
		const { engine, webgl } = createEngine();
		engine.setPalette(new Uint8Array([255, 255, 255, 255, 255, 0, 0, 128]));
		const paletteBuffer = webgl.createBuffer.mock.results.at(-1)!.value;
		const id = engine
			.setSpriteAtlas(createAtlasImage(), { mask: { x: 0, y: 0, spriteWidth: 8, spriteHeight: 8 } })
			.resolveSprite('mask');
		engine.hooks.preDraw.push(gl => {
			gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, {} as WebGLBuffer);
			gl.uniformBlockBinding({} as WebGLProgram, 0, 3);
			gl.bindSampler(1, {} as WebGLSampler);
		});
		engine.renderFrame(() => engine.drawSprite(1, 2, id, 1));
		const bytes = webgl.bufferSubData.mock.calls[0][2] as Uint8Array;
		expect([...new Uint16Array(bytes.buffer, bytes.byteOffset + 16, 2)]).toEqual([0, 1]);
		expect(webgl.uniformBlockBinding).toHaveBeenLastCalledWith(expect.anything(), 0, 0);
		expect(webgl.bindBufferBase).toHaveBeenLastCalledWith(webgl.UNIFORM_BUFFER, 0, paletteBuffer);
		expect(webgl.bindSampler).toHaveBeenLastCalledWith(1, null);
		expect(engine.frameStats.uploadedInstanceBytes).toBe(20);
	});

	it.each([1, 127, 128, 254])('rejects mask byte %s without replacing the installed atlas', value => {
		const { engine, webgl } = createEngine();
		const lookup = { fill: { x: 0, y: 0, spriteWidth: 1, spriteHeight: 1 } };
		const id = engine
			.setSpriteAtlas({ width: 1, height: 1, data: new Uint8Array([255]) }, lookup)
			.resolveSprite('fill');
		webgl.createTexture.mockClear();
		webgl.deleteTexture.mockClear();
		webgl.texImage2D.mockClear();
		expect(() => engine.setSpriteAtlas({ width: 1, height: 1, data: new Uint8Array([value]) }, lookup)).toThrow(
			'0 or 255'
		);
		expect(webgl.createTexture).not.toHaveBeenCalled();
		expect(webgl.deleteTexture).not.toHaveBeenCalled();
		engine.renderFrame(() => engine.drawSprite(0, 0, id, 0));
		expect(webgl.drawArraysInstanced).toHaveBeenCalledOnce();
		engine.releaseRenderingMemory();
		expect(() => engine.setSpriteAtlas({ width: 1, height: 1, data: new Uint8Array([value]) }, lookup)).toThrow(
			'0 or 255'
		);
		engine.restoreRenderingMemory();
		expect(webgl.texImage2D.mock.calls[0].at(-1)).toEqual(new Uint8Array([255]));
	});

	it('rejects malformed masks and out-of-range palettes before replacing resources', () => {
		const { engine, webgl } = createEngine();
		webgl.createBuffer.mockClear();
		for (const size of [0, 5, 257 * 4]) {
			expect(() => engine.setPalette(new Uint8Array(size))).toThrow('1 to 256 RGBA8 entries');
		}
		expect(webgl.createBuffer).not.toHaveBeenCalled();
		expect(() => engine.setSpriteAtlas({ width: 3, height: 2, data: new Uint8Array(5) }, {})).toThrow('one mask byte');
	});

	it('cleans up the shader program when the palette uniform block cannot be found', () => {
		const webgl = createFakeWebGl();
		webgl.getUniformBlockIndex.mockReturnValue(webgl.INVALID_INDEX);
		const canvas = { getContext: () => webgl } as unknown as HTMLCanvasElement;
		expect(() => new Engine(canvas)).toThrow('Palette shader uniform block');
		expect(webgl.deleteProgram).toHaveBeenCalledOnce();
		expect(webgl.createBuffer).not.toHaveBeenCalled();
	});
});

function createEngine(initialCapacity = 4): {
	canvas: HTMLCanvasElement;
	engine: Engine;
	webgl: FakeWebGl;
} {
	const webgl = createFakeWebGl();
	const canvas = {
		width: 320,
		height: 200,
		getContext: vi.fn(() => webgl),
	} as unknown as HTMLCanvasElement;
	const engine = new Engine(canvas, { initialCapacity });
	engine.setPalette(new Uint8Array([255, 255, 255, 255]));
	return { canvas, engine, webgl };
}

function createAtlasImage() {
	return { width: 64, height: 64, data: new Uint8Array(64 * 64).fill(255) };
}

function createFakeWebGl() {
	let resourceId = 0;
	const resource = (kind: string) => ({ kind, id: ++resourceId });
	return {
		VERTEX_SHADER: 0x8b31,
		FRAGMENT_SHADER: 0x8b30,
		COMPILE_STATUS: 0x8b81,
		LINK_STATUS: 0x8b82,
		ARRAY_BUFFER: 0x8892,
		UNIFORM_BUFFER: 0x8a11,
		INVALID_INDEX: 0xffffffff,
		STATIC_DRAW: 0x88e4,
		DYNAMIC_DRAW: 0x88e8,
		FLOAT: 0x1406,
		UNSIGNED_INT: 0x1405,
		TEXTURE_2D: 0x0de1,
		TEXTURE0: 0x84c0,
		TEXTURE1: 0x84c1,
		R8: 0x8229,
		RED: 0x1903,
		UNPACK_ALIGNMENT: 0x0cf5,
		UNPACK_ROW_LENGTH: 0x0cf2,
		UNPACK_SKIP_PIXELS: 0x0cf4,
		UNPACK_SKIP_ROWS: 0x0cf3,
		UNPACK_IMAGE_HEIGHT: 0x806e,
		UNPACK_SKIP_IMAGES: 0x806d,
		UNPACK_FLIP_Y_WEBGL: 0x9240,
		PIXEL_UNPACK_BUFFER: 0x88ec,
		UNSIGNED_BYTE: 0x1401,
		UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
		TEXTURE_MIN_FILTER: 0x2801,
		TEXTURE_MAG_FILTER: 0x2800,
		TEXTURE_WRAP_S: 0x2802,
		TEXTURE_WRAP_T: 0x2803,
		NEAREST: 0x2600,
		CLAMP_TO_EDGE: 0x812f,
		RGBA16UI: 0x8d76,
		RGBA_INTEGER: 0x8d99,
		UNSIGNED_SHORT: 0x1403,
		MAX_TEXTURE_SIZE: 0x0d33,
		COLOR_BUFFER_BIT: 0x4000,
		FRAMEBUFFER: 0x8d40,
		BLEND: 0x0be2,
		SCISSOR_TEST: 0x0c11,
		DEPTH_TEST: 0x0b71,
		STENCIL_TEST: 0x0b90,
		CULL_FACE: 0x0b44,
		RASTERIZER_DISCARD: 0x8c89,
		FUNC_ADD: 0x8006,
		ONE: 1,
		ONE_MINUS_SRC_ALPHA: 0x0303,
		TRIANGLE_STRIP: 0x0005,
		createShader: vi.fn(() => resource('shader')),
		shaderSource: vi.fn(),
		compileShader: vi.fn(),
		getShaderParameter: vi.fn(() => true),
		getShaderInfoLog: vi.fn(() => null),
		deleteShader: vi.fn(),
		createProgram: vi.fn(() => resource('program')),
		attachShader: vi.fn(),
		linkProgram: vi.fn(),
		getProgramParameter: vi.fn(() => true),
		getProgramInfoLog: vi.fn(() => null),
		deleteProgram: vi.fn(),
		createBuffer: vi.fn(() => resource('buffer')),
		deleteBuffer: vi.fn(),
		createVertexArray: vi.fn(() => resource('vertex-array')),
		deleteVertexArray: vi.fn(),
		createTexture: vi.fn(() => resource('texture')),
		deleteTexture: vi.fn(),
		getUniformBlockIndex: vi.fn(() => 0),
		uniformBlockBinding: vi.fn(),
		bindBufferBase: vi.fn(),
		getUniformLocation: vi.fn((_program: unknown, name: string) => ({ name })),
		useProgram: vi.fn(),
		bindVertexArray: vi.fn(),
		bindBuffer: vi.fn(),
		bufferData: vi.fn(),
		bufferSubData: vi.fn(),
		enableVertexAttribArray: vi.fn(),
		vertexAttribPointer: vi.fn(),
		vertexAttribIPointer: vi.fn(),
		vertexAttribDivisor: vi.fn(),
		uniform1i: vi.fn(),
		uniform2f: vi.fn(),
		viewport: vi.fn(),
		bindFramebuffer: vi.fn(),
		colorMask: vi.fn(),
		clearColor: vi.fn(),
		enable: vi.fn(),
		disable: vi.fn(),
		blendEquation: vi.fn(),
		blendFunc: vi.fn(),
		clear: vi.fn(),
		getParameter: vi.fn(() => 4_096),
		activeTexture: vi.fn(),
		bindTexture: vi.fn(),
		bindSampler: vi.fn(),
		pixelStorei: vi.fn(),
		texImage2D: vi.fn(),
		texParameteri: vi.fn(),
		drawArraysInstanced: vi.fn(),
	} as unknown as WebGL2RenderingContext & {
		[key: string]: ReturnType<typeof vi.fn> | number;
	};
}
