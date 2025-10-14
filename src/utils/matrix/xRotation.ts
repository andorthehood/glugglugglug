/**
 * Produces a matrix representing rotation around the x axis.
 * @param angleInRadians The rotation angle in radians.
 * @returns A rotation matrix that rotates around the x axis.
 */
export function xRotation(angleInRadians: number) {
	const c = Math.cos(angleInRadians);
	const s = Math.sin(angleInRadians);

	return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}
