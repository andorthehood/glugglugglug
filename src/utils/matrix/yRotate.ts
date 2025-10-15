import { multiply } from "./multiply";
import { yRotation } from "./yRotation";

/**
 * Multiplies a matrix by a rotation around the y axis.
 * @param m Matrix to transform.
 * @param angleInRadians Rotation angle in radians.
 * @param dst Destination matrix to write into. Defaults to mutating the supplied matrix.
 * @returns The transformed matrix.
 */
const rotationMatrix = new Array<number>(16);

export function yRotate(
	m: number[],
	angleInRadians: number,
	dst: number[] = m,
) {
	yRotation(angleInRadians, rotationMatrix);
	return multiply(m, rotationMatrix, dst);
}
