import { describe, expect, it } from "vitest";
import { scaling } from "./scaling";
import { formatMatrix } from "./testUtils";

describe("scaling", () => {
	it("creates a scaling matrix", () => {
		expect(formatMatrix(scaling(2, 3, 4))).toEqual([
			[2, 0, 0, 0],
			[0, 3, 0, 0],
			[0, 0, 4, 0],
			[0, 0, 0, 1],
		]);
	});
});
