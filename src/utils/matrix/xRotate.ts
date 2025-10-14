import { multiply } from "./multiply";
import { xRotation } from "./xRotation";

/**
 * Multiplies a matrix by a rotation around the x axis.
 * @param m Matrix to transform.
 * @param angleInRadians Rotation angle in radians.
 * @returns The transformed matrix.
 */
export function xRotate(m: number[], angleInRadians: number) {
	return multiply(m, xRotation(angleInRadians));
}
