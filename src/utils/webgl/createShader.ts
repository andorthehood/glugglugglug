/**
 * Compiles a shader of the specified type from GLSL source.
 * @param gl WebGL rendering context used for compilation.
 * @param shaderSource GLSL source code for the shader.
 * @param shaderType Shader stage constant, e.g. `gl.VERTEX_SHADER`.
 * @returns The compiled shader object.
 */
const createShader = function (
	gl: WebGL2RenderingContext | WebGLRenderingContext,
	shaderSource: string,
	shaderType: number,
): WebGLShader {
	const shader = gl.createShader(shaderType);
	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader);
		console.error("Could not compile web gl shader", info);
	}

	return shader;
};

export default createShader;
