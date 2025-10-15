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

	it("writes into an existing matrix", () => {
		const dst = new Array<number>(16);
		const result = translation(1, 2, 3, dst);

		expect(result).toBe(dst);
		expect(formatMatrix(dst)).toEqual([
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[1, 2, 3, 1],
		]);
	});
});
