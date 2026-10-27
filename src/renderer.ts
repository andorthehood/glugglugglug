import { INSTANCE_BYTE_STRIDE, InstanceBuffer } from './instanceBuffer.ts';
import { assertLive, requiresLive } from './lifecycle.ts';
import { fragmentShaderSource, PALETTE_CAPACITY, vertexShaderSource } from './shaders.ts';
import { validateSpriteAtlasGrid } from './spriteAtlas.ts';

import type { SpriteAtlasGrid, SpriteAtlasImage, SpriteId } from './types.ts';

const PALETTE_BINDING = 0;

type PreparedPalette = { bytes: Uint8Array; colors: Float32Array };

/**
 * Owns the WebGL2 resources used to upload sprite instances and render them in a single instanced draw call.
 */
export class Renderer {
	/** Raw WebGL2 context used by the sprite renderer and trusted render hooks. */
	readonly gl: WebGL2RenderingContext;
	/** Mutable internal storage exposed by `Engine` as a readonly live statistics view. */
	readonly frameStats = {
		spriteCount: 0,
		uploadedInstanceBytes: 0,
	};
	private readonly program: WebGLProgram;
	private readonly instanceBufferObject: WebGLBuffer;
	private readonly vertexArray: WebGLVertexArrayObject;
	private readonly instances: InstanceBuffer;
	private readonly resolutionLocation: WebGLUniformLocation;
	private readonly atlasSizeLocation: WebGLUniformLocation;
	private readonly atlasSamplerLocation: WebGLUniformLocation;
	private readonly cellSizeLocation: WebGLUniformLocation;
	private readonly columnsLocation: WebGLUniformLocation;
	private readonly paletteBlockIndex: number;
	private paletteBuffer: WebGLBuffer | null = null;
	private palette: PreparedPalette | null = null;
	private gpuCapacity: number;
	private atlasTexture: WebGLTexture | null = null;
	private atlasImage: SpriteAtlasImage | null = null;
	private atlasGrid: SpriteAtlasGrid | null = null;
	private atlasWidth = 0;
	private atlasHeight = 0;
	private memoryReleased = false;
	private destroyed = false;

	/**
	 * Creates a renderer and allocates its initial CPU and GPU instance buffers.
	 *
	 * @param canvas - Canvas whose WebGL2 context receives the rendered sprites.
	 * @param initialCapacity - Number of sprite instances to allocate space for initially.
	 */
	constructor(
		private readonly canvas: HTMLCanvasElement,
		initialCapacity: number
	) {
		const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, depth: false });
		if (!gl) {
			throw new Error('WebGL2 is required but unavailable.');
		}

		this.gl = gl;
		this.instances = new InstanceBuffer(initialCapacity);
		this.gpuCapacity = this.instances.capacity;
		const resources = createRendererResources(gl);
		this.program = resources.program;
		this.instanceBufferObject = resources.instanceBuffer;
		this.vertexArray = resources.vertexArray;
		this.resolutionLocation = resources.resolutionLocation;
		this.atlasSizeLocation = resources.atlasSizeLocation;
		this.atlasSamplerLocation = resources.atlasSamplerLocation;
		this.cellSizeLocation = resources.cellSizeLocation;
		this.columnsLocation = resources.columnsLocation;
		this.paletteBlockIndex = resources.paletteBlockIndex;

		gl.useProgram(this.program);
		gl.bindVertexArray(this.vertexArray);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBufferObject);
		gl.bufferData(gl.ARRAY_BUFFER, this.gpuCapacity * INSTANCE_BYTE_STRIDE, gl.DYNAMIC_DRAW);

		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 4, gl.FLOAT, false, INSTANCE_BYTE_STRIDE, 0);
		gl.vertexAttribDivisor(0, 1);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribIPointer(1, 2, gl.UNSIGNED_SHORT, INSTANCE_BYTE_STRIDE, 4 * Uint32Array.BYTES_PER_ELEMENT);
		gl.vertexAttribDivisor(1, 1);

		gl.uniform1i(this.atlasSamplerLocation, 0);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	/**
	 * Uploads a uniform-grid sprite atlas, replacing any previously uploaded atlas.
	 *
	 * @param image - Tightly packed top-to-bottom R8 binary visibility and mask dimensions.
	 * @param grid - Shared cell dimensions, column count, and populated cell count.
	 */
	@requiresLive
	setSpriteAtlas(image: SpriteAtlasImage, grid: SpriteAtlasGrid): void {
		const { width, height } = image;
		if (!(image.data instanceof Uint8Array) || image.data.length !== width * height) {
			throw new RangeError('Mask data must contain exactly one mask byte per texel.');
		}
		for (const value of image.data) {
			if (value !== 0 && value !== 255) throw new RangeError('Mask bytes must be 0 or 255.');
		}
		validateSpriteAtlasGrid(grid, width, height);
		const maxTextureSize = Number(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE));
		if (width > maxTextureSize || height > maxTextureSize) {
			throw new RangeError(`Mask dimensions exceed the GPU limit of ${maxTextureSize}.`);
		}
		const retainedImage = { width, height, data: image.data.slice() };
		if (!this.memoryReleased) this.replaceAtlasTexture(retainedImage);
		this.atlasImage = retainedImage;
		this.atlasGrid = { ...grid };
		this.atlasWidth = width;
		this.atlasHeight = height;
	}

	/** Retains 1–256 straight-alpha RGBA8 entries and prepares premultiplied float32 colors once per update. */
	@requiresLive
	setPalette(colors: Uint8Array): void {
		if (
			colors instanceof Uint8Array &&
			this.palette?.bytes.length === colors.length &&
			colors.every((value, index) => value === this.palette!.bytes[index])
		)
			return;
		const nextPalette = preparePalette(colors);
		if (!this.memoryReleased) this.replacePaletteBuffer(nextPalette.colors);
		this.palette = nextPalette;
	}

	private replacePaletteBuffer(colors: Float32Array): void {
		const gl = this.gl;
		const buffer = requireResource(gl.createBuffer(), 'palette uniform buffer');
		try {
			gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
			gl.bufferData(gl.UNIFORM_BUFFER, colors, gl.STATIC_DRAW);
		} catch (error) {
			gl.deleteBuffer(buffer);
			throw error;
		}
		if (this.paletteBuffer) gl.deleteBuffer(this.paletteBuffer);
		this.paletteBuffer = buffer;
	}

	/** Releases reloadable textures, palette, and dynamic-buffer storage while retaining programs and CPU data. */
	@requiresLive
	releaseMemory(): void {
		if (this.memoryReleased) {
			return;
		}

		if (this.atlasTexture) {
			this.gl.deleteTexture(this.atlasTexture);
			this.atlasTexture = null;
		}
		if (this.paletteBuffer) this.gl.deleteBuffer(this.paletteBuffer);
		this.paletteBuffer = null;
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBufferObject);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, 0, this.gl.DYNAMIC_DRAW);
		this.gpuCapacity = 0;
		this.memoryReleased = true;
	}

	/** Restores retained atlas and palette resources after `releaseMemory()`; instance storage is restored lazily. */
	@requiresLive
	restoreMemory(): void {
		if (!this.memoryReleased) {
			return;
		}

		if (this.atlasImage) {
			this.replaceAtlasTexture(this.atlasImage);
		}
		if (this.palette) this.replacePaletteBuffer(this.palette.colors);
		this.memoryReleased = false;
	}

	/** Atomically replaces the atlas texture, preserving the installed one if allocation or upload fails. */
	private replaceAtlasTexture(image: SpriteAtlasImage): void {
		const texture = requireResource(this.gl.createTexture(), 'atlas texture');
		try {
			this.uploadAtlasTexture(texture, image);
		} catch (error) {
			this.gl.deleteTexture(texture);
			throw error;
		}
		if (this.atlasTexture) this.gl.deleteTexture(this.atlasTexture);
		this.atlasTexture = texture;
	}

	/**
	 * Starts a frame by clearing the queued instances and the canvas color buffer.
	 *
	 * This per-frame path intentionally performs no destruction-state validation.
	 */
	beginFrame(): void {
		this.instances.reset();
		const gl = this.gl;
		// Hooks share the raw context and may leave clear-related state dirty. These repeated assignments intentionally
		// establish the next frame's clear boundary; do not remove them as redundant constructor setup.
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.colorMask(true, true, true, true);
		gl.disable(gl.SCISSOR_TEST);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	/**
	 * Writes one sprite directly into the reusable CPU-side instance buffer.
	 *
	 * This hot-path method intentionally does not validate programmer input. Invalid identifiers, coordinates, or dimensions
	 * are programmer errors with unspecified consequences.
	 *
	 * @param x - Horizontal position of the sprite's top-left corner in canvas pixels.
	 * @param y - Vertical position of the sprite's top-left corner in canvas pixels.
	 * @param spriteId - Zero-based row-major cell index in the active atlas.
	 * @param paletteIndex - Uint16 field selecting an active palette color, with indices in the 0–255 range.
	 * @param width - Rendered width in pixels, or the shared cell width when omitted.
	 * @param height - Rendered height in pixels, or the shared cell height when omitted.
	 */
	drawSprite(x: number, y: number, spriteId: SpriteId, paletteIndex: number, width?: number, height?: number): void {
		const resolvedWidth = width ?? this.atlasGrid!.cellWidth;
		const resolvedHeight = height ?? this.atlasGrid!.cellHeight;
		this.instances.append(x, y, resolvedWidth, resolvedHeight, spriteId, paletteIndex);
	}

	/**
	 * Uploads the used portion of the instance buffer and renders all queued sprites in insertion order.
	 *
	 * This per-frame path intentionally performs no destruction-state validation.
	 */
	flush(): void {
		const spriteCount = this.instances.count;
		this.frameStats.spriteCount = spriteCount;
		this.frameStats.uploadedInstanceBytes = 0;
		if (spriteCount === 0) {
			return;
		}
		if (!this.atlasTexture || !this.paletteBuffer) {
			throw new Error('A sprite mask atlas and palette must be set before drawing sprites.');
		}

		const gl = this.gl;
		// Raw-context hooks may change any ordinary WebGL binding or capability. Reassert every state dependency of the
		// sprite pass here; this defensive work is intentional and must not be cleaned up as apparently duplicate setup.
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.useProgram(this.program);
		gl.bindVertexArray(this.vertexArray);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBufferObject);
		gl.enable(gl.BLEND);
		gl.blendEquation(gl.FUNC_ADD);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.colorMask(true, true, true, true);
		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.RASTERIZER_DISCARD);
		if (this.instances.capacity > this.gpuCapacity) {
			this.gpuCapacity = this.instances.capacity;
			gl.bufferData(gl.ARRAY_BUFFER, this.gpuCapacity * INSTANCE_BYTE_STRIDE, gl.DYNAMIC_DRAW);
		}
		const instanceBytes = this.instances.usedBytes();
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceBytes);
		this.frameStats.uploadedInstanceBytes = instanceBytes.byteLength;

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
		gl.bindSampler(0, null);
		gl.uniform1i(this.atlasSamplerLocation, 0);
		gl.uniformBlockBinding(this.program, this.paletteBlockIndex, PALETTE_BINDING);
		gl.bindBufferBase(gl.UNIFORM_BUFFER, PALETTE_BINDING, this.paletteBuffer);
		gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
		gl.uniform2f(this.atlasSizeLocation, this.atlasWidth, this.atlasHeight);
		gl.uniform2f(this.cellSizeLocation, this.atlasGrid!.cellWidth, this.atlasGrid!.cellHeight);
		gl.uniform1ui(this.columnsLocation, this.atlasGrid!.columns);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, spriteCount);
	}

	/**
	 * Changes the canvas drawing-buffer dimensions and updates the WebGL viewport.
	 *
	 * @param width - New canvas width in pixels.
	 * @param height - New canvas height in pixels.
	 */
	@requiresLive
	resize(width: number, height: number): void {
		assertPositiveInteger(width, 'width');
		assertPositiveInteger(height, 'height');
		this.canvas.width = width;
		this.canvas.height = height;
		this.gl.viewport(0, 0, width, height);
	}

	/**
	 * Releases every WebGL resource owned by this renderer.
	 *
	 * Calling this method more than once has no effect.
	 */
	destroy(): void {
		if (this.destroyed) {
			return;
		}
		this.destroyed = true;

		if (this.atlasTexture) {
			this.gl.deleteTexture(this.atlasTexture);
		}
		if (this.paletteBuffer) this.gl.deleteBuffer(this.paletteBuffer);
		this.paletteBuffer = null;
		this.palette = null;
		this.gl.deleteBuffer(this.instanceBufferObject);
		this.gl.deleteVertexArray(this.vertexArray);
		this.gl.deleteProgram(this.program);
		this.atlasTexture = null;
		this.atlasImage = null;
		this.atlasGrid = null;
	}

	/**
	 * Uploads an R8 binary visibility array and configures nearest-neighbor mask sampling.
	 *
	 * @param texture - WebGL texture that receives the atlas image.
	 * @param image - Source image containing the sprite atlas.
	 */
	private uploadAtlasTexture(texture: WebGLTexture, image: SpriteAtlasImage): void {
		const gl = this.gl;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		preparePixelUpload(gl);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, image.width, image.height, 0, gl.RED, gl.UNSIGNED_BYTE, image.data);
		configureTexture(gl);
	}

	/**
	 * Throws when an operation requiring live WebGL resources is attempted after destruction.
	 */
	[assertLive](): void {
		if (this.destroyed) {
			throw new Error('The glugglugglug renderer has been destroyed.');
		}
	}
}

/**
 * Compiles and links the vertex and fragment shaders into a WebGL program.
 *
 * @param gl - WebGL2 context used to create the program.
 * @param vertexSource - GLSL source for the vertex shader.
 * @param fragmentSource - GLSL source for the fragment shader.
 * @returns A linked WebGL program ready for use.
 */
function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
	let fragmentShader: WebGLShader | null = null;
	let program: WebGLProgram | null = null;

	try {
		fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
		program = requireResource(gl.createProgram(), 'shader program');
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(gl.getProgramInfoLog(program) ?? 'Could not link the sprite shader program.');
		}
		return program;
	} catch (error) {
		if (program) {
			gl.deleteProgram(program);
		}
		throw error;
	} finally {
		gl.deleteShader(vertexShader);
		if (fragmentShader) {
			gl.deleteShader(fragmentShader);
		}
	}
}

/**
 * Creates the shader program, instance buffer, vertex array, and uniform locations required by the renderer.
 *
 * @param gl - WebGL2 context used to allocate the resources.
 * @returns The complete set of initialized renderer resources.
 */
function createRendererResources(gl: WebGL2RenderingContext): {
	program: WebGLProgram;
	instanceBuffer: WebGLBuffer;
	vertexArray: WebGLVertexArrayObject;
	resolutionLocation: WebGLUniformLocation;
	atlasSizeLocation: WebGLUniformLocation;
	atlasSamplerLocation: WebGLUniformLocation;
	cellSizeLocation: WebGLUniformLocation;
	columnsLocation: WebGLUniformLocation;
	paletteBlockIndex: number;
} {
	const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
	let instanceBuffer: WebGLBuffer | null = null;
	let vertexArray: WebGLVertexArrayObject | null = null;

	try {
		const paletteBlockIndex = gl.getUniformBlockIndex(program, 'Palette');
		if (paletteBlockIndex === gl.INVALID_INDEX) {
			throw new Error('Could not find the Palette shader uniform block.');
		}
		instanceBuffer = requireResource(gl.createBuffer(), 'instance buffer');
		vertexArray = requireResource(gl.createVertexArray(), 'vertex array');
		return {
			program,
			instanceBuffer,
			vertexArray,
			resolutionLocation: requireUniform(gl, program, 'u_resolution'),
			atlasSizeLocation: requireUniform(gl, program, 'u_atlasSize'),
			atlasSamplerLocation: requireUniform(gl, program, 'u_atlas'),
			cellSizeLocation: requireUniform(gl, program, 'u_cellSize'),
			columnsLocation: requireUniform(gl, program, 'u_columns'),
			paletteBlockIndex,
		};
	} catch (error) {
		if (instanceBuffer) {
			gl.deleteBuffer(instanceBuffer);
		}
		if (vertexArray) {
			gl.deleteVertexArray(vertexArray);
		}
		gl.deleteProgram(program);
		throw error;
	}
}

/**
 * Compiles one GLSL shader and reports the compiler log when compilation fails.
 *
 * @param gl - WebGL2 context used to create the shader.
 * @param type - WebGL shader type, such as `VERTEX_SHADER` or `FRAGMENT_SHADER`.
 * @param source - GLSL source to compile.
 * @returns The compiled shader.
 */
function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
	const shader = requireResource(gl.createShader(type), 'shader');
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const message = gl.getShaderInfoLog(shader) ?? 'Could not compile a sprite shader.';
		gl.deleteShader(shader);
		throw new Error(message);
	}
	return shader;
}

/**
 * Narrows a nullable WebGL allocation result or throws a descriptive allocation error.
 *
 * @param resource - Resource returned by a WebGL creation call.
 * @param name - Human-readable resource name used in the error message.
 * @returns The allocated resource.
 */
function requireResource<T>(resource: T | null, name: string): T {
	if (!resource) {
		throw new Error(`Could not create the WebGL ${name}.`);
	}
	return resource;
}

/**
 * Resolves a required uniform location from a linked shader program.
 *
 * @param gl - WebGL2 context that owns the program.
 * @param program - Linked program containing the uniform.
 * @param name - GLSL uniform name to resolve.
 * @returns The resolved uniform location.
 */
function requireUniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
	const location = gl.getUniformLocation(program, name);
	if (!location) {
		throw new Error(`Could not find the ${name} shader uniform.`);
	}
	return location;
}

/**
 * Verifies that a numeric configuration value is a positive integer.
 *
 * @param value - Value to verify.
 * @param name - Parameter name used in the error message.
 */
function assertPositiveInteger(value: number, name: string): void {
	if (!Number.isInteger(value) || value <= 0) {
		throw new RangeError(`${name} must be a positive integer.`);
	}
}

/** Render hooks can leave pixel transfer state dirty. Establish tightly packed, top-to-bottom byte uploads. */
function preparePixelUpload(gl: WebGL2RenderingContext): void {
	gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
	gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
	gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
	gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, 0);
	gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, 0);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
}

function configureTexture(gl: WebGL2RenderingContext): void {
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/** Match normalized RGBA8 shader inputs, then prepare a fully backed std140 vec4 array. */
function preparePalette(bytes: Uint8Array): PreparedPalette {
	if (
		!(bytes instanceof Uint8Array) ||
		bytes.length === 0 ||
		bytes.length % 4 !== 0 ||
		bytes.length / 4 > PALETTE_CAPACITY
	) {
		throw new RangeError(`The palette must contain 1 to ${PALETTE_CAPACITY} RGBA8 entries.`);
	}
	const colors = new Float32Array(PALETTE_CAPACITY * 4);
	for (let offset = 0; offset < bytes.length; offset += 4) {
		const alpha = Math.fround(bytes[offset + 3] / 255);
		colors[offset] = Math.fround(bytes[offset] / 255) * alpha;
		colors[offset + 1] = Math.fround(bytes[offset + 1] / 255) * alpha;
		colors[offset + 2] = Math.fround(bytes[offset + 2] / 255) * alpha;
		colors[offset + 3] = alpha;
	}
	return { bytes: bytes.slice(), colors };
}
