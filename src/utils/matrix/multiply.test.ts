import { describe, expect, it } from "vitest";
import { multiply } from "./multiply";
import { scaling } from "./scaling";
import { translation } from "./translation";
import { formatMatrix } from "./testUtils";

describe("multiply", () => {
	it("multiplies two matrices in column-major order", () => {
		const a = translation(1, 2, 3);
		const b = scaling(2, 3, 4);

		expect(formatMatrix(multiply(a, b))).toMatchSnapshot();
		expect(formatMatrix(multiply(b, a))).toMatchSnapshot();
	});
});
