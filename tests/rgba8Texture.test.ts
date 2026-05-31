import { Engine } from '../src/engine';
import { CachedRenderer } from '../src/CachedRenderer';
import { Renderer } from '../src/renderer';

const mockCanvas = {
	width: 800,
	height: 600,
	getContext: jest.fn(),
} as unknown as HTMLCanvasElement;

let textureId = 0;

function createMockTexture(): WebGLTexture {
	textureId++;
	return { textureId } as unknown as WebGLTexture;
}

const mockGL = {
	RGBA: 6408,
	RGBA8: 32856,
	UNSIGNED_BYTE: 5121,
	TEXTURE_2D: 3553,
	LINEAR: 9729,
	NEAREST: 9728,
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
	TRIANGLE_STRIP: 5,
	ONE: 1,
	ONE_MINUS_SRC_ALPHA: 771,
	BLEND: 3042,
	FRAGMENT_SHADER: 35632,
	VERTEX_SHADER: 35633,
	UNPACK_ALIGNMENT: 3317,

	canvas: mockCanvas,
	createTexture: jest.fn(createMockTexture),
	bindTexture: jest.fn(),
	texImage2D: jest.fn(),
	texSubImage2D: jest.fn(),
	texParameteri: jest.fn(),
	pixelStorei: jest.fn(),
	createFramebuffer: jest.fn(() => ({}) as WebGLFramebuffer),
	bindFramebuffer: jest.fn(),
	framebufferTexture2D: jest.fn(),
	checkFramebufferStatus: jest.fn(() => 36053),
	deleteTexture: jest.fn(),
	deleteFramebuffer: jest.fn(),
	viewport: jest.fn(),
	clear: jest.fn(),
	activeTexture: jest.fn(),
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
	deleteShader: jest.fn(),
	deleteProgram: jest.fn(),
	deleteBuffer: jest.fn(),
} as unknown as WebGL2RenderingContext;

(mockCanvas.getContext as jest.Mock).mockReturnValue(mockGL);

describe('RGBA8 texture uploads', () => {
	beforeEach(() => {
		textureId = 0;
		jest.clearAllMocks();
	});

	it('uploads new RGBA8 texture data', () => {
		const renderer = new Renderer(mockCanvas);
		const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
		jest.clearAllMocks();

		const texture = renderer.uploadRgba8Texture(data, 2, 1);

		expect(texture).toEqual({
			texture: expect.any(Object),
			width: 2,
			height: 1,
			filter: 'nearest',
		});
		expect(mockGL.pixelStorei).toHaveBeenCalledWith(mockGL.UNPACK_ALIGNMENT, 4);
		expect(mockGL.texParameteri).toHaveBeenCalledWith(mockGL.TEXTURE_2D, mockGL.TEXTURE_MIN_FILTER, mockGL.NEAREST);
		expect(mockGL.texParameteri).toHaveBeenCalledWith(mockGL.TEXTURE_2D, mockGL.TEXTURE_MAG_FILTER, mockGL.NEAREST);
		expect(mockGL.texImage2D).toHaveBeenCalledWith(
			mockGL.TEXTURE_2D,
			0,
			mockGL.RGBA8,
			2,
			1,
			0,
			mockGL.RGBA,
			mockGL.UNSIGNED_BYTE,
			data
		);
		expect(mockGL.texSubImage2D).not.toHaveBeenCalled();
	});

	it('updates an existing same-sized texture with texSubImage2D', () => {
		const renderer = new Renderer(mockCanvas);
		const first = renderer.uploadRgba8Texture(new Uint8Array(8), 2, 1);
		const nextData = new Uint8Array(8).fill(128);
		jest.clearAllMocks();

		const second = renderer.uploadRgba8Texture(nextData, 2, 1, { texture: first });

		expect(second).toBe(first);
		expect(mockGL.texImage2D).not.toHaveBeenCalled();
		expect(mockGL.texSubImage2D).toHaveBeenCalledWith(
			mockGL.TEXTURE_2D,
			0,
			0,
			0,
			2,
			1,
			mockGL.RGBA,
			mockGL.UNSIGNED_BYTE,
			nextData
		);
	});

	it('reallocates an existing texture when dimensions change', () => {
		const renderer = new Renderer(mockCanvas);
		const first = renderer.uploadRgba8Texture(new Uint8Array(8), 2, 1);
		const webGlTexture = first.texture;
		const nextData = new Uint8Array(12);
		jest.clearAllMocks();

		const second = renderer.uploadRgba8Texture(nextData, 3, 1, { texture: first });

		expect(second).toBe(first);
		expect(second.texture).toBe(webGlTexture);
		expect(second.width).toBe(3);
		expect(mockGL.texImage2D).toHaveBeenCalledWith(
			mockGL.TEXTURE_2D,
			0,
			mockGL.RGBA8,
			3,
			1,
			0,
			mockGL.RGBA,
			mockGL.UNSIGNED_BYTE,
			nextData
		);
		expect(mockGL.texSubImage2D).not.toHaveBeenCalled();
	});

	it('preserves draw order between sprites and uploaded textures', () => {
		const renderer = new Renderer(mockCanvas);
		renderer.loadSpriteSheet({ width: 16, height: 16 } as HTMLCanvasElement);
		const texture = renderer.uploadRgba8Texture(new Uint8Array(4), 1, 1);
		jest.clearAllMocks();

		renderer.drawSpriteFromCoordinates(0, 0, 8, 8, 0, 0, 8, 8);
		renderer.drawTexture(texture, 8, 0, 8, 8);
		renderer.drawSpriteFromCoordinates(16, 0, 8, 8, 0, 0, 8, 8);
		renderer.renderWithPostProcessing(0);

		const triangleDraws = (mockGL.drawArrays as jest.Mock).mock.calls.filter(([mode]) => mode === mockGL.TRIANGLES);
		expect(triangleDraws.slice(0, 3)).toEqual([
			[mockGL.TRIANGLES, 0, 6],
			[mockGL.TRIANGLES, 6, 6],
			[mockGL.TRIANGLES, 12, 6],
		]);
	});

	it('preserves existing draw order when a cache group is captured mid-frame', () => {
		const renderer = new CachedRenderer(mockCanvas);
		renderer.loadSpriteSheet({ width: 16, height: 16 } as HTMLCanvasElement);
		const texture = renderer.uploadRgba8Texture(new Uint8Array(4), 1, 1);
		jest.clearAllMocks();

		renderer.drawSpriteFromCoordinates(0, 0, 8, 8, 0, 0, 8, 8);
		renderer.cacheGroup('captured', 8, 8, () => {
			renderer.drawSpriteFromCoordinates(0, 0, 8, 8, 0, 0, 8, 8);
		});
		const cached = renderer.getCachedData('captured');
		if (!cached) {
			throw new Error('Expected cached texture data');
		}
		jest.clearAllMocks();

		renderer.drawCachedTexture(cached.texture, cached.width, cached.height, 8, 0);
		renderer.drawTexture(texture, 16, 0, 8, 8);
		renderer.renderWithPostProcessing(0);

		const triangleDraws = (mockGL.drawArrays as jest.Mock).mock.calls.filter(([mode]) => mode === mockGL.TRIANGLES);
		expect(triangleDraws.slice(0, 3)).toEqual([
			[mockGL.TRIANGLES, 0, 6],
			[mockGL.TRIANGLES, 6, 6],
			[mockGL.TRIANGLES, 12, 6],
		]);
	});

	it('exposes texture upload and draw helpers on Engine', () => {
		const engine = new Engine(mockCanvas);

		expect(typeof engine.uploadRgba8Texture).toBe('function');
		expect(typeof engine.drawTexture).toBe('function');
		expect(typeof engine.deleteTexture).toBe('function');
	});
});
