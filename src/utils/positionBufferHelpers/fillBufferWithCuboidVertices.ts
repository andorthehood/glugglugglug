const CUBOID_VERTEX_COUNT = 36;
const COMPONENTS_PER_VERTEX = 3;
const CUBOID_FLOAT_COUNT = CUBOID_VERTEX_COUNT * COMPONENTS_PER_VERTEX;

/**
 * Fills a vertex buffer with vertices of the specified rectangular cuboid.
 * @param buffer Destination Float32Array that stores position data.
 * @param offset Starting index (not byte offset) within the buffer.
 * @param width Length along the X axis.
 * @param height Length along the Y axis.
 * @param depth Length along the Z axis.
 * @param center Optional cuboid center coordinates; defaults to the origin.
 */
export function fillBufferWithCuboidVertices(
	buffer: Float32Array,
	offset: number,
	width: number,
	height: number,
	depth: number,
	center: [number, number, number] = [0, 0, 0],
): void {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const halfDepth = depth / 2;

	const [cx, cy, cz] = center;

	const x1 = cx - halfWidth;
	const x2 = cx + halfWidth;
	const y1 = cy - halfHeight;
	const y2 = cy + halfHeight;
	const z1 = cz - halfDepth;
	const z2 = cz + halfDepth;

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

export { CUBOID_VERTEX_COUNT, CUBOID_FLOAT_COUNT };
