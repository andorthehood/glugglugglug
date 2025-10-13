import { describe, it, expect } from "vitest";

import { VERTICES_PER_QUAD } from "./constants";
import { fillBufferWithQuadIndices } from "./fillBufferWithQuadIndices";

function toArray(values: Uint8Array) {
	return Array.from(values);
}

describe("fillBufferWithQuadIndices", () => {
	it("fills a buffer segment with the same quad index", () => {
		const buffer = new Uint8Array(VERTICES_PER_QUAD);

		fillBufferWithQuadIndices(buffer, 2, 0);

		expect(toArray(buffer)).toMatchSnapshot();
	});

	it("respects the provided offset", () => {
		const buffer = new Uint8Array(VERTICES_PER_QUAD * 2);

		fillBufferWithQuadIndices(buffer, 5, VERTICES_PER_QUAD);

		expect(toArray(buffer)).toMatchSnapshot();
	});
});
