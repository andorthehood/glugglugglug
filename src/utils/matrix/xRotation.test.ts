import { describe, expect, it } from "vitest";
import { xRotation } from "./xRotation";
import { formatMatrix } from "./testUtils";

describe("xRotation", () => {
	it("creates a rotation matrix around the x axis", () => {
		const angle = Math.PI / 4;

		expect(formatMatrix(xRotation(angle))).toMatchSnapshot();
	});
});
