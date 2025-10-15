/**
 * Produces a matrix representing rotation around the y axis.
 * @param angleInRadians The rotation angle in radians.
 * @param dst Destination matrix to write into. When omitted a new matrix is created.
 * @returns A rotation matrix that rotates around the y axis.
 */
export function yRotation(
	angleInRadians: number,
	dst: number[] = new Array(16),
) {
	const c = Math.cos(angleInRadians);
	const s = Math.sin(angleInRadians);

	dst[0] = c;
	dst[1] = 0;
	dst[2] = -s;
	dst[3] = 0;
	dst[4] = 0;
	dst[5] = 1;
	dst[6] = 0;
	dst[7] = 0;
	dst[8] = s;
	dst[9] = 0;
	dst[10] = c;
	dst[11] = 0;
	dst[12] = 0;
	dst[13] = 0;
	dst[14] = 0;
	dst[15] = 1;
	return dst;
}
