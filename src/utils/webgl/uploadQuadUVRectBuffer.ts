import { expandQuadUVRects } from "../textureBufferHelpers";

/**
 * Uploads UV rectangle data to an attribute buffer, expanding per-quad data to per-vertex data.
 * @param gl WebGL rendering context used for the upload.
 * @param buffer Target buffer object for the attribute data.
 * @param quadUVRects UV rectangle data stored per quad.
 * @param quadCount Number of quads represented in the data.
 */
export function uploadQuadUVRectBuffer(
	gl: WebGLRenderingContext,
	buffer: WebGLBuffer,
	quadUVRects: Float32Array,
	quadCount: number,
): void {
	const expanded = expandQuadUVRects(quadUVRects, quadCount);
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, expanded, gl.DYNAMIC_DRAW);
}
