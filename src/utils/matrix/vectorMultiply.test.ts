import { describe, expect, it } from "vitest";
import { vectorMultiply } from "./vectorMultiply";
import { translation } from "./translation";
import { formatVector } from "./testUtils";

describe("vectorMultiply", () => {
	it("multiplies a vector by a matrix", () => {
		const vec = [1, 2, 3, 1];
		const mat = translation(4, -5, 6);

		expect(formatVector(vectorMultiply(vec, mat))).toMatchSnapshot();
	});
});
