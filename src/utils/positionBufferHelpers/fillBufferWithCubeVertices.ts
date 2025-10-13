const CUBE_VERTEX_COUNT = 36;
const COMPONENTS_PER_VERTEX = 3;
const CUBE_FLOAT_COUNT = CUBE_VERTEX_COUNT * COMPONENTS_PER_VERTEX;

/**
 * Fills a vertex buffer with vertices of the specified cube.
 * @param buffer Destination Float32Array that stores position data.
 * @param offset Starting index (not byte offset) within the buffer.
 * @param size Edge length of the cube.
 * @param center Optional cube center coordinates; defaults to the origin.
 */
export function fillBufferWithCubeVertices(
	buffer: Float32Array,
	offset: number,
	size: number,
	center: [number, number, number] = [0, 0, 0],
): void {
	const half = size / 2;
	const [cx, cy, cz] = center;

	const x1 = cx - half;
	const x2 = cx + half;
	const y1 = cy - half;
	const y2 = cy + half;
	const z1 = cz - half;
	const z2 = cz + half;

	const vertices = [
		// front
		x1, y1, z2,
		x2, y1, z2,
		x1, y2, z2,
		x1, y2, z2,
		x2, y1, z2,
		x2, y2, z2,

		// back
		x1, y1, z1,
		x1, y2, z1,
		x2, y1, z1,
		x1, y2, z1,
		x2, y2, z1,
		x2, y1, z1,

		// left
		x1, y1, z1,
		x1, y1, z2,
		x1, y2, z1,
		x1, y2, z1,
		x1, y1, z2,
		x1, y2, z2,

		// right
		x2, y1, z1,
		x2, y2, z1,
		x2, y1, z2,
		x2, y2, z1,
		x2, y2, z2,
		x2, y1, z2,

		// top
		x1, y2, z1,
		x1, y2, z2,
		x2, y2, z1,
		x1, y2, z2,
		x2, y2, z2,
		x2, y2, z1,

		// bottom
		x1, y1, z1,
		x2, y1, z1,
		x1, y1, z2,
		x1, y1, z2,
		x2, y1, z1,
		x2, y1, z2,
	];

	buffer.set(vertices, offset);
}

export { CUBE_VERTEX_COUNT, CUBE_FLOAT_COUNT };
