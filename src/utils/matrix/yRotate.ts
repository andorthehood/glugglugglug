import { multiply } from "./multiply";
import { yRotation } from "./yRotation";

export function yRotate(m: number[], angleInRadians: number) {
	return multiply(m, yRotation(angleInRadians));
}
