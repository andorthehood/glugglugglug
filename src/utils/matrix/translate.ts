import { multiply } from "./multiply";
import { translation } from "./translation";

/**
 * Multiplies a matrix by a translation transform.
 * @param m Matrix to transform.
 * @param tx Translation along the x axis.
 * @param ty Translation along the y axis.
 * @param tz Translation along the z axis.
 * @returns The transformed matrix.
 */
export function translate(m: number[], tx: number, ty: number, tz: number) {
	return multiply(m, translation(tx, ty, tz));
}
