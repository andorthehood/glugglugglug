import { COLOR_COMPONENTS_PER_QUAD } from "./constants";

/**
 * Writes a quad's color into a palette array, normalizing 0-255 inputs to 0-1.
 * @param palette Destination Float32Array storing quad colors.
 * @param quadIndex Index of the quad whose color should be updated.
 * @param r Red component (0-255).
 * @param g Green component (0-255).
 * @param b Blue component (0-255).
 */
export function setQuadColor(
	palette: Float32Array,
	quadIndex: number,
	r: number,
	g: number,
	b: number,
): void {
	const base = quadIndex * COLOR_COMPONENTS_PER_QUAD;
	palette[base + 0] = r / 255;
	palette[base + 1] = g / 255;
	palette[base + 2] = b / 255;
}
