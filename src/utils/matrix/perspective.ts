/**
 * Builds a perspective projection matrix in column-major order.
 * @param fieldOfViewInRadians Vertical field of view in radians.
 * @param aspect Ratio of viewport width to height.
 * @param near Distance to the near clipping plane.
 * @param far Distance to the far clipping plane.
 * @returns A 4x4 perspective projection matrix.
 */
export function perspective(
	fieldOfViewInRadians: number,
	aspect: number,
	near: number,
	far: number,
) {
	const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
	const rangeInv = 1.0 / (near - far);

	return [
		f / aspect,
		0,
		0,
		0,
		0,
		f,
		0,
		0,
		0,
		0,
		(near + far) * rangeInv,
		-1,
		0,
		0,
		near * far * rangeInv * 2,
		0,
	];
}
