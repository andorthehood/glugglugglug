import createProgram from '../utils/createProgram';
import createShader from '../utils/createShader';
import { FULLSCREEN_QUAD_VERTEX_SHADER } from '../shaders/fullscreenQuadVertexShader';

import type { BackgroundEffect } from '../types/background';

/**
 * Manages a single background effect.
 * Renders a full-screen quad before sprites; does nothing when no effect is set.
 */
export class BackgroundEffectManager {
	private gl: WebGL2RenderingContext;
	private effect: BackgroundEffect | null = null;
	private program: WebGLProgram | null = null;
	private positionBuffer: WebGLBuffer | null;

	// Standard uniform locations for the active effect
	private timeLocation: WebGLUniformLocation | null = null;
	private resolutionLocation: WebGLUniformLocation | null = null;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;

		// Create position buffer for full-screen quad
		this.positionBuffer = this.gl.createBuffer();
		if (!this.positionBuffer) {
			throw new Error('Failed to create WebGL buffer for background effect');
		}
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
	 * Set the active background effect, replacing any previous one
	 */
	setEffect(effect: BackgroundEffect): void {
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

		this.effect = effect;
	}

	/**
	 * Render the active background effect. Does nothing when no effect is set —
	 * the framebuffer clear color serves as the background in that case.
	 * @returns true if an effect was rendered, false otherwise
	 */
	render(elapsedTime: number, canvasWidth: number, canvasHeight: number): boolean {
		if (!this.effect || !this.program || !this.positionBuffer) {
			return false;
		}

		const gl = this.gl;
		const program = this.program;

		// Save current blend state and disable blending for fullscreen background pass
		const blendEnabled = gl.isEnabled(gl.BLEND);
		if (blendEnabled) {
			gl.disable(gl.BLEND);
		}

		// Bind full-screen quad
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

		// Use effect shader
		gl.useProgram(program);

		// Set standard uniforms
		if (this.timeLocation) gl.uniform1f(this.timeLocation, elapsedTime);
		if (this.resolutionLocation) gl.uniform2f(this.resolutionLocation, canvasWidth, canvasHeight);

		// Configure vertex attributes
		const a_position = gl.getAttribLocation(program, 'a_position');
		if (a_position !== -1) {
			gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(a_position);
		}

		// Render full-screen quad
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		// Restore blend state
		if (blendEnabled) {
			gl.enable(gl.BLEND);
		}

		return true;
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
		this.effect = null;
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		// Clear the active effect and associated program/uniform state
		this.clearEffect();

		// Delete and null out shared geometry buffer; make dispose idempotent
		if (this.positionBuffer) {
			this.gl.deleteBuffer(this.positionBuffer);
			this.positionBuffer = null;
		}
	}
}
