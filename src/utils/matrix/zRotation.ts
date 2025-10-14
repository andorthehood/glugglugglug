/**
 * Produces a matrix representing rotation around the z axis.
 * @param angleInRadians The rotation angle in radians.
 * @returns A rotation matrix that rotates around the z axis.
 */
export function zRotation(angleInRadians: number) {
	const c = Math.cos(angleInRadians);
	const s = Math.sin(angleInRadians);

	return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
