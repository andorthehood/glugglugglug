import { describe, expect, it } from "vitest";
import { translate } from "./translate";
import { scaling } from "./scaling";
import { formatMatrix } from "./testUtils";

describe("translate", () => {
	it("translates a matrix via the helper", () => {
		const base = scaling(1, 2, 3);

		const result = translate(base, 4, 5, 6);

		expect(result).toBe(base);
		expect(formatMatrix(result)).toMatchSnapshot();
	});

	it("writes into a provided destination", () => {
		const base = scaling(1, 2, 3);
		const dst = new Array<number>(16);
		const result = translate(base, 4, 5, 6, dst);

		expect(result).toBe(dst);
		expect(formatMatrix(dst)).toMatchSnapshot();
		expect(formatMatrix(base)).toEqual([
			[1, 0, 0, 0],
			[0, 2, 0, 0],
			[0, 0, 3, 0],
			[0, 0, 0, 1],
		]);
	});
});
