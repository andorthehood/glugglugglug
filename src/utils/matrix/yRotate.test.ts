import { describe, expect, it } from "vitest";
import { multiply } from "./multiply";
import { translation } from "./translation";
import { yRotate } from "./yRotate";
import { yRotation } from "./yRotation";
import { formatMatrix } from "./testUtils";

describe("yRotate", () => {
	it("applies a rotation matrix around the y axis", () => {
		const base = translation(5, -3, 2);
		const angle = Math.PI / 5;

		const result = yRotate(base, angle);
		const expected = multiply(base, yRotation(angle));

		expect(formatMatrix(result)).toEqual(formatMatrix(expected));
	});
});
