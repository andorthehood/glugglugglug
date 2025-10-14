import { VERTICES_PER_QUAD } from "./positionBuffer";

export const TEX_COORD_COMPONENTS_PER_VERTEX = 2;
export const UV_COMPONENTS_PER_QUAD = 4;
export const UV_RECT_COMPONENTS_PER_VERTEX = 4;

export function setQuadUVRect(
	target: Float32Array,
	quadIndex: number,
	uMin: number,
	vMin: number,
	width: number,
	height: number,
): void {
	const offset = quadIndex * UV_COMPONENTS_PER_QUAD;
	target[offset + 0] = uMin;
	target[offset + 1] = vMin;
	target[offset + 2] = width;
	target[offset + 3] = height;
}

export function expandQuadUVRects(
	quadUVRects: Float32Array,
	quadCount: number,
): Float32Array {
	const expanded = new Float32Array(
		quadCount * VERTICES_PER_QUAD * UV_RECT_COMPONENTS_PER_VERTEX,
	);

	for (let quad = 0; quad < quadCount; quad += 1) {
		const rectOffset = quad * UV_COMPONENTS_PER_QUAD;
		const u = quadUVRects[rectOffset + 0];
		const v = quadUVRects[rectOffset + 1];
		const width = quadUVRects[rectOffset + 2];
		const height = quadUVRects[rectOffset + 3];

		for (let vertex = 0; vertex < VERTICES_PER_QUAD; vertex += 1) {
			const vertexOffset = quad * VERTICES_PER_QUAD * UV_RECT_COMPONENTS_PER_VERTEX + vertex * UV_RECT_COMPONENTS_PER_VERTEX;
			expanded[vertexOffset + 0] = u;
			expanded[vertexOffset + 1] = v;
			expanded[vertexOffset + 2] = width;
			expanded[vertexOffset + 3] = height;
		}
	}

	return expanded;
}
