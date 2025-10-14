import { multiply } from "./multiply";
import { scaling } from "./scaling";

export function scale(m: number[], sx: number, sy: number, sz: number) {
	return multiply(m, scaling(sx, sy, sz));
}
