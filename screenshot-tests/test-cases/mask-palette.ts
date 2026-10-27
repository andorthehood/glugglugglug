import { Engine } from 'glugglugglug';

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

export function readCoverageFrames() {
	const canvas = document.createElement('canvas');
	canvas.width = 3;
	canvas.height = 2;
	const engine = new Engine(canvas);
	const gl = engine.gl;
	const id = engine
		.setSpriteAtlas(
			{ width: 3, height: 2, data: new Uint8Array([0, 128, 255, 255, 0, 128]) },
			{ mask: { x: 0, y: 0, spriteWidth: 3, spriteHeight: 2 } }
		)
		.resolveSprite('mask');
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
		// Palette buffers are independent of pixel-transfer state left by render hooks.
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 8);
		gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 7);
		engine.setPalette(new Uint8Array([0, 255, 0, 255]));
		const updated = read();
		const frameStats = { ...engine.frameStats };
		engine.releaseRenderingMemory();
		engine.setPalette(colors);
		engine.restoreRenderingMemory();
		return { initial, updated, restored: read(), frameStats, errors };
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
	const id = engine
		.setSpriteAtlas(
			{ width: 1, height: 1, data: new Uint8Array([255]) },
			{ fill: { x: 0, y: 0, spriteWidth: 1, spriteHeight: 1 } }
		)
		.resolveSprite('fill');
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
