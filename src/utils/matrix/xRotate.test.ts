import { describe, expect, it } from "vitest";
import { multiply } from "./multiply";
import { translation } from "./translation";
import { xRotate } from "./xRotate";
import { xRotation } from "./xRotation";
import { formatMatrix } from "./testUtils";

describe("xRotate", () => {
	it("applies a rotation matrix around the x axis", () => {
		const base = translation(5, -3, 2);
		const original = base.slice();
		const angle = Math.PI / 6;

		const result = xRotate(base, angle);
		const expected = multiply(original, xRotation(angle));

		expect(result).toBe(base);
		expect(formatMatrix(result)).toEqual(formatMatrix(expected));
	});

	it("supports writing into a separate destination", () => {
		const base = translation(5, -3, 2);
		const angle = Math.PI / 6;
		const dst = new Array<number>(16);

		const result = xRotate(base, angle, dst);
		const expected = multiply(translation(5, -3, 2), xRotation(angle));

		expect(result).toBe(dst);
		expect(formatMatrix(result)).toEqual(formatMatrix(expected));
		expect(formatMatrix(base)).toEqual(formatMatrix(translation(5, -3, 2)));
	});
});
