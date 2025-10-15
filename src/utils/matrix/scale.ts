import { multiply } from "./multiply";
import { scaling } from "./scaling";

/**
 * Multiplies a matrix by a scaling transform.
 * @param m Matrix to transform.
 * @param sx Scale factor along the x axis.
 * @param sy Scale factor along the y axis.
 * @param sz Scale factor along the z axis.
 * @param dst Destination matrix to write into. Defaults to mutating the supplied matrix.
 * @returns The transformed matrix.
 */
const scalingMatrix = new Array<number>(16);

export function scale(
	m: number[],
	sx: number,
	sy: number,
	sz: number,
	dst: number[] = m,
) {
	scaling(sx, sy, sz, scalingMatrix);
	return multiply(m, scalingMatrix, dst);
}
