/**
 * Creates a 4x4 matrix that translates by the supplied offsets.
 * @param tx Translation along the x axis.
 * @param ty Translation along the y axis.
 * @param tz Translation along the z axis.
 * @returns A translation matrix.
 */
export function translation(tx: number, ty: number, tz: number) {
	return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1];
}
