import { describe, expect, it } from "vitest";
import { multiply } from "./multiply";
import { translation } from "./translation";
import { zRotate } from "./zRotate";
import { zRotation } from "./zRotation";
import { formatMatrix } from "./testUtils";

describe("zRotate", () => {
	it("applies a rotation matrix around the z axis", () => {
		const base = translation(5, -3, 2);
		const original = base.slice();
		const angle = Math.PI / 7;

		const result = zRotate(base, angle);
		const expected = multiply(original, zRotation(angle));

		expect(result).toBe(base);
		expect(formatMatrix(result)).toEqual(formatMatrix(expected));
	});

	it("supports writing into a separate destination", () => {
		const base = translation(5, -3, 2);
		const angle = Math.PI / 7;
		const dst = new Array<number>(16);
		const result = zRotate(base, angle, dst);
		const expected = multiply(translation(5, -3, 2), zRotation(angle));

		expect(result).toBe(dst);
		expect(formatMatrix(result)).toEqual(formatMatrix(expected));
		expect(formatMatrix(base)).toEqual(formatMatrix(translation(5, -3, 2)));
	});
});
