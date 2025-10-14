/**
 * Multiplies a vector by a 4x4 matrix using column-major order.
 * @param v Vector with four components.
 * @param m Matrix to multiply by.
 * @returns The transformed vector.
 */
export function vectorMultiply(v: number[], m: number[]) {
	const dst = [];
	for (let i = 0; i < 4; ++i) {
		dst[i] = 0.0;
		for (let j = 0; j < 4; ++j) {
			dst[i] += v[j] * m[j * 4 + i];
		}
	}
	return dst;
}
