import { describe, expect, it } from "vitest";
import { multiply } from "./multiply";
import { translation } from "./translation";
import { yRotate } from "./yRotate";
import { yRotation } from "./yRotation";
import { formatMatrix } from "./testUtils";

describe("yRotate", () => {
	it("applies a rotation matrix around the y axis", () => {
		const base = translation(5, -3, 2);
		const original = base.slice();
		const angle = Math.PI / 5;

		const result = yRotate(base, angle);
		const expected = multiply(original, yRotation(angle));

		expect(result).toBe(base);
		expect(formatMatrix(result)).toEqual(formatMatrix(expected));
	});

	it("supports writing into a separate destination", () => {
		const base = translation(5, -3, 2);
		const angle = Math.PI / 5;
		const dst = new Array<number>(16);
		const result = yRotate(base, angle, dst);
		const expected = multiply(translation(5, -3, 2), yRotation(angle));

		expect(result).toBe(dst);
		expect(formatMatrix(result)).toEqual(formatMatrix(expected));
		expect(formatMatrix(base)).toEqual(formatMatrix(translation(5, -3, 2)));
	});
});
