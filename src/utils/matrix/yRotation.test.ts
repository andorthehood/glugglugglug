import { describe, expect, it } from "vitest";
import { yRotation } from "./yRotation";
import { formatMatrix } from "./testUtils";

describe("yRotation", () => {
	it("creates a rotation matrix around the y axis", () => {
		const angle = Math.PI / 4;

		expect(formatMatrix(yRotation(angle))).toMatchSnapshot();
	});
});
