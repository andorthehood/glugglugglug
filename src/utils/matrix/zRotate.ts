import { multiply } from "./multiply";
import { zRotation } from "./zRotation";

export function zRotate(m: number[], angleInRadians: number) {
	return multiply(m, zRotation(angleInRadians));
}
