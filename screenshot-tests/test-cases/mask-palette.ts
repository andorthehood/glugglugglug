import { Engine } from 'glugglugglug';

export async function readAlphaDiscardSamples() {
	const canvas = document.createElement('canvas');
	canvas.width = 1;
	canvas.height = 1;
	const engine = new Engine(canvas);
	const gl = engine.gl;
	const visibility = [0, 255];
	const alpha = [0, 64, 128, 255];
	engine.setSpriteAtlas(
		{ width: 2, height: 1, data: new Uint8Array(visibility) },
		{ cellWidth: 1, cellHeight: 1, columns: 2, cellCount: 2 }
	);
	engine.setPalette(new Uint8Array(alpha.flatMap(value => [200, 100, 50, value])));
	const results: Array<{ visibility: number; alpha: number; passed: boolean }> = [];
	try {
		for (const mask of visibility) {
			for (const [paletteIndex, opacity] of alpha.entries()) {
				const query = gl.createQuery()!;
				try {
					gl.beginQuery(gl.ANY_SAMPLES_PASSED, query);
					engine.renderFrame(() => engine.drawSprite(0, 0, visibility.indexOf(mask), paletteIndex));
					gl.endQuery(gl.ANY_SAMPLES_PASSED);
					gl.flush();
					while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
						await new Promise(resolve => requestAnimationFrame(resolve));
					}
					results.push({
						visibility: mask,
						alpha: opacity,
						passed: Boolean(gl.getQueryParameter(query, gl.QUERY_RESULT)),
					});
				} finally {
					gl.deleteQuery(query);
				}
			}
		}
		return { results, error: gl.getError() };
	} finally {
		engine.destroy();
	}
}

export function readVisibilityOverContent() {
	const canvas = document.createElement('canvas');
	canvas.width = 3;
	canvas.height = 1;
	const engine = new Engine(canvas);
	const gl = engine.gl;
	engine.setSpriteAtlas(
		{ width: 6, height: 1, data: new Uint8Array([0, 255, 255, 255, 255, 255]) },
		{ cellWidth: 3, cellHeight: 1, columns: 2, cellCount: 2 }
	);
	const mask = 0;
	const fill = 1;
	try {
		const frames = [0, 128, 255].map(alpha => {
			engine.setPalette(new Uint8Array([20, 40, 80, alpha, 200, 100, 50, 128, 255, 0, 255, 0]));
			engine.renderFrame(() => {
				engine.drawSprite(0, 0, fill, 0, 3, 1);
				engine.drawSprite(0, 0, mask, 1);
				engine.drawSprite(0, 0, fill, 2, 3, 1);
			});
			const pixels = new Uint8Array(12);
			gl.readPixels(0, 0, 3, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
			return { alpha, pixels: [...pixels] };
		});
		return { frames, error: gl.getError() };
	} finally {
		engine.destroy();
	}
}

export function readContextLifecycle() {
	const canvas = document.createElement('canvas');
	const engine = new Engine(canvas);
	const gl = engine.gl;
	const read = () => {
		engine.renderFrame(() => {});
		const pixel = new Uint8Array(4);
		gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
		return {
			attributes: gl.getContextAttributes(),
			depthBits: gl.getParameter(gl.DEPTH_BITS),
			pixel: [...pixel],
			error: gl.getError(),
		};
	};
	try {
		const initial = read();
		engine.resize(257, 193);
		const resized = read();
		engine.releaseRenderingMemory();
		engine.restoreRenderingMemory();
		return [initial, resized, read()];
	} finally {
		engine.destroy();
	}
}

export function readVisibilityFrames() {
	const canvas = document.createElement('canvas');
	canvas.width = 3;
	canvas.height = 2;
	const engine = new Engine(canvas);
	const gl = engine.gl;
	engine.setSpriteAtlas(
		{ width: 3, height: 2, data: new Uint8Array([0, 255, 255, 255, 0, 255]) },
		{ cellWidth: 3, cellHeight: 2, columns: 1, cellCount: 1 }
	);
	const id = 0;
	const colors = new Uint8Array([200, 100, 50, 128]);
	engine.setPalette(colors);
	const errors: number[] = [];
	const read = () => {
		engine.renderFrame(() => engine.drawSprite(0, 0, id, 0));
		const pixels = new Uint8Array(24);
		gl.readPixels(0, 0, 3, 2, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		errors.push(gl.getError());
		return [...pixels];
	};
	try {
		const initial = read();
		let rejected = false;
		try {
			engine.setSpriteAtlas(
				{ width: 1, height: 1, data: new Uint8Array([128]) },
				{ cellWidth: 1, cellHeight: 1, columns: 1, cellCount: 1 }
			);
		} catch (error) {
			rejected = error instanceof RangeError;
		}
		const afterRejectedAtlas = read();
		// Palette buffers are independent of pixel-transfer state left by render hooks.
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 8);
		gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 7);
		engine.setPalette(new Uint8Array([0, 255, 0, 255]));
		const updated = read();
		const frameStats = { ...engine.frameStats };
		engine.releaseRenderingMemory();
		engine.setPalette(colors);
		engine.restoreRenderingMemory();
		return { initial, afterRejectedAtlas, rejected, updated, restored: read(), frameStats, errors };
	} finally {
		engine.destroy();
	}
}

export function readPaletteAfterHook() {
	const canvas = document.createElement('canvas');
	canvas.width = 1;
	canvas.height = 1;
	const engine = new Engine(canvas);
	const gl = engine.gl;
	const colors = new Uint8Array(256 * 4);
	colors.set([49, 103, 211, 255], 255 * 4);
	engine.setPalette(colors);
	engine.setSpriteAtlas(
		{ width: 1, height: 1, data: new Uint8Array([255]) },
		{ cellWidth: 1, cellHeight: 1, columns: 1, cellCount: 1 }
	);
	const id = 0;
	const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram;
	const paletteBlock = gl.getUniformBlockIndex(program, 'Palette');
	const otherPalette = gl.createBuffer();
	gl.bindBuffer(gl.UNIFORM_BUFFER, otherPalette);
	gl.bufferData(gl.UNIFORM_BUFFER, new Float32Array(256 * 4), gl.STATIC_DRAW);
	engine.hooks.preDraw.push(() => {
		gl.uniformBlockBinding(program, paletteBlock, 1);
		gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, otherPalette);
		gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, otherPalette);
	});
	try {
		engine.renderFrame(() => engine.drawSprite(0, 0, id, 255));
		const pixels = new Uint8Array(4);
		gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		return { pixels: [...pixels], error: gl.getError() };
	} finally {
		gl.deleteBuffer(otherPalette);
		engine.destroy();
	}
}
