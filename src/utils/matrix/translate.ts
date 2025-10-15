import { multiply } from "./multiply";
import { translation } from "./translation";

/**
 * Multiplies a matrix by a translation transform.
 * @param m Matrix to transform.
 * @param tx Translation along the x axis.
 * @param ty Translation along the y axis.
 * @param tz Translation along the z axis.
 * @param dst Destination matrix to write into. Defaults to mutating the supplied matrix.
 * @returns The transformed matrix.
 */
const translationMatrix = new Array<number>(16);

export function translate(
	m: number[],
	tx: number,
	ty: number,
	tz: number,
	dst: number[] = m,
) {
	translation(tx, ty, tz, translationMatrix);
	return multiply(m, translationMatrix, dst);
}
