/**
 * Builds an orthographic projection matrix that maps the unit cube to clip space.
 * @param width Scene width.
 * @param height Scene height (positive values map upward).
 * @param depth Depth of the viewing volume.
 * @returns A 4x4 orthographic projection matrix.
 */
export function projection(width: number, height: number, depth: number) {
	return [
		2 / width,
		0,
		0,
		0,
		0,
		-2 / height,
		0,
		0,
		0,
		0,
		2 / depth,
		0,
		-1,
		1,
		0,
		1,
	];
}
