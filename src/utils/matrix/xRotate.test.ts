import { describe, expect, it } from "vitest";
import { multiply } from "./multiply";
import { translation } from "./translation";
import { xRotate } from "./xRotate";
import { xRotation } from "./xRotation";
import { formatMatrix } from "./testUtils";

describe("xRotate", () => {
	it("applies a rotation matrix around the x axis", () => {
		const base = translation(5, -3, 2);
		const angle = Math.PI / 6;

		const result = xRotate(base, angle);
		const expected = multiply(base, xRotation(angle));

		expect(formatMatrix(result)).toEqual(formatMatrix(expected));
	});
});
