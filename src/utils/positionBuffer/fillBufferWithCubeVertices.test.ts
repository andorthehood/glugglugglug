import { describe, it, expect } from "vitest";

import {
	fillBufferWithCubeVertices,
	CUBE_FLOAT_COUNT,
} from "./fillBufferWithCubeVertices";

function toArray(values: Float32Array) {
	return Array.from(values);
}

describe("fillBufferWithCubeVertices", () => {
	it("fills a buffer with cube vertices at the origin", () => {
		const buffer = new Float32Array(CUBE_FLOAT_COUNT);

		fillBufferWithCubeVertices(buffer, 0, 2);

		expect(toArray(buffer)).toMatchSnapshot();
	});

	it("fills a buffer with cube vertices using an offset and custom center", () => {
		const buffer = new Float32Array(CUBE_FLOAT_COUNT + 6);
		const offset = 6;

		fillBufferWithCubeVertices(buffer, offset, 3, [1, -2, 0.5]);

		expect(toArray(buffer.subarray(offset, offset + CUBE_FLOAT_COUNT))).toMatchSnapshot();
	});
});
