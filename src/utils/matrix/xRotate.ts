import { multiply } from "./multiply";
import { xRotation } from "./xRotation";

/**
 * Multiplies a matrix by a rotation around the x axis.
 * @param m Matrix to transform.
 * @param angleInRadians Rotation angle in radians.
 * @param dst Destination matrix to write into. Defaults to mutating the supplied matrix.
 * @returns The transformed matrix.
 */
const rotationMatrix = new Array<number>(16);

export function xRotate(
	m: number[],
	angleInRadians: number,
	dst: number[] = m,
) {
	xRotation(angleInRadians, rotationMatrix);
	return multiply(m, rotationMatrix, dst);
}
