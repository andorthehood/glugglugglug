/**
 * Links a WebGL program from compiled shader objects.
 * @param gl WebGL rendering context used for linking.
 * @param shaders Collection of compiled shaders to attach.
 * @returns The linked program, or `null` if linking fails.
 */
const createProgram = function (
	gl: WebGL2RenderingContext | WebGLRenderingContext,
	shaders: WebGLShader[],
): WebGLProgram {
	const program = gl.createProgram();

	shaders.forEach((shader) => {
		console.log(shader);
		gl.attachShader(program, shader);
	});

	gl.linkProgram(program);

	const linked = gl.getProgramParameter(program, gl.LINK_STATUS);

	if (!linked) {
		const lastError = gl.getProgramInfoLog(program);
		console.error("Error in program linking: " + lastError);
		gl.deleteProgram(program);
		return null;
	}

	return program;
};

export default createProgram;
