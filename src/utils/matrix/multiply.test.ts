import { describe, expect, it } from "vitest";
import { multiply } from "./multiply";
import { scaling } from "./scaling";
import { translation } from "./translation";
import { formatMatrix } from "./testUtils";

describe("multiply", () => {
	it("multiplies two matrices in column-major order", () => {
		const a = translation(1, 2, 3);
		const b = scaling(2, 3, 4);
		const productAB = multiply(a, b);

		expect(productAB).toBe(a);
		expect(formatMatrix(productAB)).toMatchSnapshot();

		const c = scaling(2, 3, 4);
		const d = translation(1, 2, 3);
		const productBA = multiply(c, d);

		expect(productBA).toBe(c);
		expect(formatMatrix(productBA)).toMatchSnapshot();
	});

	it("writes into a provided destination without mutating inputs", () => {
		const a = translation(1, 2, 3);
		const b = scaling(2, 3, 4);
		const dst = new Array<number>(16);
		const result = multiply(a, b, dst);

		expect(result).toBe(dst);
		expect(formatMatrix(result)).toMatchSnapshot();
		expect(formatMatrix(a)).toEqual(formatMatrix(translation(1, 2, 3)));
	});
});
