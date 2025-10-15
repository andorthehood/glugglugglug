/**
 * Produces a matrix representing rotation around the x axis.
 * @param angleInRadians The rotation angle in radians.
 * @param dst Destination matrix to write into. When omitted a new matrix is created.
 * @returns A rotation matrix that rotates around the x axis.
 */
export function xRotation(
	angleInRadians: number,
	dst: number[] = new Array(16),
) {
	const c = Math.cos(angleInRadians);
	const s = Math.sin(angleInRadians);

	dst[0] = 1;
	dst[1] = 0;
	dst[2] = 0;
	dst[3] = 0;
	dst[4] = 0;
	dst[5] = c;
	dst[6] = s;
	dst[7] = 0;
	dst[8] = 0;
	dst[9] = -s;
	dst[10] = c;
	dst[11] = 0;
	dst[12] = 0;
	dst[13] = 0;
	dst[14] = 0;
	dst[15] = 1;
	return dst;
}
