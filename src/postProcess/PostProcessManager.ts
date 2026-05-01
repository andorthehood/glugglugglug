import createProgram from '../utils/createProgram';
import createShader from '../utils/createShader';
import { FULLSCREEN_QUAD_VERTEX_SHADER } from '../shaders/fullscreenQuadVertexShader';

import type { PostProcessEffect } from '../types/postProcess';

/**
 * Manages a single post-processing effect.
 */
export class PostProcessManager {
	private gl: WebGL2RenderingContext;
	private effect: PostProcessEffect | null = null;
	private program: WebGLProgram | null = null;
	private positionBuffer: WebGLBuffer;

	// Standard uniform locations for the active effect
	private timeLocation: WebGLUniformLocation | null = null;
	private resolutionLocation: WebGLUniformLocation | null = null;
	private textureLocation: WebGLUniformLocation | null = null;

	// Fallback rendering (simple texture passthrough)
	private fallbackProgram: WebGLProgram | null = null;
	private fallbackTextureLocation: WebGLUniformLocation | null = null;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;

		// Create position buffer for full-screen quad
		this.positionBuffer = this.gl.createBuffer()!;
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
		const quadVertices = new Float32Array([
			-1,
			-1, // bottom-left
			1,
			-1, // bottom-right
			-1,
			1, // top-left
			1,
			1, // top-right
		]);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);
	}

	/**
	 * Set the active post-process effect, replacing any previous one
	 */
	setEffect(effect: PostProcessEffect): void {
		// Clear previous effect if any
		this.clearEffect();

		// Compile shaders
		let vertexShader: WebGLShader | null = null;
		let fragmentShader: WebGLShader | null = null;

		try {
			vertexShader = createShader(this.gl, effect.vertexShader ?? FULLSCREEN_QUAD_VERTEX_SHADER, this.gl.VERTEX_SHADER);
			fragmentShader = createShader(this.gl, effect.fragmentShader, this.gl.FRAGMENT_SHADER);
			this.program = createProgram(this.gl, [fragmentShader, vertexShader]);

			// Delete shaders after successful linking to avoid GPU resource leaks
			this.gl.deleteShader(vertexShader);
			this.gl.deleteShader(fragmentShader);
		} catch (error) {
			// Clean up any shaders that were successfully created before the error
			if (vertexShader) this.gl.deleteShader(vertexShader);
			if (fragmentShader) this.gl.deleteShader(fragmentShader);
			throw error;
		}

		// Get standard uniform locations
		this.timeLocation = this.gl.getUniformLocation(this.program, 'u_time');
		this.resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
		this.textureLocation = this.gl.getUniformLocation(this.program, 'u_renderTexture');

		this.effect = effect;
	}

	/**
	 * Render the active effect, or fall back to passthrough when none is set
	 */
	render(renderTexture: WebGLTexture, elapsedTime: number, canvasWidth: number, canvasHeight: number): void {
		if (!this.effect || !this.program) {
			this.renderFallback(renderTexture);
			return;
		}

		// Bind full-screen quad
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

		// Use effect shader
		this.gl.useProgram(this.program);

		// Bind render texture
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, renderTexture);

		// Set standard uniforms
		if (this.timeLocation) this.gl.uniform1f(this.timeLocation, elapsedTime);
		if (this.resolutionLocation) this.gl.uniform2f(this.resolutionLocation, canvasWidth, canvasHeight);
		if (this.textureLocation) this.gl.uniform1i(this.textureLocation, 0);

		// Configure vertex attributes
		const a_position = this.gl.getAttribLocation(this.program, 'a_position');
		if (a_position !== -1) {
			this.gl.vertexAttribPointer(a_position, 2, this.gl.FLOAT, false, 0, 0);
			this.gl.enableVertexAttribArray(a_position);
		}

		// Render full-screen quad
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
	}

	/**
	 * Fallback rendering - simple texture passthrough when no effect is set
	 */
	private renderFallback(renderTexture: WebGLTexture): void {
		// Create simple passthrough shaders if not already created
		if (!this.fallbackProgram) {
			this.createFallbackShaders();
		}

		// Bind full-screen quad
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

		// Use fallback shader
		this.gl.useProgram(this.fallbackProgram!);

		// Bind render texture
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, renderTexture);

		// Set texture uniform
		if (this.fallbackTextureLocation) {
			this.gl.uniform1i(this.fallbackTextureLocation, 0);
		}

		// Configure vertex attributes
		const a_position = this.gl.getAttribLocation(this.fallbackProgram!, 'a_position');
		if (a_position !== -1) {
			this.gl.vertexAttribPointer(a_position, 2, this.gl.FLOAT, false, 0, 0);
			this.gl.enableVertexAttribArray(a_position);
		}

		// Render full-screen quad
		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
	}

	/**
	 * Create simple fallback shaders for texture passthrough
	 */
	private createFallbackShaders(): void {
		const fallbackFragmentShader = `#version 300 es
precision mediump float;
in vec2 v_screenCoord;
uniform sampler2D u_renderTexture;
out vec4 outColor;

void main() {
	outColor = texture(u_renderTexture, v_screenCoord);
}
`;

		// Compile fallback shaders
		let vertexShader: WebGLShader | null = null;
		let fragmentShader: WebGLShader | null = null;

		try {
			vertexShader = createShader(this.gl, FULLSCREEN_QUAD_VERTEX_SHADER, this.gl.VERTEX_SHADER);
			fragmentShader = createShader(this.gl, fallbackFragmentShader, this.gl.FRAGMENT_SHADER);
			this.fallbackProgram = createProgram(this.gl, [fragmentShader, vertexShader]);

			// Delete shaders after successful linking to avoid GPU resource leaks
			this.gl.deleteShader(vertexShader);
			this.gl.deleteShader(fragmentShader);
		} catch (error) {
			// Clean up any shaders that were successfully created before the error
			if (vertexShader) this.gl.deleteShader(vertexShader);
			if (fragmentShader) this.gl.deleteShader(fragmentShader);
			throw error;
		}

		// Get texture uniform location
		this.fallbackTextureLocation = this.gl.getUniformLocation(this.fallbackProgram, 'u_renderTexture');
	}

	/**
	 * Remove the active effect and free its GPU program
	 */
	clearEffect(): void {
		if (this.program) {
			this.gl.deleteProgram(this.program);
			this.program = null;
		}

		this.timeLocation = null;
		this.resolutionLocation = null;
		this.textureLocation = null;
		this.effect = null;
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		if (this.program) {
			this.gl.deleteProgram(this.program);
		}

		if (this.positionBuffer) {
			this.gl.deleteBuffer(this.positionBuffer);
		}
	}
}
