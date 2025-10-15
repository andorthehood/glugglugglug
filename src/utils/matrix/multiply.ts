/**
 * Multiplies two 4x4 matrices using column-major order.
 * @param a Left-hand operand.
 * @param b Right-hand operand.
 * @param dst Destination matrix to write into. Defaults to mutating the left-hand operand.
 * @returns The resulting matrix `a * b`.
 */
export function multiply(a: number[], b: number[], dst: number[] = a) {
	const a00 = a[0 * 4 + 0];
	const a01 = a[0 * 4 + 1];
	const a02 = a[0 * 4 + 2];
	const a03 = a[0 * 4 + 3];
	const a10 = a[1 * 4 + 0];
	const a11 = a[1 * 4 + 1];
	const a12 = a[1 * 4 + 2];
	const a13 = a[1 * 4 + 3];
	const a20 = a[2 * 4 + 0];
	const a21 = a[2 * 4 + 1];
	const a22 = a[2 * 4 + 2];
	const a23 = a[2 * 4 + 3];
	const a30 = a[3 * 4 + 0];
	const a31 = a[3 * 4 + 1];
	const a32 = a[3 * 4 + 2];
	const a33 = a[3 * 4 + 3];
	const b00 = b[0 * 4 + 0];
	const b01 = b[0 * 4 + 1];
	const b02 = b[0 * 4 + 2];
	const b03 = b[0 * 4 + 3];
	const b10 = b[1 * 4 + 0];
	const b11 = b[1 * 4 + 1];
	const b12 = b[1 * 4 + 2];
	const b13 = b[1 * 4 + 3];
	const b20 = b[2 * 4 + 0];
	const b21 = b[2 * 4 + 1];
	const b22 = b[2 * 4 + 2];
	const b23 = b[2 * 4 + 3];
	const b30 = b[3 * 4 + 0];
	const b31 = b[3 * 4 + 1];
	const b32 = b[3 * 4 + 2];
	const b33 = b[3 * 4 + 3];
	dst[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
	dst[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
	dst[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
	dst[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
	dst[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
	dst[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
	dst[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
	dst[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
	dst[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
	dst[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
	dst[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
	dst[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
	dst[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
	dst[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
	dst[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
	dst[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
	return dst;
}
