/**
 * Creates a matrix that scales along each axis independently.
 * @param sx Scale factor along the x axis.
 * @param sy Scale factor along the y axis.
 * @param sz Scale factor along the z axis.
 * @returns A scaling matrix.
 */
export function scaling(sx: number, sy: number, sz: number) {
	return [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1];
}
