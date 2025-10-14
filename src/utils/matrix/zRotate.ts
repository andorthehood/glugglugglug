import { multiply } from "./multiply";
import { zRotation } from "./zRotation";

/**
 * Multiplies a matrix by a rotation around the z axis.
 * @param m Matrix to transform.
 * @param angleInRadians Rotation angle in radians.
 * @returns The transformed matrix.
 */
export function zRotate(m: number[], angleInRadians: number) {
	return multiply(m, zRotation(angleInRadians));
}
