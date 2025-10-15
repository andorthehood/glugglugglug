/**
 * Creates a matrix that scales along each axis independently.
 * @param sx Scale factor along the x axis.
 * @param sy Scale factor along the y axis.
 * @param sz Scale factor along the z axis.
 * @param dst Destination matrix to write into. When omitted a new matrix is created.
 * @returns A scaling matrix.
 */
export function scaling(
	sx: number,
	sy: number,
	sz: number,
	dst: number[] = new Array(16),
) {
	dst[0] = sx;
	dst[1] = 0;
	dst[2] = 0;
	dst[3] = 0;
	dst[4] = 0;
	dst[5] = sy;
	dst[6] = 0;
	dst[7] = 0;
	dst[8] = 0;
	dst[9] = 0;
	dst[10] = sz;
	dst[11] = 0;
	dst[12] = 0;
	dst[13] = 0;
	dst[14] = 0;
	dst[15] = 1;
	return dst;
}
