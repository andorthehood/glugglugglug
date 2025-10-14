import { multiply } from "./multiply";
import { xRotation } from "./xRotation";

export function xRotate(m: number[], angleInRadians: number) {
	return multiply(m, xRotation(angleInRadians));
}
