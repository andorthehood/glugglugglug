import { multiply } from "./multiply";
import { yRotation } from "./yRotation";

/**
 * Multiplies a matrix by a rotation around the y axis.
 * @param m Matrix to transform.
 * @param angleInRadians Rotation angle in radians.
 * @returns The transformed matrix.
 */
export function yRotate(m: number[], angleInRadians: number) {
	return multiply(m, yRotation(angleInRadians));
}
