import { PostProcessManager } from '../../src/postProcess/PostProcessManager';
import { FULLSCREEN_QUAD_VERTEX_SHADER } from '../../src/shaders/fullscreenQuadVertexShader';
import type { PostProcessEffect } from '../../src/types/postProcess';

// Mock WebGL objects
const mockShader = {} as WebGLShader;
const mockProgram = {} as WebGLProgram;
const mockBuffer = {} as WebGLBuffer;
const mockUniformLocation = {} as WebGLUniformLocation;

// Mock WebGL2 context
const createMockGL = () => {
	const gl = {
		// Constants
		VERTEX_SHADER: 35633,
		FRAGMENT_SHADER: 35632,
		ARRAY_BUFFER: 34962,
		STATIC_DRAW: 35044,
		FLOAT: 5126,
		TRIANGLE_STRIP: 5,
		TEXTURE_2D: 3553,
		TEXTURE0: 33984,

		// Mock methods
		createShader: jest.fn(() => mockShader),
		shaderSource: jest.fn(),
		compileShader: jest.fn(),
		getShaderParameter: jest.fn(() => true),
		getShaderInfoLog: jest.fn(() => ''),
		deleteShader: jest.fn(),
		createProgram: jest.fn(() => mockProgram),
		attachShader: jest.fn(),
		linkProgram: jest.fn(),
		getProgramParameter: jest.fn(() => true),
		getProgramInfoLog: jest.fn(() => ''),
		deleteProgram: jest.fn(),
		getUniformLocation: jest.fn(() => mockUniformLocation),
		createBuffer: jest.fn(() => mockBuffer),
		bindBuffer: jest.fn(),
		bufferData: jest.fn(),
		deleteBuffer: jest.fn(),
		useProgram: jest.fn(),
		uniform1f: jest.fn(),
		uniform2f: jest.fn(),
		uniform1i: jest.fn(),
		getAttribLocation: jest.fn(() => 0),
		vertexAttribPointer: jest.fn(),
		enableVertexAttribArray: jest.fn(),
		drawArrays: jest.fn(),
		activeTexture: jest.fn(),
		bindTexture: jest.fn(),
		viewport: jest.fn(),
	} as unknown as WebGL2RenderingContext;

	return gl;
};

describe('PostProcessManager', () => {
	let gl: WebGL2RenderingContext;
	let manager: PostProcessManager;

	beforeEach(() => {
		gl = createMockGL();
		manager = new PostProcessManager(gl);
		// Clear mock call counts
		jest.clearAllMocks();
	});

	describe('effect management', () => {
		it('should accept an effect', () => {
			const effect: PostProcessEffect = {
				vertexShader: 'void main() {}',
				fragmentShader: 'void main() {}',
			};

			expect(() => manager.setEffect(effect)).not.toThrow();
		});

		it('should use built-in fullscreen vertex shader when vertexShader is omitted', () => {
			const effect: PostProcessEffect = {
				fragmentShader: 'void main() {}',
			};

			expect(() => manager.setEffect(effect)).not.toThrow();
			expect(gl.shaderSource).toHaveBeenNthCalledWith(1, mockShader, FULLSCREEN_QUAD_VERTEX_SHADER);
		});
	});
});
