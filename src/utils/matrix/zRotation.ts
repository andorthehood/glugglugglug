/**
 * Produces a matrix representing rotation around the z axis.
 * @param angleInRadians The rotation angle in radians.
 * @param dst Destination matrix to write into. When omitted a new matrix is created.
 * @returns A rotation matrix that rotates around the z axis.
 */
export function zRotation(
	angleInRadians: number,
	dst: number[] = new Array(16),
) {
	const c = Math.cos(angleInRadians);
	const s = Math.sin(angleInRadians);

	dst[0] = c;
	dst[1] = s;
	dst[2] = 0;
	dst[3] = 0;
	dst[4] = -s;
	dst[5] = c;
	dst[6] = 0;
	dst[7] = 0;
	dst[8] = 0;
	dst[9] = 0;
	dst[10] = 1;
	dst[11] = 0;
	dst[12] = 0;
	dst[13] = 0;
	dst[14] = 0;
	dst[15] = 1;
	return dst;
}
