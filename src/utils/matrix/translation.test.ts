import { describe, expect, it } from "vitest";
import { translation } from "./translation";
import { formatMatrix } from "./testUtils";

describe("translation", () => {
	it("creates a translation matrix", () => {
		expect(formatMatrix(translation(1, 2, 3))).toEqual([
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[1, 2, 3, 1],
		]);
	});
});
