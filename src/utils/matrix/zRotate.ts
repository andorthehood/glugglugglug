import { multiply } from "./multiply";
import { zRotation } from "./zRotation";

/**
 * Multiplies a matrix by a rotation around the z axis.
 * @param m Matrix to transform.
 * @param angleInRadians Rotation angle in radians.
 * @param dst Destination matrix to write into. Defaults to mutating the supplied matrix.
 * @returns The transformed matrix.
 */
const rotationMatrix = new Array<number>(16);

export function zRotate(
	m: number[],
	angleInRadians: number,
	dst: number[] = m,
) {
	zRotation(angleInRadians, rotationMatrix);
	return multiply(m, rotationMatrix, dst);
}
