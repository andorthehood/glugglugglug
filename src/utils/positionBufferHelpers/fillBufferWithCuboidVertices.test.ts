import { describe, it, expect } from "vitest";

import {
	fillBufferWithCuboidVertices,
	CUBOID_FLOAT_COUNT,
} from "./fillBufferWithCuboidVertices";

function toArray(values: Float32Array) {
	return Array.from(values);
}

describe("fillBufferWithCuboidVertices", () => {
	it("fills a buffer with cuboid vertices at the origin", () => {
		const buffer = new Float32Array(CUBOID_FLOAT_COUNT);

		fillBufferWithCuboidVertices(buffer, 0, 2, 4, 6);

		expect(toArray(buffer)).toMatchSnapshot();
	});

	it("fills a buffer with cuboid vertices using an offset and custom center", () => {
		const buffer = new Float32Array(CUBOID_FLOAT_COUNT + 3);
		const offset = 3;

		fillBufferWithCuboidVertices(buffer, offset, 1.5, 2.5, 3.5, [-1, 0.5, 2]);

		expect(toArray(buffer.subarray(offset, offset + CUBOID_FLOAT_COUNT))).toMatchSnapshot();
	});
});
