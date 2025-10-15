/**
 * Creates a 4x4 matrix that translates by the supplied offsets.
 * @param tx Translation along the x axis.
 * @param ty Translation along the y axis.
 * @param tz Translation along the z axis.
 * @param dst Destination matrix to write into. When omitted a new matrix is created.
 * @returns A translation matrix.
 */
export function translation(
	tx: number,
	ty: number,
	tz: number,
	dst: number[] = new Array(16),
) {
	dst[0] = 1;
	dst[1] = 0;
	dst[2] = 0;
	dst[3] = 0;
	dst[4] = 0;
	dst[5] = 1;
	dst[6] = 0;
	dst[7] = 0;
	dst[8] = 0;
	dst[9] = 0;
	dst[10] = 1;
	dst[11] = 0;
	dst[12] = tx;
	dst[13] = ty;
	dst[14] = tz;
	dst[15] = 1;
	return dst;
}
