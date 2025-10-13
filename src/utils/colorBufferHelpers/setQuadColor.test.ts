import { describe, it, expect } from "vitest";

import { COLOR_COMPONENTS_PER_QUAD } from "./constants";
import { setQuadColor } from "./setQuadColor";

function toArray(values: Float32Array) {
	return Array.from(values);
}

describe("setQuadColor", () => {
	it("normalizes 0-255 components to 0-1 and writes them to the palette", () => {
		const palette = new Float32Array(COLOR_COMPONENTS_PER_QUAD * 2);

		setQuadColor(palette, 0, 255, 0, 128);

		expect(toArray(palette)).toMatchSnapshot();
	});

	it("updates colors at the specified quad index", () => {
		const palette = new Float32Array(COLOR_COMPONENTS_PER_QUAD * 3);

		setQuadColor(palette, 1, 10, 20, 30);

		expect(toArray(palette)).toMatchSnapshot();
	});
});
