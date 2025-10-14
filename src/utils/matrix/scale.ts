import { multiply } from "./multiply";
import { scaling } from "./scaling";

/**
 * Multiplies a matrix by a scaling transform.
 * @param m Matrix to transform.
 * @param sx Scale factor along the x axis.
 * @param sy Scale factor along the y axis.
 * @param sz Scale factor along the z axis.
 * @returns The transformed matrix.
 */
export function scale(m: number[], sx: number, sy: number, sz: number) {
	return multiply(m, scaling(sx, sy, sz));
}
