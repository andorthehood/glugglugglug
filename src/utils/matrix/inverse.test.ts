import { describe, expect, it } from "vitest";
import { inverse } from "./inverse";
import { multiply } from "./multiply";
import { scaling } from "./scaling";
import { translation } from "./translation";
import { yRotation } from "./yRotation";
import { formatMatrix } from "./testUtils";

describe("inverse", () => {
	it("inverts affine matrices", () => {
		const matrix = multiply(
			translation(4, -2, 7),
			multiply(yRotation(Math.PI / 6), scaling(2, 0.5, 3)),
		);
		const inv = inverse(matrix);
		const identity = multiply(matrix, inv, new Array<number>(16));

		expect(formatMatrix(matrix)).toMatchSnapshot();
		expect(formatMatrix(inv)).toMatchSnapshot();
		expect(formatMatrix(identity)).toMatchSnapshot();
	});
});
