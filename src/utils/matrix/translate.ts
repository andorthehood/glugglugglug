import { multiply } from "./multiply";
import { translation } from "./translation";

export function translate(m: number[], tx: number, ty: number, tz: number) {
	return multiply(m, translation(tx, ty, tz));
}
