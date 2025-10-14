import { describe, expect, it } from "vitest";
import { multiply } from "./multiply";
import { translation } from "./translation";
import { zRotate } from "./zRotate";
import { zRotation } from "./zRotation";
import { formatMatrix } from "./testUtils";

describe("zRotate", () => {
	it("applies a rotation matrix around the z axis", () => {
		const base = translation(5, -3, 2);
		const angle = Math.PI / 7;

		const result = zRotate(base, angle);
		const expected = multiply(base, zRotation(angle));

		expect(formatMatrix(result)).toEqual(formatMatrix(expected));
	});
});
